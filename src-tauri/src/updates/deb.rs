use super::{client, fetch, release, stable_version, Asset, Release, COMPONENTS, RELEASES};
use reqwest::blocking::Client;
use semver::Version;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use std::fs::File;
use std::io::{self, Read};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::Duration;

#[derive(Deserialize)]
struct Components {
    zvuky: Component,
    hlasatel: Component,
}

#[derive(Deserialize)]
struct Component {
    version: String,
    release: String,
}

fn package_version(package: &str) -> Option<Version> {
    let output = Command::new("/usr/bin/dpkg-query")
        .args(["-W", "-f=${db:Status-Status}\t${Version}", package])
        .output()
        .ok()?;
    if !output.status.success() {
        return None;
    }
    stable_version(
        std::str::from_utf8(&output.stdout)
            .ok()?
            .strip_prefix("installed\t")?,
    )
}

pub(super) fn can_install(current: &Version) -> bool {
    option_env!("SIPKY_SPLIT_PACKAGE") == Some("1")
        && Path::new("/usr/bin/pkexec").is_file()
        && Path::new("/usr/bin/apt-get").is_file()
        && package_version("sipky").as_ref() == Some(current)
}

fn download(
    client: &Client,
    tag: &str,
    asset: &Asset,
    directory: &Path,
) -> Result<PathBuf, String> {
    let url = format!("{RELEASES}/download/{tag}/{}", asset.name);
    let response = fetch(client, &url, Duration::from_secs(600))?;
    let path = directory.join(&asset.name);
    let write_error = || format!("Soubor {} se nepodařilo uložit.", asset.name);
    let mut file = File::create_new(&path).map_err(|_| write_error())?;
    let size =
        io::copy(&mut response.take(asset.size + 1), &mut file).map_err(|_| write_error())?;
    drop(file);
    let mut hasher = Sha256::new();
    io::copy(
        &mut File::open(&path).map_err(|_| write_error())?,
        &mut hasher,
    )
    .map_err(|_| write_error())?;
    let digest = format!("sha256:{:x}", hasher.finalize());
    if size != asset.size
        || !asset
            .digest
            .as_ref()
            .is_some_and(|expected| expected.eq_ignore_ascii_case(&digest))
    {
        return Err(format!(
            "Kontrolní součet souboru {} nesouhlasí.",
            asset.name
        ));
    }
    Ok(path)
}

fn download_package(
    client: &Client,
    release: &Release,
    directory: &Path,
    name: &str,
    version: &Version,
    arch: &str,
) -> Result<PathBuf, String> {
    let file = format!("{name}_{version}_{arch}.deb");
    let asset = release
        .asset(&file)
        .ok_or_else(|| format!("Ve vydání chybí ověřitelný balíček {file}."))?;
    let path = download(client, &release.tag_name, asset, directory)?;
    let metadata = Command::new("/usr/bin/dpkg-deb")
        .arg("-f")
        .arg(&path)
        .args(["Package", "Version", "Architecture"])
        .output()
        .map_err(|_| "Nelze přečíst balíček DEB.")?;
    let fields = String::from_utf8_lossy(&metadata.stdout);
    if !metadata.status.success()
        || !fields.lines().eq([
            format!("Package: {name}"),
            format!("Version: {version}"),
            format!("Architecture: {arch}"),
        ]
        .iter()
        .map(String::as_str))
    {
        return Err(format!("Stažený balíček {file} má nesprávné údaje."));
    }
    Ok(path)
}

fn compatible(installed: Option<Version>, required: &Version) -> bool {
    installed.is_some_and(|version| version.major == required.major && &version >= required)
}

pub(super) fn install(current: &Version, target: &Version) -> Result<(), String> {
    let client = client()?;
    let (latest, version) = release(&client, "latest")?;
    if &version != target {
        return Err("Na GitHubu je jiné vydání. Zkontrolujte aktualizace znovu.".into());
    }
    let directory = tempfile::Builder::new()
        .prefix("sipky-update-")
        .tempdir()
        .map_err(|_| "Nelze vytvořit dočasnou složku pro aktualizaci.")?;
    let manifest = latest
        .asset(COMPONENTS)
        .filter(|asset| asset.size <= 16 * 1024)
        .ok_or("Ve vydání chybí seznam balíčků.")?;
    let manifest = download(&client, &latest.tag_name, manifest, directory.path())?;
    let components: Components =
        serde_json::from_reader(File::open(manifest).map_err(|_| "Seznam balíčků nelze otevřít.")?)
            .map_err(|_| "Seznam balíčků je neplatný.")?;
    let mut packages = vec![download_package(
        &client,
        &latest,
        directory.path(),
        "sipky",
        target,
        "amd64",
    )?];
    for (name, arch, component) in [
        ("sipky-zvuky", "all", components.zvuky),
        ("sipky-hlasatel", "amd64", components.hlasatel),
    ] {
        let required = stable_version(&component.version).ok_or("Verze doplňku je neplatná.")?;
        if compatible(package_version(name), &required) {
            continue;
        }
        let source = component
            .release
            .strip_prefix('v')
            .and_then(stable_version)
            .filter(|source| source <= target)
            .ok_or("Vydání doplňku je neplatné.")?;
        if component.release == latest.tag_name {
            packages.push(download_package(
                &client,
                &latest,
                directory.path(),
                name,
                &required,
                arch,
            )?);
        } else {
            let (original, _) = release(&client, &format!("tags/v{source}"))?;
            if original.tag_name != component.release {
                return Err("Vydání doplňku nesouhlasí.".into());
            }
            packages.push(download_package(
                &client,
                &original,
                directory.path(),
                name,
                &required,
                arch,
            )?);
        }
    }
    if !can_install(current) {
        return Err("Nainstalovaná verze se mezitím změnila. Restartujte Šipky.".into());
    }
    let output = Command::new("/usr/bin/pkexec")
        .args([
            "--disable-internal-agent",
            "/usr/bin/apt-get",
            "--no-remove",
            "--no-install-recommends",
            "-y",
            "install",
        ])
        .args(packages)
        .stdin(Stdio::null())
        .output()
        .map_err(|_| "Správce balíčků nelze spustit.")?;
    if output.status.code() == Some(126) {
        return Err("Potvrzení instalace bylo zrušeno.".into());
    }
    if !output.status.success() {
        return Err(
            "Instalace přes APT selhala. Zkuste aktualizaci znovu nebo použijte balíčky z GitHubu."
                .into(),
        );
    }
    if package_version("sipky").as_ref() != Some(target) {
        return Err("Po instalaci se nepodařilo ověřit novou verzi.".into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reuse_only_compatible_components() {
        let required = Version::new(1, 2, 0);
        assert!(compatible(Some(Version::new(1, 2, 0)), &required));
        assert!(compatible(Some(Version::new(1, 10, 0)), &required));
        assert!(!compatible(Some(Version::new(1, 1, 9)), &required));
        assert!(!compatible(Some(Version::new(2, 0, 0)), &required));
        assert!(!compatible(None, &required));
    }
}
