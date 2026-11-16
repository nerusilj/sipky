mod channel;
mod discovery;
mod receiver_auth;
mod tls;

use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
    time::Duration,
};

use serde::Serialize;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::{
    io::{AsyncRead, AsyncWrite},
    sync::{oneshot, watch},
    time::{interval_at, timeout, Instant},
};

use channel::{Channel, NS_CONNECTION, NS_HEARTBEAT, NS_RECEIVER, NS_SCOREBOARD, PLATFORM};
use discovery::{Device, Television};

const VERSION: u32 = 1;
const MAX_SNAPSHOT: usize = 48 * 1024;
const ENDED: &str = "sipky-cast-ended";
const NO_ACK: &str = "Televize nepotvrdila zobrazení skóre.";

#[derive(Default)]
pub struct CastState {
    devices: Mutex<HashMap<String, Device>>,
    session: Mutex<Option<Session>>,
}

struct Session {
    attempt: String,
    scores: watch::Sender<Arc<str>>,
    stop: Option<oneshot::Sender<()>>,
    done: Option<oneshot::Receiver<()>>,
}

#[derive(Clone, Serialize)]
pub struct ConnectedTelevision {
    #[serde(flatten)]
    television: Television,
    certificate: String,
}

#[derive(Clone, Serialize)]
struct Ended<'a> {
    attempt: &'a str,
    error: Option<&'a str>,
}

#[tauri::command]
pub async fn cast_discover(
    state: State<'_, CastState>,
    preferred: Option<String>,
) -> Result<Vec<Television>, String> {
    let devices = discovery::discover(preferred.as_deref()).await?;
    let mut televisions: Vec<_> = devices
        .values()
        .map(|device| device.television.clone())
        .collect();
    televisions.sort_by(|left, right| {
        left.name
            .to_lowercase()
            .cmp(&right.name.to_lowercase())
            .then(left.id.cmp(&right.id))
    });
    *state.devices.lock().unwrap() = devices;
    Ok(televisions)
}

#[tauri::command]
pub async fn cast_connect(
    app: AppHandle,
    state: State<'_, CastState>,
    id: String,
    app_id: String,
    attempt: String,
    certificate: Option<String>,
    snapshot: String,
) -> Result<ConnectedTelevision, String> {
    if app_id.len() != 8 || !app_id.bytes().all(|c| c.is_ascii_hexdigit()) {
        return Err("Přenos na TV čeká na zveřejnění televizní obrazovky Šipek.".into());
    }
    let snapshot = validate_snapshot(snapshot)?;
    let device = state
        .devices
        .lock()
        .unwrap()
        .get(&id)
        .cloned()
        .ok_or("Televizi se nepodařilo najít.")?;
    let (stop, stopped) = oneshot::channel();
    let (finished, done) = oneshot::channel();
    let (ready, connected) = oneshot::channel();
    let (scores, updates) = watch::channel(snapshot);
    {
        let mut session = state.session.lock().unwrap();
        if session.is_some() {
            return Err("Nejprve ukončete aktuální připojení k TV.".into());
        }
        *session = Some(Session {
            attempt: attempt.clone(),
            scores,
            stop: Some(stop),
            done: Some(done),
        });
    }
    tauri::async_runtime::spawn(async move {
        let mut ready = Some(ready);
        let result = run(device, app_id, certificate, updates, stopped, &mut ready).await;
        {
            let state = app.state::<CastState>();
            let mut session = state.session.lock().unwrap();
            if session
                .as_ref()
                .is_some_and(|session| session.attempt == attempt)
            {
                *session = None;
            }
        }
        if let Some(ready) = ready {
            let _ = ready.send(Err(result
                .err()
                .unwrap_or_else(|| "Připojení bylo zrušeno.".into())));
        } else {
            let _ = app.emit(
                ENDED,
                Ended {
                    attempt: &attempt,
                    error: result.as_ref().err().map(String::as_str),
                },
            );
        }
        let _ = finished.send(());
    });
    connected
        .await
        .map_err(|_| "Připojení k TV bylo přerušeno.".to_string())?
}

#[tauri::command]
pub async fn cast_disconnect(state: State<'_, CastState>) -> Result<(), String> {
    let done = {
        let mut lock = state.session.lock().unwrap();
        let Some(session) = lock.as_mut() else {
            return Ok(());
        };
        if let Some(stop) = session.stop.take() {
            let _ = stop.send(());
        }
        session.done.take()
    };
    if let Some(done) = done {
        let _ = done.await;
    }
    Ok(())
}

#[tauri::command]
pub fn cast_publish(
    state: State<'_, CastState>,
    attempt: String,
    snapshot: String,
) -> Result<bool, String> {
    let snapshot = validate_snapshot(snapshot)?;
    let lock = state.session.lock().unwrap();
    let Some(session) = lock.as_ref().filter(|session| session.attempt == attempt) else {
        return Ok(false);
    };
    session.scores.send_if_modified(|current| {
        if *current == snapshot {
            return false;
        }
        *current = snapshot;
        true
    });
    Ok(true)
}

fn validate_snapshot(snapshot: String) -> Result<Arc<str>, String> {
    if snapshot.len() > MAX_SNAPSHOT
        || !serde_json::from_str::<Value>(&snapshot).is_ok_and(|value| value.is_object())
    {
        return Err("Stav hry pro Chromecast má neplatný formát nebo velikost.".into());
    }
    Ok(snapshot.into())
}

type Ready = oneshot::Sender<Result<ConnectedTelevision, String>>;

async fn run(
    device: Device,
    app_id: String,
    certificate: Option<String>,
    updates: watch::Receiver<Arc<str>>,
    mut stopped: oneshot::Receiver<()>,
    ready: &mut Option<Ready>,
) -> Result<(), String> {
    let mut last_error = String::from("Televize je nedostupná.");
    let mut authenticated = None;
    // Obvyklá IPv4 adresa má přednost, s rezervou pro další adresy z mDNS.
    for address in device.addresses.into_iter().take(4) {
        let attempt = tokio::select! {
            _ = &mut stopped => return Ok(()),
            attempt = timeout(Duration::from_secs(3), channel::authenticate(address)) => attempt,
        };
        match attempt {
            Ok(Ok(candidate))
                if certificate
                    .as_ref()
                    .is_some_and(|saved| saved != &candidate.1) =>
            {
                last_error =
                    "Identita uložené televize se změnila. Vyberte televizi znovu ze seznamu."
                        .into()
            }
            Ok(Ok(candidate)) => {
                authenticated = Some(candidate);
                break;
            }
            Ok(Err(error)) => last_error = error,
            Err(_) => (),
        }
    }
    let Some((mut channel, certificate)) = authenticated else {
        return Err(last_error);
    };
    let active = tokio::select! {
        _ = &mut stopped => return Ok(()),
        result = timeout(Duration::from_secs(13), launch(&mut channel, &app_id)) =>
            result.map_err(|_| "Televize včas neotevřela obrazovku Šipek.")??,
    };
    let television = ConnectedTelevision {
        television: device.television,
        certificate,
    };
    sync_scores(channel, active, updates, stopped, || {
        if let Some(ready) = ready.take() {
            let _ = ready.send(Ok(television.clone()));
        }
    })
    .await
}

struct ActiveApp {
    session: String,
    transport: String,
}

async fn launch<T: AsyncRead + AsyncWrite + Unpin>(
    channel: &mut Channel<T>,
    app_id: &str,
) -> Result<ActiveApp, String> {
    channel
        .send(
            PLATFORM,
            NS_CONNECTION,
            json!({"type": "CONNECT", "origin": {}}),
        )
        .await?;
    channel
        .send(
            PLATFORM,
            NS_RECEIVER,
            json!({"type": "LAUNCH", "appId": app_id, "requestId": 1, "language": "cs"}),
        )
        .await?;
    let mut heartbeat = interval_at(
        Instant::now() + Duration::from_secs(5),
        Duration::from_secs(5),
    );
    loop {
        let frame = tokio::select! {
            _ = heartbeat.tick() => {
                channel.send(PLATFORM, NS_HEARTBEAT, json!({"type": "PING"})).await?;
                continue;
            }
            frame = channel.receive() => frame?,
        };
        let Some(payload) = frame.payload() else {
            continue;
        };
        channel.reply_to_ping(&frame, &payload).await?;
        if frame.namespace != NS_RECEIVER
            || !channel.is_from(&frame, PLATFORM)
            || payload["requestId"] != 1
        {
            continue;
        }
        match payload["type"].as_str() {
            Some("RECEIVER_STATUS") => {
                let app = payload["status"]["applications"]
                    .as_array()
                    .into_iter()
                    .flatten()
                    .find(|app| app["appId"].as_str() == Some(app_id))
                    .ok_or("Televize neotevřela obrazovku Šipek.")?;
                let session = app["sessionId"]
                    .as_str()
                    .filter(|id| !id.is_empty())
                    .ok_or("Televize neposkytla identifikátor relace.")?;
                let transport = app["transportId"]
                    .as_str()
                    .filter(|id| !id.is_empty())
                    .ok_or("Televize neposkytla kanál aplikace.")?;
                channel
                    .send(
                        transport,
                        NS_CONNECTION,
                        json!({"type": "CONNECT", "origin": {}}),
                    )
                    .await?;
                return Ok(ActiveApp {
                    session: session.to_owned(),
                    transport: transport.to_owned(),
                });
            }
            Some("LAUNCH_ERROR" | "INVALID_REQUEST") => return Err(
                "Televize nemohla spustit Šipky. Ověřte dostupnost receiveru pro toto zařízení."
                    .into(),
            ),
            _ => (),
        }
    }
}

async fn sync_scores<T: AsyncRead + AsyncWrite + Unpin>(
    mut channel: Channel<T>,
    app: ActiveApp,
    mut updates: watch::Receiver<Arc<str>>,
    mut stopped: oneshot::Receiver<()>,
    mut on_ready: impl FnMut(),
) -> Result<(), String> {
    let mut sequence = 1;
    let mut acknowledged = 0;
    let mut current = updates.borrow_and_update().clone();
    let mut pending_since = Some(Instant::now());
    let mut last_pong = Instant::now();
    let mut heartbeat = interval_at(
        Instant::now() + Duration::from_secs(5),
        Duration::from_secs(5),
    );
    let mut retry = interval_at(
        Instant::now() + Duration::from_millis(650),
        Duration::from_millis(650),
    );
    send_score(&mut channel, &app, sequence, &current).await?;
    loop {
        tokio::select! {
            _ = &mut stopped => {
                let _ = channel.send(PLATFORM, NS_RECEIVER,
                    json!({"type": "STOP", "requestId": 2, "sessionId": app.session})).await;
                return Ok(());
            }
            changed = updates.changed() => {
                if changed.is_err() { return Ok(()); }
                current = updates.borrow_and_update().clone();
                sequence += 1;
                pending_since.get_or_insert_with(Instant::now);
                send_score(&mut channel, &app, sequence, &current).await?;
            }
            _ = retry.tick(), if pending_since.is_some() => {
                if pending_since.is_some_and(|since| since.elapsed() >= Duration::from_secs(9)) {
                    let _ = channel.send(PLATFORM, NS_RECEIVER,
                        json!({"type": "STOP", "requestId": 2, "sessionId": app.session})).await;
                    return Err(NO_ACK.into());
                }
                send_score(&mut channel, &app, sequence, &current).await?;
            }
            _ = heartbeat.tick() => {
                if last_pong.elapsed() >= Duration::from_secs(15) { return Err("Televize přestala odpovídat.".into()); }
                channel.send(PLATFORM, NS_HEARTBEAT, json!({"type": "PING"})).await?;
            }
            frame = channel.receive() => {
                let frame = frame?;
                let Some(payload) = frame.payload() else { continue; };
                channel.reply_to_ping(&frame, &payload).await?;
                if channel.is_from(&frame, PLATFORM) {
                    if frame.namespace == NS_HEARTBEAT && payload["type"] == "PONG" { last_pong = Instant::now(); }
                    if frame.namespace == NS_RECEIVER && payload["type"] == "RECEIVER_STATUS"
                        && payload["status"].is_object()
                        && !payload["status"]["applications"].as_array().into_iter().flatten()
                            .any(|entry| entry["sessionId"].as_str() == Some(app.session.as_str())) {
                        return Err("Televize zavřela Šipky.".into());
                    }
                }
                if channel.is_from(&frame, &app.transport) {
                    if frame.namespace == NS_CONNECTION && payload["type"] == "CLOSE" { return Err("Televize zavřela Šipky.".into()); }
                    if frame.namespace == NS_SCOREBOARD && payload["v"] == VERSION && payload["type"] == "received" {
                        if let Some(received) = payload["seq"].as_u64().filter(|seq| *seq > acknowledged && *seq <= sequence) {
                            if acknowledged == 0 { on_ready(); }
                            acknowledged = received;
                            pending_since = (acknowledged < sequence).then(Instant::now);
                        }
                    }
                }
            }
        }
    }
}

async fn send_score<T: AsyncRead + AsyncWrite + Unpin>(
    channel: &mut Channel<T>,
    app: &ActiveApp,
    sequence: u64,
    snapshot: &str,
) -> Result<(), String> {
    channel
        .send_text(
            &app.transport,
            NS_SCOREBOARD,
            format!(r#"{{"v":{VERSION},"type":"state","seq":{sequence},"snapshot":{snapshot}}}"#),
        )
        .await
}

#[cfg(test)]
mod tests {
    use super::*;
    use tokio::io::duplex;

    #[tokio::test]
    async fn opens_receiver_sends_live_scores_and_stops_selected_session() {
        timeout(Duration::from_secs(3), async {
            let (sender_io, receiver_io) = duplex(4096);
            let (scores, updates) = watch::channel(Arc::from(r#"{"score":501}"#));
            let (stop, stopped) = oneshot::channel();
            let (ready, mut connected) = oneshot::channel();
            let sender = tokio::spawn(async move {
                let mut channel = Channel::new(sender_io, "sender-test".into());
                let app = launch(&mut channel, "1234ABCD").await.unwrap();
                let mut ready = Some(ready);
                sync_scores(channel, app, updates, stopped, || {
                    if let Some(ready) = ready.take() { ready.send(()).unwrap(); }
                }).await.unwrap();
            });

            let mut receiver = Channel::new(receiver_io, PLATFORM.into());
            assert_eq!(receiver.receive().await.unwrap().payload().unwrap()["type"], "CONNECT");
            let launch_request = receiver.receive().await.unwrap().payload().unwrap();
            assert_eq!(launch_request["type"], "LAUNCH");
            assert_eq!(launch_request["appId"], "1234ABCD");
            receiver.send("sender-test", NS_RECEIVER, json!({
                "type": "RECEIVER_STATUS", "requestId": 1,
                "status": {"applications": [{"appId": "1234ABCD", "sessionId": "match-tv", "transportId": "web-test"}]}
            })).await.unwrap();
            assert_eq!(receiver.receive().await.unwrap().destination, "web-test");
            let initial = receiver.receive().await.unwrap();
            assert_eq!(initial.namespace, NS_SCOREBOARD);
            assert_eq!(initial.destination, "web-test");
            assert_eq!(initial.payload().unwrap(), json!({"v": 1, "type": "state", "seq": 1, "snapshot": {"score": 501}}));

            // A changed score goes out before the receiver acknowledges the previous one.
            scores.send_replace(Arc::from(r#"{"score":481}"#));
            scores.send_replace(Arc::from(r#"{"score":441}"#));
            let live = receiver.receive().await.unwrap().payload().unwrap();
            assert_eq!(live, json!({"v": 1, "type": "state", "seq": 2, "snapshot": {"score": 441}}));
            assert!(connected.try_recv().is_err());

            receiver.sender = "web-test".into();
            receiver.send("sender-test", NS_SCOREBOARD, json!({"v": 1, "type": "received", "seq": 2})).await.unwrap();
            connected.await.unwrap();
            stop.send(()).unwrap();
            let stopped = receiver.receive().await.unwrap();
            assert_eq!(stopped.destination, PLATFORM);
            assert_eq!(stopped.payload().unwrap()["sessionId"], "match-tv");
            sender.await.unwrap();
        }).await.unwrap();
    }

    #[test]
    fn cast_snapshot_must_be_a_bounded_json_object() {
        assert!(validate_snapshot(r#"{"venue":"Šipky"}"#.to_owned()).is_ok());
        assert!(validate_snapshot("[]".to_owned()).is_err());
        assert!(validate_snapshot("{".to_owned()).is_err());
        assert!(validate_snapshot(" ".repeat(MAX_SNAPSHOT + 1)).is_err());
    }
}
