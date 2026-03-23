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

pub(crate) async fn atomic_write_json(path: &std::path::Path, content: String) -> Result<(), String> {
    let tmp = path.with_extension("json.tmp");
    tokio::fs::write(&tmp, &content).await.map_err(|e| e.to_string())?;
    tokio::fs::rename(&tmp, path).await.map_err(|e| e.to_string())?;
    Ok(())
}
