pub mod cards;
pub mod preferences;
pub mod window;

use std::fs;
use tauri::Manager;

pub(crate) fn data_path(
    app: &tauri::AppHandle,
    filename: &str,
) -> Result<std::path::PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;
    Ok(dir.join(filename))
}

pub(crate) fn ensure_parent_dir(path: &std::path::Path) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    Ok(())
}
