use serde::{Deserialize, Serialize};
use std::fs;
use tauri::{Emitter, Manager};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Card {
    pub id: String,
    pub title: String,
    pub body: String,
    pub tags: Vec<String>,
    pub order: i64,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "updatedAt")]
    pub updated_at: String,
}

fn cards_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("cards.json")
}

#[tauri::command]
pub async fn read_cards(app: tauri::AppHandle) -> Result<Vec<Card>, String> {
    let path = cards_path(&app);
    match fs::read_to_string(&path) {
        Ok(content) => serde_json::from_str(&content).map_err(|e| e.to_string()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(vec![]),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn write_cards(app: tauri::AppHandle, cards: Vec<Card>) -> Result<(), String> {
    let path = cards_path(&app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(&cards).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    // ADR-004: 모든 창에 브로드캐스트
    app.emit("cards-updated", &cards).map_err(|e: tauri::Error| e.to_string())?;
    Ok(())
}
