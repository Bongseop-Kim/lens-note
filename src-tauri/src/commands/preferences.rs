use serde::{Deserialize, Serialize};
use std::fs;
use tauri::Emitter;

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
#[serde(default, rename_all = "camelCase")]
pub struct HotkeyConfig {
    pub next: String,
    pub prev: String,
    pub jump: String,
    pub search: String,
    pub toggle: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(default, rename_all = "camelCase")]
pub struct Preferences {
    pub font_size: f64,
    pub line_height: f64,
    pub opacity: f64,
    pub overlay_width: f64,
    pub overlay_height: f64,
    pub overlay_x: f64,
    pub overlay_y: f64,
    pub hotkeys: HotkeyConfig,
    pub theme: String,
    pub highlight_current_paragraph: bool,
    pub drag_locked: bool,
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            font_size: 22.0,
            line_height: 1.7,
            opacity: 0.85,
            overlay_width: 480.0,
            overlay_height: 160.0,
            overlay_x: 0.0,
            overlay_y: 0.0,
            hotkeys: HotkeyConfig {
                next: "ArrowRight".into(),
                prev: "ArrowLeft".into(),
                jump: "Ctrl+G".into(),
                search: "Ctrl+F".into(),
                toggle: "Ctrl+Shift+P".into(),
            },
            theme: "dark".into(),
            highlight_current_paragraph: true,
            drag_locked: true,
        }
    }
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct PrefsUpdatedPayload {
    prefs: Preferences,
    client_id: Option<String>,
}

fn prefs_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    super::data_path(app, "preferences.json")
}

#[tauri::command]
pub async fn read_prefs(app: tauri::AppHandle) -> Result<Preferences, String> {
    let path = prefs_path(&app)?;
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).map_err(|e| e.to_string()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(Preferences::default()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn write_prefs(
    app: tauri::AppHandle,
    prefs: Preferences,
    client_id: Option<String>,
) -> Result<(), String> {
    let path = prefs_path(&app)?;
    super::ensure_parent_dir(&path)?;
    let content = serde_json::to_string_pretty(&prefs).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    app.emit(
        "prefs-updated",
        &PrefsUpdatedPayload { prefs, client_id },
    )
    .map_err(|e: tauri::Error| e.to_string())?;
    Ok(())
}
