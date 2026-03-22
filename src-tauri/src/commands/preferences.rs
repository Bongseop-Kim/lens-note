use serde_json::Value;
use std::fs;
use tauri::{Emitter, Manager};

fn prefs_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("preferences.json")
}

#[tauri::command]
pub async fn read_prefs(app: tauri::AppHandle) -> Result<Value, String> {
    let path = prefs_path(&app);
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).map_err(|e| e.to_string()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(Value::Null),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn write_prefs(app: tauri::AppHandle, prefs: Value) -> Result<(), String> {
    let path = prefs_path(&app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(&prefs).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    app.emit("prefs-updated", &prefs).map_err(|e: tauri::Error| e.to_string())?;
    Ok(())
}
