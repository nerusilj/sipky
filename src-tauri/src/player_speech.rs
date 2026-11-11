use std::io::{BufRead, BufReader, Write};
use std::path::PathBuf;
use std::process::{Child, ChildStdin, Command, Stdio};
use std::sync::{mpsc, Arc, Mutex};
use tauri::Manager;

struct Worker { child: Child, input: ChildStdin, output: mpsc::Receiver<String> }
impl Drop for Worker {
    fn drop(&mut self) { let _ = self.child.kill(); let _ = self.child.wait(); }
}

#[derive(Default)]
pub struct PlayerSpeech(Arc<Mutex<Option<Worker>>>);

fn normalized_name(name: &str) -> Result<String, String> {
    let name = name.split_whitespace().collect::<Vec<_>>().join(" ");
    if name.is_empty() || name.chars().count() > 24 || name.chars().any(char::is_control) {
        return Err("Jméno musí mít 1 až 24 znaků.".into());
    }
    Ok(name)
}

fn start_worker(runtime: &std::path::Path, cache: &std::path::Path) -> Result<Worker, String> {
    #[cfg(windows)]
    let python = runtime.join("python.exe");
    #[cfg(not(windows))]
    let python = runtime.join("bin").join("python3");
    let mut command = Command::new(python);
    command.arg("-I").arg("-u").arg(runtime.join("worker.py"))
        .arg("--models").arg(runtime.join("assets"))
        .arg("--cache").arg(cache)
        .stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::null());
    #[cfg(windows)] {
        use std::os::windows::process::CommandExt;
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW
    }
    let mut child = command.spawn().map_err(|_| "Nelze spustit lokální hlasatel. Chybí složka tts vedle aplikace.".to_string())?;
    let input = child.stdin.take().ok_or("Hlasatel nemá vstup.")?;
    let stdout = child.stdout.take().ok_or("Hlasatel nemá výstup.")?;
    let (sender, output) = mpsc::channel();
    std::thread::spawn(move || {
        for line in BufReader::new(stdout).lines() {
            match line { Ok(line) => { if sender.send(line).is_err() { break; } }, Err(_) => break }
        }
    });
    Ok(Worker { child, input, output })
}

fn request(worker: &mut Worker, name: &str, voice: &str, cache: &std::path::Path) -> Result<Vec<u8>, String> {
    let payload = serde_json::json!({ "name": name, "voice": voice });
    writeln!(worker.input, "{payload}").and_then(|_| worker.input.flush()).map_err(|_| "Hlasatel neodpovídá.".to_string())?;
    let line = worker.output.recv_timeout(std::time::Duration::from_secs(30)).map_err(|_| "Lokální hlasatel neodpovídá.")?;
    let value: serde_json::Value = serde_json::from_str(&line).map_err(|_| "Neplatná odpověď hlasatele.")?;
    let path = value.get("file").and_then(|v| v.as_str()).map(PathBuf::from).ok_or("Hlášení jména se nepodařilo připravit.")?;
    // Worker vrací jen WAV ze své cache, nikdy libovolný soubor.
    let resolved = path.canonicalize().map_err(|_| "Nahrávka jména chybí.")?;
    let base = cache.canonicalize().map_err(|_| "Složka hlášení chybí.")?;
    if !resolved.starts_with(base) || resolved.extension().and_then(|v| v.to_str()) != Some("wav") {
        return Err("Neplatná nahrávka jména.".into());
    }
    let bytes = std::fs::read(resolved).map_err(|_| "Nahrávku jména nelze načíst.")?;
    if bytes.len() < 44 || bytes.len() > 2 * 1024 * 1024 || &bytes[..4] != b"RIFF" || &bytes[8..12] != b"WAVE" {
        return Err("Neplatný formát nahrávky jména.".into());
    }
    Ok(bytes)
}

#[tauri::command]
pub async fn player_speech(app: tauri::AppHandle, state: tauri::State<'_, PlayerSpeech>, name: String, voice: String) -> Result<tauri::ipc::Response, String> {
    let name = normalized_name(&name)?;
    if !matches!(voice.as_str(), "eliska" | "martin") { return Err("Neznámý hlas.".into()); }
    let runtime = super::resource_base(&app)?.join("tts");
    let cache = super::data_dir(&app)?.join("hlaseni-hracu");
    let worker = state.0.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let mut slot = worker.lock().map_err(|_| "Lokální hlasatel se zastavil.")?;
        if slot.is_none() { *slot = Some(start_worker(&runtime, &cache)?); }
        let result = request(slot.as_mut().unwrap(), &name, &voice, &cache);
        if result.is_err() { *slot = None; }
        result.map(tauri::ipc::Response::new)
    }).await.map_err(|_| "Příprava jména selhala.".to_string())?
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn names_and_control_characters() {
        assert_eq!(normalized_name("  Jarda   Novák ").unwrap(), "Jarda Novák");
        for bad in ["", " ", "hráč\0", "1234567890123456789012345"] { assert!(normalized_name(bad).is_err()); }
    }
}
