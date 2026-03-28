use serde::{Deserialize, Serialize};
use tauri::Emitter;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Card {
    pub id: String,
    pub title: String,
    pub body: String,
    pub order: f64,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct CardsUpdatedPayload {
    cards: Vec<Card>,
    client_id: Option<String>,
}

fn cards_path(app: &tauri::AppHandle) -> Result<std::path::PathBuf, String> {
    super::data_path(app, "cards.json")
}

#[tauri::command]
pub async fn read_cards(app: tauri::AppHandle) -> Result<Vec<Card>, String> {
    let path = cards_path(&app)?;
    match tokio::fs::read_to_string(&path).await {
        Ok(content) => serde_json::from_str(&content).map_err(|e| e.to_string()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(vec![]),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn write_cards(
    app: tauri::AppHandle,
    cards: Vec<Card>,
    client_id: Option<String>,
) -> Result<(), String> {
    let path = cards_path(&app)?;
    super::ensure_parent_dir(&path)?;
    let content = serde_json::to_string_pretty(&cards).map_err(|e| e.to_string())?;
    super::atomic_write_json(&path, content).await?;
    // ADR-004: 모든 창에 브로드캐스트
    app.emit(
        "cards-updated",
        &CardsUpdatedPayload { cards, client_id },
    )
    .map_err(|e: tauri::Error| e.to_string())?;
    Ok(())
}
