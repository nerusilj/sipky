use std::path::{Path, PathBuf};

fn sound_path(url: &str) -> Result<PathBuf, String> {
    let parts: Vec<_> = url.split('/').collect();
    let valid = match parts.as_slice() {
        ["", "sounds", "game", file] => matches!(*file, "bust.wav" | "miss.wav" | "applause.wav"),
        ["", "sounds", "cs", voice, kind, file] if matches!(*voice, "eliska" | "martin") => {
            match *kind {
                "fun" => matches!(*file, "ambrozovina.wav" | "gameon.wav"),
                "score" => file.strip_suffix(".wav").and_then(|n| n.parse::<u16>().ok())
                    .is_some_and(|n| n <= 180 && *file == format!("{n}.wav")),
                _ => false,
            }
        }
        _ => false,
    };
    if !valid { return Err("Neplatná nahrávka.".into()); }
    Ok(PathBuf::from(url.trim_start_matches('/')))
}

fn read_sound(base: &Path, url: &str) -> Result<Vec<u8>, String> {
    let relative = sound_path(url)?;
    let root = base.canonicalize().map_err(|_| "Složka zvuků chybí.")?;
    let path = root.join(relative).canonicalize().map_err(|_| "Nahrávka chybí.")?;
    if !path.starts_with(&root) { return Err("Neplatná cesta nahrávky.".into()); }
    let size = std::fs::metadata(&path).map_err(|_| "Nahrávku nelze přečíst.")?.len();
    if !(44..=2_097_152).contains(&size) { return Err("Neplatná délka nahrávky.".into()); }
    let bytes = std::fs::read(path).map_err(|_| "Nahrávku nelze přečíst.")?;
    if bytes.len() < 44 || &bytes[..4] != b"RIFF" || &bytes[8..12] != b"WAVE" {
        return Err("Neplatný WAV soubor.".into());
    }
    Ok(bytes)
}

#[tauri::command]
pub async fn static_audio(app: tauri::AppHandle, url: String) -> Result<tauri::ipc::Response, String> {
    sound_path(&url)?;
    let base = super::resource_base(&app)?;
    tauri::async_runtime::spawn_blocking(move || read_sound(&base, &url).map(tauri::ipc::Response::new))
        .await.map_err(|_| "Načtení nahrávky selhalo.".to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn only_known_recordings() {
        for voice in ["eliska", "martin"] {
            for n in 0..=180 { assert!(sound_path(&format!("/sounds/cs/{voice}/score/{n}.wav")).is_ok()); }
            assert!(sound_path(&format!("/sounds/cs/{voice}/fun/gameon.wav")).is_ok());
        }
        for url in ["/sounds/game/bust.wav", "/sounds/game/miss.wav", "/sounds/game/applause.wav"] {
            assert!(sound_path(url).is_ok());
        }
        for url in ["/sounds/cs/eliska/fun/bust.wav", "/sounds/cs/martin/fun/bust.wav", "/sounds/../secret.wav", "/sounds/cs/eliska/score/181.wav", "/sounds/cs/eliska/score/01.wav", "/sounds/game/../../secret.wav", "/sounds/cs/other/score/1.wav", "C:/secret.wav"] {
            assert!(sound_path(url).is_err());
        }
    }

    #[test]
    fn actual_bundled_recordings_are_readable() {
        let base = Path::new(env!("CARGO_MANIFEST_DIR")).join("../public");
        for voice in ["eliska", "martin"] {
            for n in 0..=180 {
                assert!(read_sound(&base, &format!("/sounds/cs/{voice}/score/{n}.wav")).is_ok());
            }
            for phrase in ["ambrozovina", "gameon"] {
                assert!(read_sound(&base, &format!("/sounds/cs/{voice}/fun/{phrase}.wav")).is_ok());
            }
        }
        for effect in ["bust", "miss", "applause"] {
            assert!(read_sound(&base, &format!("/sounds/game/{effect}.wav")).is_ok());
        }
    }
}
