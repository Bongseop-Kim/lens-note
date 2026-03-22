# ADR-004: 크로스 윈도우 상태 동기화

- **Status**: Accepted
- **Date**: 2026-03-22

## Problem
Overlay ↔ Editor는 별개 WebView 프로세스 — 메모리를 공유하지 않음.
Editor에서 카드를 저장하거나 설정을 변경해도 Overlay가 자동으로 갱신되지 않음.

## Decision
Rust 백엔드를 단일 source of truth로 사용. 파일 쓰기 완료 후 모든 창에 이벤트를 브로드캐스트.
카드(`cards-updated`)와 설정(`prefs-updated`) 두 이벤트를 동일한 패턴으로 처리한다.

## Flow

### 카드 동기화
```
Editor: card 저장
  → invoke("write_cards", { cards })
  → Rust: 파일 쓰기 완료 후
  → emit("cards-updated", { cards })  ← 모든 창에 브로드캐스트
  → Overlay Zustand: listen("cards-updated") → setState
  → Editor Zustand: listen("cards-updated") → setState
```

### 설정 동기화
```
Editor: 설정 변경 (폰트, 투명도 등)
  → invoke("write_prefs", { prefs })
  → Rust: 파일 쓰기 완료 후
  → emit("prefs-updated", { prefs })  ← 모든 창에 브로드캐스트
  → Overlay Zustand: listen("prefs-updated") → setState  ← 즉시 반영
  → Editor Zustand: listen("prefs-updated") → setState
```

## Implementation

### 카드

```typescript
// src/store/useCardStore.ts
import { listen } from "@tauri-apps/api/event";

listen<Card[]>("cards-updated", (event) => {
  useCardStore.setState({ cards: event.payload });
});
```

```rust
// src-tauri/src/commands/cards.rs
#[tauri::command]
pub async fn write_cards(app: tauri::AppHandle, cards: Vec<Card>) -> Result<(), String> {
    // 파일 쓰기 로직...
    app.emit("cards-updated", &cards).map_err(|e| e.to_string())?;
    Ok(())
}
```

### 설정

```typescript
// src/store/usePrefsStore.ts
import { listen } from "@tauri-apps/api/event";

listen<Preferences>("prefs-updated", (event) => {
  usePrefsStore.setState({ preferences: event.payload });
});
```

```rust
// src-tauri/src/commands/preferences.rs
#[tauri::command]
pub async fn write_prefs(app: tauri::AppHandle, prefs: Preferences) -> Result<(), String> {
    // 파일 쓰기 로직...
    app.emit("prefs-updated", &prefs).map_err(|e| e.to_string())?;
    Ok(())
}
```

## Consequences
- 상태가 항상 파일과 동기화됨
- 폰트 크기·투명도 변경이 Editor → Overlay에 즉시 반영됨
- 앱 재시작 시 파일에서 hydrate 필요 (초기 `invoke("read_cards")`, `invoke("read_prefs")`)
