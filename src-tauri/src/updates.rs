use reqwest::blocking::{Client, Response};
use semver::Version;
use serde::{Deserialize, Serialize};
use std::io::Read;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Duration;

#[cfg(all(target_os = "linux", target_arch = "x86_64"))]
mod deb;

const API: &str = "https://api.github.com/repos/nerusilj/sipky/releases";
const RELEASES: &str = "https://github.com/nerusilj/sipky/releases";
const COMPONENTS: &str = "linux-components.json";

#[derive(Deserialize)]
struct Release {
    tag_name: String,
    draft: bool,
    prerelease: bool,
    assets: Vec<Asset>,
}

#[derive(Deserialize)]
struct Asset {
    name: String,
    size: u64,
    digest: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateStatus {
    installed: String,
    latest: String,
    update_available: bool,
    can_install: bool,
    release_url: String,
}

#[derive(Default)]
pub struct UpdateInstall(Arc<AtomicBool>);

fn stable_version(text: &str) -> Option<Version> {
    Version::parse(text)
        .ok()
        .filter(|version| version.pre.is_empty() && version.build.is_empty())
}

fn client() -> Result<Client, String> {
    Client::builder()
        .user_agent("Sipky-update")
        .https_only(true)
        .connect_timeout(Duration::from_secs(10))
        .build()
        .map_err(|_| "Připojení ke GitHubu nelze připravit.".into())
}

fn fetch(client: &Client, url: &str, timeout: Duration) -> Result<Response, String> {
    client
        .get(url)
        .timeout(timeout)
        .send()
        .and_then(Response::error_for_status)
        .map_err(|_| "GitHub se nepodařilo načíst. Zkuste to později.".into())
}

fn release(client: &Client, endpoint: &str) -> Result<(Release, Version), String> {
    let response = fetch(
        client,
        &format!("{API}/{endpoint}"),
        Duration::from_secs(15),
    )?;
    let release: Release = serde_json::from_reader(response.take(2 * 1024 * 1024))
        .map_err(|_| "GitHub vrátil neplatné údaje o vydání.".to_string())?;
    let version = stable_version(
        release
            .tag_name
            .strip_prefix('v')
            .unwrap_or(&release.tag_name),
    )
    .filter(|_| !release.draft && !release.prerelease)
    .ok_or("Vydání na GitHubu nemá platnou verzi.")?;
    Ok((release, version))
}

impl Release {
    fn asset(&self, name: &str) -> Option<&Asset> {
        self.assets.iter().find(|asset| {
            asset.name == name
                && asset.size > 0
                && asset.size <= 1024 * 1024 * 1024
                && asset
                    .digest
                    .as_deref()
                    .and_then(|digest| digest.strip_prefix("sha256:"))
                    .is_some_and(|hash| {
                        hash.len() == 64 && hash.bytes().all(|byte| byte.is_ascii_hexdigit())
                    })
        })
    }
}

fn can_install(version: &Version) -> bool {
    #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
    {
        deb::can_install(version)
    }
    #[cfg(not(all(target_os = "linux", target_arch = "x86_64")))]
    {
        let _ = version;
        false
    }
}

#[tauri::command]
pub async fn check_app_update(app: tauri::AppHandle) -> Result<UpdateStatus, String> {
    let installed = app.package_info().version.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let (release, latest) = release(&client()?, "latest")?;
        let update_available = latest > installed;
        Ok(UpdateStatus {
            can_install: update_available
                && release.asset(COMPONENTS).is_some()
                && release
                    .asset(&format!("sipky_{latest}_amd64.deb"))
                    .is_some()
                && can_install(&installed),
            release_url: format!("{RELEASES}/tag/{}", release.tag_name),
            installed: installed.to_string(),
            latest: latest.to_string(),
            update_available,
        })
    })
    .await
    .map_err(|_| "Kontrola aktualizací selhala.".to_string())?
}

#[tauri::command]
pub async fn install_app_update(
    app: tauri::AppHandle,
    state: tauri::State<'_, UpdateInstall>,
    version: String,
) -> Result<(), String> {
    let target = stable_version(&version).ok_or("Neplatná verze aktualizace.")?;
    let installed = app.package_info().version.clone();
    if target <= installed || !can_install(&installed) {
        return Err("Aktualizaci nelze nainstalovat z této verze aplikace.".into());
    }
    let busy = state.0.clone();
    tauri::async_runtime::spawn_blocking(move || {
        if busy.swap(true, Ordering::AcqRel) {
            return Err("Aktualizace už probíhá.".into());
        }
        #[cfg(all(target_os = "linux", target_arch = "x86_64"))]
        let result = deb::install(&installed, &target);
        #[cfg(not(all(target_os = "linux", target_arch = "x86_64")))]
        let result = Err("Instalace je dostupná v linuxové verzi DEB.".into());
        busy.store(false, Ordering::Release);
        result
    })
    .await
    .map_err(|_| "Instalace aktualizace selhala.".to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn only_stable_versions_and_verified_assets() {
        assert!(stable_version("0.1.10") > stable_version("0.1.9"));
        for invalid in ["0.1.8-rc.1", "0.1.8+test", "0.1", "../0.1.8"] {
            assert!(stable_version(invalid).is_none());
        }
        let release = Release {
            tag_name: "v0.1.8".into(),
            draft: false,
            prerelease: false,
            assets: vec![
                Asset {
                    name: "valid.deb".into(),
                    size: 100,
                    digest: Some(format!("sha256:{}", "a".repeat(64))),
                },
                Asset {
                    name: "unverified.deb".into(),
                    size: 100,
                    digest: None,
                },
                Asset {
                    name: "bad.deb".into(),
                    size: 100,
                    digest: Some(format!("sha256:{}", "z".repeat(64))),
                },
            ],
        };
        assert!(release.asset("valid.deb").is_some());
        assert!(release.asset("unverified.deb").is_none());
        assert!(release.asset("bad.deb").is_none());
        assert!(release.asset("missing.deb").is_none());
    }
}
