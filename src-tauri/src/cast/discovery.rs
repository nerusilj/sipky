use std::{
    collections::HashMap,
    net::{SocketAddr, SocketAddrV6},
    time::Duration,
};

use mdns_sd::{ResolvedService, ScopedIp, ServiceDaemon, ServiceEvent};
use serde::{Deserialize, Serialize};
use tokio::time::{timeout_at, Instant};

const CAST_SERVICE: &str = "_googlecast._tcp.local.";

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct Television {
    pub id: String,
    pub name: String,
}

#[derive(Clone)]
pub struct Device {
    pub television: Television,
    pub addresses: Vec<SocketAddr>,
    full_name: String,
}

pub async fn discover(preferred: Option<&str>) -> Result<HashMap<String, Device>, String> {
    let daemon = ServiceDaemon::new().map_err(|_| "Vyhledávání televizí se nepodařilo spustit.")?;
    let result = browse(&daemon, preferred).await;
    let _ = daemon.shutdown();
    result
}

async fn browse(
    daemon: &ServiceDaemon,
    preferred: Option<&str>,
) -> Result<HashMap<String, Device>, String> {
    let events = daemon
        .browse(CAST_SERVICE)
        .map_err(|_| "Vyhledávání televizí se nepodařilo spustit.")?;
    let deadline = Instant::now() + Duration::from_millis(2400);
    let mut devices = HashMap::new();
    while let Ok(event) = timeout_at(deadline, events.recv_async()).await {
        let event = event.map_err(|_| "Vyhledávání televizí bylo přerušeno.")?;
        match event {
            ServiceEvent::ServiceResolved(service) => {
                let Some(device) = to_device(&service) else {
                    continue;
                };
                let matched = preferred == Some(device.television.id.as_str());
                devices.insert(device.television.id.clone(), device);
                if matched {
                    break;
                }
            }
            ServiceEvent::ServiceRemoved(_, full_name) => {
                devices.retain(|_, device| !device.full_name.eq_ignore_ascii_case(&full_name));
            }
            _ => (),
        }
    }
    Ok(devices)
}

fn to_device(service: &ResolvedService) -> Option<Device> {
    let id = service.get_property_val_str("id")?.trim();
    let port = service.get_port();
    if id.is_empty() || id.len() > 64 || port == 0 {
        return None;
    }
    // Bit 0 označuje video výstup. Starší přijímače mohou schopnosti vynechat.
    if service
        .get_property_val_str("ca")
        .and_then(|value| value.parse::<u32>().ok())
        .is_some_and(|bits| bits & 1 == 0)
    {
        return None;
    }
    let name = service
        .get_property_val_str("fn")
        .filter(|name| !name.trim().is_empty())
        .unwrap_or_else(|| service.get_hostname())
        .chars()
        .take(96)
        .collect();
    let mut addresses: Vec<_> = service
        .get_addresses()
        .iter()
        .filter_map(|address| {
            let socket = match address {
                ScopedIp::V4(value) => SocketAddr::new((*value.addr()).into(), port),
                ScopedIp::V6(value) => {
                    SocketAddrV6::new(*value.addr(), port, 0, value.scope_id().index).into()
                }
                _ => return None,
            };
            let ip = socket.ip();
            (!ip.is_unspecified() && !ip.is_multicast() && !ip.is_loopback()).then_some(socket)
        })
        .collect();
    addresses.sort();
    addresses.dedup();
    (!addresses.is_empty()).then_some(Device {
        television: Television {
            id: id.to_ascii_lowercase(),
            name,
        },
        addresses,
        full_name: service.get_fullname().to_owned(),
    })
}
