use std::{io, net::SocketAddr, sync::Arc, time::Duration};

use futures_util::{SinkExt, StreamExt};
use prost::Message;
use rustls::{pki_types::ServerName, ClientConfig};
use serde_json::{json, Value};
use tokio::{
    io::{AsyncRead, AsyncWrite},
    net::TcpStream,
    time::timeout,
};
use tokio_rustls::{client::TlsStream, TlsConnector};
use tokio_util::{
    bytes::Bytes,
    codec::{Framed, LengthDelimitedCodec},
};
use uuid::Uuid;

use super::{receiver_auth, tls::SelfSignedCertificateVerifier};

pub const PLATFORM: &str = "receiver-0";
pub const NS_CONNECTION: &str = "urn:x-cast:com.google.cast.tp.connection";
pub const NS_HEARTBEAT: &str = "urn:x-cast:com.google.cast.tp.heartbeat";
pub const NS_RECEIVER: &str = "urn:x-cast:com.google.cast.receiver";
pub const NS_SCOREBOARD: &str = "urn:x-cast:cz.sipky.scoreboard.v1";
const NS_AUTH: &str = "urn:x-cast:com.google.cast.tp.deviceauth";

#[derive(Message)]
pub struct CastFrame {
    #[prost(int32, required, tag = "1")]
    protocol_version: i32,
    #[prost(string, required, tag = "2")]
    pub source: String,
    #[prost(string, required, tag = "3")]
    pub destination: String,
    #[prost(string, required, tag = "4")]
    pub namespace: String,
    #[prost(int32, required, tag = "5")]
    payload_type: i32,
    #[prost(string, optional, tag = "6")]
    text: Option<String>,
    #[prost(bytes = "vec", optional, tag = "7")]
    binary: Option<Vec<u8>>,
}

impl CastFrame {
    pub fn payload(&self) -> Option<Value> {
        (self.payload_type == 0).then_some(())?;
        serde_json::from_str(self.text.as_deref()?).ok()
    }
}

pub struct Channel<T> {
    transport: Framed<T, LengthDelimitedCodec>,
    pub sender: String,
}

impl<T: AsyncRead + AsyncWrite + Unpin> Channel<T> {
    pub fn new(io: T, sender: String) -> Self {
        let transport = LengthDelimitedCodec::builder()
            .max_frame_length(512 * 1024)
            .new_framed(io);
        Self { transport, sender }
    }

    pub async fn receive(&mut self) -> Result<CastFrame, String> {
        let bytes = self
            .transport
            .next()
            .await
            .ok_or("Televize ukončila spojení.")?
            .map_err(|_| "Spojení s televizí bylo přerušeno.")?;
        CastFrame::decode(bytes).map_err(|_| "Televize poslala neplatnou zprávu.".into())
    }

    pub async fn send(
        &mut self,
        destination: &str,
        namespace: &str,
        json: Value,
    ) -> Result<(), String> {
        self.send_text(destination, namespace, json.to_string())
            .await
    }

    pub async fn send_text(
        &mut self,
        destination: &str,
        namespace: &str,
        text: String,
    ) -> Result<(), String> {
        self.write(destination, namespace, Some(text), None).await
    }

    async fn write(
        &mut self,
        destination: &str,
        namespace: &str,
        text: Option<String>,
        binary: Option<Vec<u8>>,
    ) -> Result<(), String> {
        let frame = CastFrame {
            protocol_version: 0,
            source: self.sender.clone(),
            destination: destination.to_owned(),
            namespace: namespace.to_owned(),
            payload_type: i32::from(binary.is_some()),
            text,
            binary,
        };
        timeout(
            Duration::from_secs(2),
            self.transport.send(Bytes::from(frame.encode_to_vec())),
        )
        .await
        .map_err(|_| "Televize nereaguje.")?
        .map_err(|_| "Zprávu se nepodařilo odeslat do televize.".into())
    }

    pub fn is_from(&self, frame: &CastFrame, source: &str) -> bool {
        frame.source == source && (frame.destination == self.sender || frame.destination == "*")
    }

    pub async fn reply_to_ping(
        &mut self,
        frame: &CastFrame,
        payload: &Value,
    ) -> Result<(), String> {
        if frame.namespace == NS_HEARTBEAT
            && self.is_from(frame, PLATFORM)
            && payload["type"] == "PING"
        {
            self.send(PLATFORM, NS_HEARTBEAT, json!({"type": "PONG"}))
                .await?;
        }
        Ok(())
    }
}

pub async fn authenticate(
    address: SocketAddr,
) -> Result<(Channel<TlsStream<TcpStream>>, String), String> {
    let tcp = TcpStream::connect(address)
        .await
        .map_err(|error| match error.kind() {
            io::ErrorKind::PermissionDenied => "Systém nepovolil spojení s televizí.",
            _ => "Televize je nedostupná.",
        })?;
    tcp.set_nodelay(true)
        .map_err(|_| "Spojení s televizí se nepodařilo nastavit.")?;
    let config =
        ClientConfig::builder_with_provider(Arc::new(rustls::crypto::ring::default_provider()))
            .with_safe_default_protocol_versions()
            .map_err(|_| "Zabezpečené spojení se nepodařilo připravit.")?
            .dangerous()
            .with_custom_certificate_verifier(Arc::new(SelfSignedCertificateVerifier::new()))
            .with_no_client_auth();
    // Cast potvrzuje krátkodobý TLS certifikát vlastním podepsaným ověřením níže.
    let stream = TlsConnector::from(Arc::new(config))
        .connect(ServerName::IpAddress(address.ip().into()), tcp)
        .await
        .map_err(|_| "Zabezpečené spojení s televizí se nepodařilo navázat.")?;
    let peer = stream
        .get_ref()
        .1
        .peer_certificates()
        .and_then(|certs| certs.first())
        .ok_or("Televize neposkytla certifikát.")?
        .as_ref()
        .to_vec();
    let mut channel = Channel::new(stream, "sender-0".into());
    let challenge = receiver_auth::create_challenge();
    channel
        .write(PLATFORM, NS_AUTH, None, Some(challenge.payload))
        .await?;
    loop {
        let response = channel.receive().await?;
        if response.namespace == NS_AUTH
            && response.source == PLATFORM
            && response.destination == channel.sender
        {
            let payload = response
                .binary
                .filter(|_| response.payload_type == 1)
                .ok_or("Televize neodpověděla na ověření.")?;
            let identity = receiver_auth::verify_challenge_reply(&payload, &challenge.nonce, &peer)
                .map_err(|error| {
                    eprintln!("Chromecast: {error}");
                    "Kryptografickou identitu Chromecastu se nepodařilo ověřit."
                })?;
            if identity.is_audio_only() {
                return Err("Toto zařízení podporuje jen zvuk.".into());
            }
            channel.sender = format!("sender-{}", Uuid::new_v4().simple());
            return Ok((
                channel,
                identity
                    .certificate_sha256()
                    .iter()
                    .map(|byte| format!("{byte:02x}"))
                    .collect(),
            ));
        }
        if let Some(payload) = response.payload() {
            channel.reply_to_ping(&response, &payload).await?;
        }
    }
}
