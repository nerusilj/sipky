use std::io::Write;
use tauri_plugin_dialog::DialogExt;

// Cesta pochází výhradně z nativního dialogu, nikoli z webového rozhraní.
#[tauri::command]
async fn save_session(app: tauri::AppHandle, jsonl: String) -> Result<bool, String> {
    if jsonl.len() > 64 * 1024 * 1024 {
        return Err("Záznam překračuje limit exportu 64 MiB.".into());
    }
    for line in jsonl.lines() {
        serde_json::from_str::<serde_json::Value>(line)
            .map_err(|_| "Záznam obsahuje neplatný JSON.".to_string())?;
    }
    tauri::async_runtime::spawn_blocking(move || {
        let selected = app.dialog().file()
            .set_title("Uložit záznam WebSocket zpráv")
            .set_file_name("holice-sipky-zaznam.jsonl")
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![save_session])
        .run(tauri::generate_context!())
        .expect("Aplikaci HOLICE-Šipky nelze spustit");
}
