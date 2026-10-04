use std::io::Write;
use std::path::PathBuf;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

const MAX_RECORDING_BATCH: usize = 16 * 1024 * 1024;

fn check_jsonl(jsonl: &str) -> Result<(), String> {
    for line in jsonl.lines() {
        serde_json::from_str::<serde_json::Value>(line)
            .map_err(|_| "Záznam obsahuje neplatný JSON.".to_string())?;
    }
    Ok(())
}

// Název relace je jen časové razítko RRRR-MM-DD_HH-MM-SS; webové rozhraní cestu neurčuje.
fn valid_session(name: &str) -> bool {
    name.len() == 19 && name.bytes().enumerate().all(|(i, c)| match i {
        4 | 7 | 13 | 16 => c == b'-',
        10 => c == b'_',
        _ => c.is_ascii_digit(),
    })
}

// Data aplikace jsou v Dokumenty/Sipky, aby šla snadno zálohovat a přenést.
fn data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base = app.path().document_dir().or_else(|_| app.path().app_data_dir())
        .map_err(|_| "Nelze najít složku pro data aplikace.".to_string())?;
    Ok(base.join("Sipky"))
}

fn recordings_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(data_dir(app)?.join("zaznamy"))
}

const PLAYERS_FILE: &str = "hraci.json";
const MAX_PLAYERS_FILE: usize = 1024 * 1024;

// Seznam hráčů musí být pole JSON; obsah položek hlídá webové rozhraní.
fn check_players(json: &str) -> Result<(), String> {
    if json.len() > MAX_PLAYERS_FILE {
        return Err("Seznam hráčů je příliš velký.".into());
    }
    match serde_json::from_str::<serde_json::Value>(json) {
        Ok(serde_json::Value::Array(_)) => Ok(()),
        _ => Err("Seznam hráčů není platný.".into()),
    }
}

// Zapíše celý soubor bezpečně: nejdřív dočasný soubor, potom přejmenování (výpadek nenechá půlku souboru).
fn write_atomic(path: &std::path::Path, content: &str) -> std::io::Result<()> {
    if let Some(dir) = path.parent() {
        std::fs::create_dir_all(dir)?;
    }
    let tmp = path.with_extension("json.tmp");
    let mut file = std::fs::File::create(&tmp)?;
    file.write_all(content.as_bytes())?;
    file.sync_all()?;
    drop(file);
    std::fs::rename(&tmp, path)
}

// Vrátí obsah Dokumenty/Sipky/hraci.json, nebo "[]", pokud soubor ještě neexistuje.
#[tauri::command]
async fn load_players(app: tauri::AppHandle) -> Result<String, String> {
    let path = data_dir(&app)?.join(PLAYERS_FILE);
    tauri::async_runtime::spawn_blocking(move || match std::fs::read_to_string(&path) {
        Ok(json) => { check_players(&json)?; Ok(json) }
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok("[]".into()),
        Err(_) => Err("Seznam hráčů nelze přečíst. Ověřte oprávnění.".into()),
    }).await.map_err(|_| "Načtení hráčů selhalo.".to_string())?
}

#[tauri::command]
async fn save_players(app: tauri::AppHandle, json: String) -> Result<(), String> {
    check_players(&json)?;
    let path = data_dir(&app)?.join(PLAYERS_FILE);
    tauri::async_runtime::spawn_blocking(move || write_atomic(&path, &json)
        .map_err(|_| "Seznam hráčů se nepodařilo uložit. Ověřte oprávnění a volné místo.".to_string()))
        .await.map_err(|_| "Uložení hráčů selhalo.".to_string())?
}

// Průběžný bezztrátový záznam: dávku řádků připojí na konec souboru relace a vrátí jeho cestu.
#[tauri::command]
async fn append_recording(app: tauri::AppHandle, session: String, lines: String) -> Result<String, String> {
    if !valid_session(&session) {
        return Err("Neplatný název záznamu.".into());
    }
    if lines.len() > MAX_RECORDING_BATCH {
        return Err("Dávka záznamu je příliš velká.".into());
    }
    check_jsonl(&lines)?;
    let path = recordings_dir(&app)?.join(format!("{session}.jsonl"));
    tauri::async_runtime::spawn_blocking(move || {
        if let Some(dir) = path.parent() {
            std::fs::create_dir_all(dir).map_err(|_| "Složku pro záznamy nelze vytvořit. Ověřte oprávnění.".to_string())?;
        }
        let mut file = std::fs::OpenOptions::new().create(true).append(true).open(&path)
            .map_err(|_| "Soubor záznamu nelze otevřít pro zápis. Ověřte oprávnění.".to_string())?;
        file.write_all(lines.as_bytes())
            .and_then(|_| file.sync_data())
            .map_err(|_| "Záznam se nepodařilo zapsat. Ověřte volné místo na disku.".to_string())?;
        Ok(path.display().to_string())
    }).await.map_err(|_| "Zápis záznamu selhal.".to_string())?
}

// Cesta pochází výhradně z nativního dialogu, nikoli z webového rozhraní.
#[tauri::command]
async fn save_session(app: tauri::AppHandle, jsonl: String) -> Result<bool, String> {
    if jsonl.len() > 64 * 1024 * 1024 {
        return Err("Záznam překračuje limit exportu 64 MiB.".into());
    }
    check_jsonl(&jsonl)?;
    tauri::async_runtime::spawn_blocking(move || {
        let selected = app.dialog().file()
            .set_title("Uložit záznam WebSocket zpráv")
            .set_file_name("sipky-zaznam.jsonl")
            .add_filter("Záznam JSONL", &["jsonl"])
            .blocking_save_file();
        let Some(selected) = selected else { return Ok(false); };
        let path = selected.into_path().map_err(|_| "Vybraná cesta není lokální soubor.".to_string())?;
        let mut file = std::fs::File::create(path)
            .map_err(|_| "Soubor nelze otevřít pro zápis. Ověřte oprávnění.".to_string())?;
        file.write_all(jsonl.as_bytes())
            .and_then(|_| file.sync_all())
            .map_err(|_| "Záznam se nepodařilo celý uložit. Ověřte volné místo na disku.".to_string())?;
        Ok(true)
    }).await.map_err(|_| "Dialog uložení selhal.".to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_name_is_only_a_timestamp() {
        assert!(valid_session("2026-10-04_18-30-05"));
        for bad in ["", "2026-10-04", "2026-10-04_18-30-5", "../../evil_00-00", "2026-10-04_18-30-05.jsonl", "2026-10-04T18-30-05", "2026-1a-04_18-30-05"] {
            assert!(!valid_session(bad), "{bad}");
        }
    }

    #[test]
    fn players_file_must_be_json_array() {
        assert!(check_players("[]").is_ok());
        assert!(check_players("[{\"id\":\"a\",\"name\":\"Jarda\"}]").is_ok());
        for bad in ["", "{}", "null", "\"x\"", "[", "42"] {
            assert!(check_players(bad).is_err(), "{bad}");
        }
    }

    #[test]
    fn atomic_write_replaces_file_and_leaves_no_tmp() {
        let dir = std::env::temp_dir().join(format!("sipky-test-{}", std::process::id()));
        let path = dir.join("hraci.json");
        write_atomic(&path, "[1]").unwrap();
        write_atomic(&path, "[2]").unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "[2]");
        assert!(!path.with_extension("json.tmp").exists());
        std::fs::remove_dir_all(&dir).unwrap();
    }

    #[test]
    fn jsonl_lines_must_be_json() {
        assert!(check_jsonl("{\"a\":1}\n{\"b\":2}\n").is_ok());
        assert!(check_jsonl("").is_ok());
        assert!(check_jsonl("{\"a\":1}\nnot json\n").is_err());
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![save_session, append_recording, load_players, save_players])
        .run(tauri::generate_context!())
        .expect("Aplikaci Šipky nelze spustit");
}
