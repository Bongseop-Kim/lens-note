use serde::{Deserialize, Serialize};
use tauri::Emitter;

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Theme {
    Dark,
    Light,
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
#[serde(default, rename_all = "camelCase")]
pub struct HotkeyConfig {
    pub next: String,
    pub prev: String,
    pub jump: String,
    pub search: String,
    pub toggle: String,
}

impl Default for HotkeyConfig {
    fn default() -> Self {
        Self {
            next: "ArrowRight".into(),
            prev: "ArrowLeft".into(),
            jump: "Ctrl+G".into(),
            search: "Ctrl+F".into(),
            toggle: "Ctrl+Shift+P".into(),
        }
    }
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
    pub theme: Theme,
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
            hotkeys: HotkeyConfig::default(),
            theme: Theme::Dark,
            highlight_current_paragraph: true,
            drag_locked: true,
        }
    }
}

pub fn load_prefs_sync(app: &tauri::AppHandle) -> Preferences {
    let path = match prefs_path(app) {
        Ok(path) => path,
        Err(error) => {
            eprintln!("Failed to resolve preferences path: {error}");
            return Preferences::default();
        }
    };

    match std::fs::read_to_string(&path) {
        Ok(content) => match serde_json::from_str::<Preferences>(&content) {
            Ok(prefs) => prefs.clamped(),
            Err(error) => {
                eprintln!("Failed to parse preferences file '{}': {error}", path.display());
                Preferences::default()
            }
        },
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Preferences::default(),
        Err(error) => {
            eprintln!("Failed to read preferences file '{}': {error}", path.display());
            Preferences::default()
        }
    }
}

impl Preferences {
    pub fn clamped(self) -> Self {
        fn finite_or(value: f64, fallback: f64) -> f64 {
            if value.is_finite() { value } else { fallback }
        }

        let d = Self::default();
        Self {
            opacity: finite_or(self.opacity, d.opacity).clamp(0.4, 1.0),
            font_size: finite_or(self.font_size, d.font_size).clamp(8.0, 72.0),
            line_height: finite_or(self.line_height, d.line_height).clamp(1.0, 3.0),
            overlay_width: finite_or(self.overlay_width, d.overlay_width).clamp(200.0, 2000.0),
            overlay_height: finite_or(self.overlay_height, d.overlay_height).clamp(50.0, 1000.0),
            overlay_x: finite_or(self.overlay_x, d.overlay_x).clamp(-10_000.0, 10_000.0),
            overlay_y: finite_or(self.overlay_y, d.overlay_y).clamp(-10_000.0, 10_000.0),
            ..self
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
    match tokio::fs::read_to_string(&path).await {
        Ok(content) => serde_json::from_str::<Preferences>(&content)
            .map(|p| p.clamped())
            .map_err(|e| e.to_string()),
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
    let prefs = prefs.clamped();
    let saved_prefs = load_prefs_sync(&app);
    if prefs.hotkeys != saved_prefs.hotkeys {
        if let Err(error) = crate::register_configured_hotkeys(&app, &prefs.hotkeys) {
            eprintln!("Failed to apply updated hotkeys: {error}");
        }
    }
    let path = prefs_path(&app)?;
    super::ensure_parent_dir(&path)?;
    let content = serde_json::to_string_pretty(&prefs).map_err(|e| e.to_string())?;
    super::atomic_write_json(&path, content).await?;
    app.emit(
        "prefs-updated",
        &PrefsUpdatedPayload { prefs, client_id },
    )
    .map_err(|e: tauri::Error| e.to_string())?;
    Ok(())
}
