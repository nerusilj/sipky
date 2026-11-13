use reqwest::{blocking::Client, redirect::Policy, Method, Url};
use serde::Deserialize;
use std::time::Duration;

#[derive(Deserialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum BoardCommand {
    Start,
    Stop,
    Reset,
}

impl BoardCommand {
    fn request(self, address: &str) -> Result<(Method, Url), String> {
        let (method, path) = match self {
            Self::Start => (Method::PUT, "/api/detection/start"),
            Self::Stop => (Method::PUT, "/api/detection/stop"),
            Self::Reset => (Method::POST, "/api/reset"),
        };
        let address = address.trim();
        let (host, port) = address.split_once(':').unwrap_or((address, "3180"));
        let invalid = || "Neplatná adresa terče.".to_string();
        if host.is_empty() || !host.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'.' || c == b'-') {
            return Err(invalid());
        }
        let port = port.parse::<u16>().ok().filter(|port| *port > 0).ok_or_else(invalid)?;
        let url = Url::parse(&format!("http://{host}:{port}{path}")).map_err(|_| invalid())?;
        Ok((method, url))
    }
}

#[tauri::command]
pub(crate) async fn send_board_command(address: String, action: BoardCommand) -> Result<(), String> {
    let (method, url) = action.request(&address)?;
    tauri::async_runtime::spawn_blocking(move || {
        let client = Client::builder()
            .no_proxy()
            .redirect(Policy::none())
            .retry(reqwest::retry::never())
            .timeout(Duration::from_secs(5))
            .build()
            .map_err(|_| "Spojení s Autodarts se nepodařilo připravit.".to_string())?;
        let response = client.request(method, url).send()
            .map_err(|_| "Autodarts neodpověděl. Výsledek příkazu není potvrzený.".to_string())?;
        if !response.status().is_success() {
            return Err(format!("Autodarts příkaz odmítl (HTTP {}).", response.status().as_u16()));
        }
        Ok(())
    }).await.map_err(|_| "Příkaz Autodarts se nepodařilo zpracovat.".to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn commands_use_only_their_local_endpoints() {
        for (action, method, path) in [
            (BoardCommand::Start, Method::PUT, "/api/detection/start"),
            (BoardCommand::Stop, Method::PUT, "/api/detection/stop"),
            (BoardCommand::Reset, Method::POST, "/api/reset"),
        ] {
            let (actual_method, url) = action.request("board.local").unwrap();
            assert_eq!(actual_method, method);
            assert_eq!(url.as_str(), format!("http://board.local:3180{path}"));
        }
        let (_, url) = BoardCommand::Reset.request("127.0.0.1:3181").unwrap();
        assert_eq!(url.port(), Some(3181));
        for bad in ["", "http://host", "host/path", "a@host", "host:0", "host:70000", "host:3180?x"] {
            assert!(BoardCommand::Reset.request(bad).is_err(), "{bad}");
        }
    }
}
