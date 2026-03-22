# Interview Prompter v1 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** macOS 전용 영상면접 프롬프터 앱 — 웹캠 아래 투명 오버레이로 답변 카드를 표시하고, 글로벌 단축키로 카드를 전환하는 Tauri 2 + React 데스크탑 앱을 구현한다.

**Architecture:** Rust/Tauri 백엔드가 파일 I/O, 글로벌 단축키, 시스템 트레이를 담당하고, Overlay/Editor 두 WebView 창이 각각 독립된 React 앱으로 동작한다. 창 간 상태는 Rust를 단일 소스로 `emit_all` 이벤트 브로드캐스트로 동기화한다 (ADR-004). macOS NSWindow API는 `objc2-app-kit`으로 직접 제어한다.

**Tech Stack:** Tauri 2, React 18, TypeScript, Zustand, Tailwind CSS v3, @dnd-kit/sortable, fuse.js, lucide-react, Vite, objc2 0.5, objc2-app-kit 0.2, tauri-plugin-global-shortcut, tauri-plugin-fs, tauri-plugin-tray, tauri-plugin-macos-permissions

---

## File Structure (생성/수정 대상)

```
interview-prompter/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs                        # 앱 진입점, tray 초기화
│   │   ├── lib.rs                         # Tauri builder, plugin 등록
│   │   └── commands/
│   │       ├── mod.rs                     # commands 모듈 선언
│   │       ├── cards.rs                   # read_cards, write_cards
│   │       ├── preferences.rs             # read_prefs, write_prefs
│   │       └── window.rs                  # NSWindow 설정, overlay position
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── Info.plist
│   └── capabilities/
│       └── default.json
├── src/
│   ├── overlay/
│   │   ├── main.tsx                       # Overlay WebView 진입점
│   │   ├── OverlayApp.tsx                 # Overlay 루트 컴포넌트
│   │   ├── CardDisplay.tsx                # 카드 본문 렌더러 + 단락 하이라이트
│   │   ├── NavBar.tsx                     # 이전/다음 버튼 + 인덱스 표시
│   │   ├── DragHandle.tsx                 # 24px 드래그 핸들
│   │   └── SettingsPopup.tsx              # 투명도 슬라이더 팝업
│   ├── editor/
│   │   ├── main.tsx                       # Editor WebView 진입점
│   │   ├── EditorApp.tsx                  # Editor 루트 컴포넌트
│   │   ├── CardList.tsx                   # sortable 카드 목록
│   │   ├── CardDetail.tsx                 # 카드 제목/본문/태그 편집
│   │   └── Preferences.tsx                # 폰트, 단축키, 테마 설정
│   ├── store/
│   │   ├── useCardStore.ts                # Zustand: cards + currentIndex
│   │   └── usePrefsStore.ts               # Zustand: preferences
│   ├── types.ts                           # Card, AppState, Preferences, HotkeyConfig
│   └── utils/
│       ├── search.ts                      # fuse.js 래퍼
│       └── hotkeys.ts                     # 단축키 문자열 헬퍼
├── index.html                             # Overlay WebView 진입 HTML
├── editor.html                            # Editor WebView 진입 HTML
├── package.json
└── vite.config.ts                         # 멀티-엔트리 Vite 설정
```

---

## Phase 1 — Core Shell

> **목표:** Tauri 앱을 부트스트랩하고, 두 창(overlay/editor)이 뜨며, overlay가 Zoom 전체화면 위에서도 보이고 포커스를 빼앗지 않는다는 것을 검증한다.

### Task 1-1: 프로젝트 부트스트랩

**Files:**
- Create: `src-tauri/tauri.conf.json`
- Create: `src-tauri/Cargo.toml`
- Create: `vite.config.ts`
- Create: `package.json`

- [ ] **Step 1: 프로젝트 생성**

```bash
pnpm create tauri-app interview-prompter --template react-ts
cd interview-prompter
pnpm install
```

- [ ] **Step 2: 필요 npm 패키지 추가**

```bash
pnpm add zustand @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities fuse.js lucide-react
pnpm add -D tailwindcss postcss autoprefixer
pnpm exec tailwindcss init -p
```

- [ ] **Step 3: 필요 Tauri 플러그인 추가**

```bash
pnpm tauri add global-shortcut
pnpm tauri add fs
pnpm tauri add tray
cargo add tauri-plugin-macos-permissions
pnpm add tauri-plugin-macos-permissions-api
```

- [ ] **Step 4: 빌드 확인**

```bash
pnpm tauri dev
```
Expected: 기본 창 1개 열림, 콘솔 에러 없음.

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: bootstrap Tauri 2 + React + TS project"
```

---

### Task 1-2: 두 창 설정 (tauri.conf.json)

**Files:**
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: tauri.conf.json에 두 창 정의**

```json
{
  "app": {
    "windows": [
      {
        "label": "overlay",
        "url": "index.html",
        "width": 480,
        "height": 160,
        "decorations": false,
        "transparent": true,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "resizable": true,
        "focus": false,
        "shadow": false,
        "visibleOnAllWorkspaces": true,
        "acceptFirstMouse": true
      },
      {
        "label": "editor",
        "url": "editor.html",
        "title": "Interview Prompter — Editor",
        "width": 900,
        "height": 640,
        "decorations": true,
        "titleBarStyle": "overlay",
        "hiddenTitle": true,
        "alwaysOnTop": false
      }
    ]
  }
}
```

- [ ] **Step 2: Vite 멀티 엔트리 설정**

`vite.config.ts`:
```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        editor: resolve(__dirname, "editor.html"),
      },
    },
  },
});
```

- [ ] **Step 3: editor.html 생성**

`editor.html`:
```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Interview Prompter — Editor</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/editor/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: 각 창 진입점 파일 생성**

`src/overlay/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import OverlayApp from "./OverlayApp";
import "../index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <OverlayApp />
  </React.StrictMode>
);
```

`src/editor/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";
import EditorApp from "./EditorApp";
import "../index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <EditorApp />
  </React.StrictMode>
);
```

`src/overlay/OverlayApp.tsx`:
```tsx
export default function OverlayApp() {
  return (
    <div className="overlay-root w-full h-full bg-black/80 text-white p-2">
      <p>Overlay Hello</p>
    </div>
  );
}
```

`src/editor/EditorApp.tsx`:
```tsx
export default function EditorApp() {
  return (
    <div className="p-4">
      <h1 className="text-xl font-bold">Interview Prompter — Editor</h1>
    </div>
  );
}
```

- [ ] **Step 5: 두 창 모두 열리는지 확인**

```bash
pnpm tauri dev
```
Expected: overlay 창(작은 검은 창)과 editor 창 두 개 모두 열림.

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: configure overlay and editor windows in tauri.conf.json"
```

---

### Task 1-3: NSWindow macOS 동작 설정 (ADR-001, ADR-002)

**Files:**
- Modify: `src-tauri/Cargo.toml`
- Create: `src-tauri/src/commands/window.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Cargo.toml에 objc2 의존성 추가**

`src-tauri/Cargo.toml`:
```toml
[target.'cfg(target_os = "macos")'.dependencies]
objc2 = "0.5"
objc2-app-kit = { version = "0.2", features = ["NSWindow"] }
```

- [ ] **Step 2: window.rs 작성 — NSWindow 설정 함수**

`src-tauri/src/commands/window.rs`:
```rust
#[cfg(target_os = "macos")]
pub fn configure_overlay_window(app: &tauri::AppHandle) {
    use objc2::runtime::AnyObject;
    use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior, NSWindowLevel};

    let overlay = app.get_webview_window("overlay").unwrap();
    let ns_window_ptr = overlay.ns_window().unwrap() as *mut AnyObject;
    let ns_window = unsafe { &*(ns_window_ptr as *const NSWindow) };

    unsafe {
        // Floating level: 일반 창 위, screensaver 아래 (ADR-002)
        ns_window.setLevel(NSWindowLevel::Floating);

        // 모든 Space + 전체화면 Space에 표시, 포커스 순환 제외 (ADR-001, ADR-002)
        ns_window.setCollectionBehavior(
            NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
                | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary
                | NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary
                | NSWindowCollectionBehavior::NSWindowCollectionBehaviorIgnoresCycle,
        );
    }
}
```

- [ ] **Step 3: lib.rs setup에서 configure_overlay_window 호출**

`src-tauri/src/lib.rs`:
```rust
use tauri::Manager;
mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_macos_permissions::init())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            commands::window::configure_overlay_window(&app.handle());
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

- [ ] **Step 4: 빌드 확인**

```bash
pnpm tauri dev
```
Expected: 컴파일 에러 없음.

- [ ] **Step 5: [검증 체크포인트] Zoom 전체화면 테스트**

수동 검증:
1. Zoom을 전체화면으로 실행
2. `pnpm tauri dev` 실행
3. Overlay가 Zoom 전체화면 위에 뜨는지 확인
4. Overlay 본문 영역 클릭 → Zoom 포커스가 유지되는지 확인

- [ ] **Step 6: Commit**

```bash
git add src-tauri/
git commit -m "feat(macos): configure NSWindow floating level and collection behavior"
```

---

### Task 1-4: Drag Handle 및 포커스 비탈취 CSS (ADR-003)

**Files:**
- Create: `src/overlay/DragHandle.tsx`
- Modify: `src/overlay/OverlayApp.tsx`

- [ ] **Step 1: DragHandle 컴포넌트 작성**

`src/overlay/DragHandle.tsx`:
```tsx
export default function DragHandle() {
  return (
    <div
      data-tauri-drag-region
      className="h-6 w-full cursor-move select-none"
    />
  );
}
```

- [ ] **Step 2: OverlayApp에 CSS 레이어 분리 적용 (ADR-001)**

`src/overlay/OverlayApp.tsx`:
```tsx
import DragHandle from "./DragHandle";

export default function OverlayApp() {
  return (
    // overlay-root: 본문 클릭 통과 (pointer-events: none)
    <div className="overlay-root w-full h-screen flex flex-col bg-black/80 text-white select-none"
         style={{ pointerEvents: "none" }}>
      {/* drag handle은 pointer-events 활성화 */}
      <div style={{ pointerEvents: "auto" }}>
        <DragHandle />
      </div>
      {/* 본문 영역: 클릭 Zoom으로 통과 */}
      <div className="flex-1 p-3 overflow-hidden">
        <p className="text-lg">Overlay ready</p>
      </div>
      {/* 버튼 영역만 pointer-events 활성화 */}
      <div className="overlay-controls flex gap-2 p-2"
           style={{ pointerEvents: "auto" }}>
        <button className="px-3 py-1 bg-white/20 rounded text-sm">← Prev</button>
        <button className="px-3 py-1 bg-white/20 rounded text-sm">Next →</button>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 드래그 동작 확인**

```bash
pnpm tauri dev
```
수동 검증: DragHandle 영역(상단 24px) 드래그 → 창 이동 확인.

- [ ] **Step 4: Commit**

```bash
git add src/overlay/
git commit -m "feat(overlay): add drag handle and pointer-events layering for focus preservation"
```

---

## Phase 2 — Data Layer

> **목표:** Rust 커맨드로 카드와 설정을 파일에 저장/로드하고, Zustand 스토어에 hydrate한다.

### Task 2-1: 타입 정의

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: types.ts 작성 (architecture.md 데이터 모델 그대로)**

`src/types.ts`:
```typescript
export interface Card {
  id: string;        // uuid v4
  title: string;     // e.g. "자기소개"
  body: string;      // 답변 텍스트 (\n으로 단락 구분)
  tags: string[];    // optional: "technical", "hr"
  order: number;     // 목록 표시 순서
  createdAt: string; // ISO 8601
  updatedAt: string;
}

export interface HotkeyConfig {
  next: string;   // default: "ArrowRight"
  prev: string;   // default: "ArrowLeft"
  jump: string;   // default: "Ctrl+G"
  search: string; // default: "Ctrl+F"
  toggle: string; // default: "Ctrl+Shift+P"
}

export interface Preferences {
  fontSize: number;                   // default: 22, range: 14–40
  lineHeight: number;                 // default: 1.7
  opacity: number;                    // default: 0.85, range: 0.4–1.0
  overlayWidth: number;
  overlayHeight: number;
  overlayX: number;
  overlayY: number;
  hotkeys: HotkeyConfig;
  theme: "dark" | "light";
  highlightCurrentParagraph: boolean;
}

export interface AppState {
  cards: Card[];
  currentIndex: number;
  preferences: Preferences;
}

export const DEFAULT_PREFS: Preferences = {
  fontSize: 22,
  lineHeight: 1.7,
  opacity: 0.85,
  overlayWidth: 480,
  overlayHeight: 160,
  overlayX: 0,
  overlayY: 0,
  hotkeys: {
    next: "ArrowRight",
    prev: "ArrowLeft",
    jump: "Ctrl+G",
    search: "Ctrl+F",
    toggle: "Ctrl+Shift+P",
  },
  theme: "dark",
  highlightCurrentParagraph: true,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: define Card, Preferences, HotkeyConfig types"
```

---

### Task 2-2: Rust cards.rs 커맨드

**Files:**
- Create: `src-tauri/src/commands/cards.rs`
- Create: `src-tauri/src/commands/mod.rs`

- [ ] **Step 1: Card 타입 Rust 구조체 작성 (cards.rs)**

`src-tauri/src/commands/cards.rs`:
```rust
use serde::{Deserialize, Serialize};
use std::fs;
use tauri::Manager;

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
    if !path.exists() {
        return Ok(vec![]);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
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
    app.emit_all("cards-updated", &cards).map_err(|e| e.to_string())?;
    Ok(())
}
```

- [ ] **Step 2: mod.rs 작성**

`src-tauri/src/commands/mod.rs`:
```rust
pub mod cards;
pub mod preferences;
pub mod window;
```

- [ ] **Step 3: lib.rs invoke_handler에 커맨드 등록**

`src-tauri/src/lib.rs` invoke_handler 업데이트:
```rust
.invoke_handler(tauri::generate_handler![
    commands::cards::read_cards,
    commands::cards::write_cards,
])
```

- [ ] **Step 4: 빌드 확인**

```bash
cd src-tauri && cargo check
```
Expected: 에러 없음.

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/
git commit -m "feat(rust): add read_cards and write_cards commands with emit_all broadcast"
```

---

### Task 2-3: Rust preferences.rs 커맨드

**Files:**
- Create: `src-tauri/src/commands/preferences.rs`

- [ ] **Step 1: preferences.rs 작성**

`src-tauri/src/commands/preferences.rs`:
```rust
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::fs;
use tauri::Manager;

fn prefs_path(app: &tauri::AppHandle) -> std::path::PathBuf {
    app.path().app_data_dir().unwrap().join("preferences.json")
}

#[tauri::command]
pub async fn read_prefs(app: tauri::AppHandle) -> Result<Value, String> {
    let path = prefs_path(&app);
    if !path.exists() {
        return Ok(Value::Null);
    }
    let content = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_prefs(app: tauri::AppHandle, prefs: Value) -> Result<(), String> {
    let path = prefs_path(&app);
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(&prefs).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    app.emit_all("prefs-updated", &prefs).map_err(|e| e.to_string())?;
    Ok(())
}
```

- [ ] **Step 2: lib.rs invoke_handler에 추가**

```rust
.invoke_handler(tauri::generate_handler![
    commands::cards::read_cards,
    commands::cards::write_cards,
    commands::preferences::read_prefs,
    commands::preferences::write_prefs,
    commands::window::set_overlay_bounds,
])
```

- [ ] **Step 3: 빌드 확인**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/preferences.rs src-tauri/src/lib.rs
git commit -m "feat(rust): add read_prefs and write_prefs commands"
```

---

### Task 2-4: Zustand 스토어 — useCardStore

**Files:**
- Create: `src/store/useCardStore.ts`

- [ ] **Step 1: useCardStore.ts 작성 (ADR-004 이벤트 리스닝 포함)**

`src/store/useCardStore.ts`:
```typescript
import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Card } from "../types";

interface CardStore {
  cards: Card[];
  currentIndex: number;
  isLoading: boolean;
  hydrate: () => Promise<void>;
  setCards: (cards: Card[]) => void;
  setCurrentIndex: (index: number) => void;
  addCard: (card: Omit<Card, "id" | "order" | "createdAt" | "updatedAt">) => Promise<void>;
  updateCard: (id: string, patch: Partial<Card>) => Promise<void>;
  deleteCard: (id: string) => Promise<void>;
  reorderCards: (cards: Card[]) => Promise<void>;
}

export const useCardStore = create<CardStore>((set, get) => ({
  cards: [],
  currentIndex: 0,
  isLoading: false,

  hydrate: async () => {
    set({ isLoading: true });
    const cards = await invoke<Card[]>("read_cards");
    set({ cards, isLoading: false });
  },

  setCards: (cards) => set({ cards }),
  setCurrentIndex: (index) => set({ currentIndex: index }),

  addCard: async (partial) => {
    const now = new Date().toISOString();
    const newCard: Card = {
      id: crypto.randomUUID(),
      order: get().cards.length,
      createdAt: now,
      updatedAt: now,
      tags: [],
      ...partial,
    };
    const updated = [...get().cards, newCard];
    await invoke("write_cards", { cards: updated });
  },

  updateCard: async (id, patch) => {
    const updated = get().cards.map((c) =>
      c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c
    );
    await invoke("write_cards", { cards: updated });
  },

  deleteCard: async (id) => {
    const updated = get().cards.filter((c) => c.id !== id);
    await invoke("write_cards", { cards: updated });
  },

  reorderCards: async (cards) => {
    await invoke("write_cards", { cards });
  },
}));

// ADR-004: Rust 브로드캐스트 수신 → 스토어 업데이트
listen<Card[]>("cards-updated", (event) => {
  useCardStore.setState({ cards: event.payload });
});
```

- [ ] **Step 2: Commit**

> `crypto.randomUUID()`는 WebView에 내장 — 별도 패키지 불필요.

```bash
git add src/store/useCardStore.ts
git commit -m "feat(store): add useCardStore with Tauri invoke and cards-updated listener"
```

---

### Task 2-5: Zustand 스토어 — usePrefsStore

**Files:**
- Create: `src/store/usePrefsStore.ts`

- [ ] **Step 1: usePrefsStore.ts 작성**

`src/store/usePrefsStore.ts`:
```typescript
import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Preferences, DEFAULT_PREFS } from "../types";

interface PrefsStore {
  prefs: Preferences;
  hydrate: () => Promise<void>;
  updatePrefs: (patch: Partial<Preferences>) => Promise<void>;
}

export const usePrefsStore = create<PrefsStore>((set, get) => ({
  prefs: DEFAULT_PREFS,

  hydrate: async () => {
    const saved = await invoke<Preferences | null>("read_prefs");
    if (saved) {
      set({ prefs: { ...DEFAULT_PREFS, ...saved } });
    }
  },

  updatePrefs: async (patch) => {
    const updated = { ...get().prefs, ...patch };
    set({ prefs: updated });
    await invoke("write_prefs", { prefs: updated });
  },
}));

listen<Preferences>("prefs-updated", (event) => {
  usePrefsStore.setState({ prefs: event.payload });
});
```

- [ ] **Step 2: 앱 시작 시 hydrate 호출 확인**

양쪽 `main.tsx`에서 앱 마운트 전 hydrate 호출:
```typescript
// overlay/main.tsx, editor/main.tsx 모두에 추가
import { useCardStore } from "../store/useCardStore";
import { usePrefsStore } from "../store/usePrefsStore";

// App 컴포넌트 내부 useEffect 또는 최상위에서
useEffect(() => {
  useCardStore.getState().hydrate();
  usePrefsStore.getState().hydrate();
}, []);
```

- [ ] **Step 3: Commit**

```bash
git add src/store/usePrefsStore.ts
git commit -m "feat(store): add usePrefsStore with hydrate and prefs-updated listener"
```

---

### Task 2-6: Editor 카드 CRUD UI

**Files:**
- Create: `src/editor/CardList.tsx`
- Create: `src/editor/CardDetail.tsx`
- Modify: `src/editor/EditorApp.tsx`

- [ ] **Step 1: CardList.tsx 작성 (dnd-kit sortable)**

`src/editor/CardList.tsx`:
```tsx
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { useCardStore } from "../store/useCardStore";
import { Card } from "../types";

function SortableCard({
  card,
  isSelected,
  onSelect,
}: {
  card: Card;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: card.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 rounded cursor-pointer border ${
        isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"
      }`}
      onClick={onSelect}
    >
      <span {...attributes} {...listeners} className="cursor-grab text-gray-400">
        <GripVertical size={16} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{card.title || "(제목 없음)"}</p>
        <p className="text-sm text-gray-500 truncate">{card.body.slice(0, 50)}</p>
      </div>
    </div>
  );
}

export default function CardList({
  selectedId,
  onSelect,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const { cards, reorderCards, addCard } = useCardStore();

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = cards.findIndex((c) => c.id === active.id);
    const newIndex = cards.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(cards, oldIndex, newIndex).map((c, i) => ({
      ...c,
      order: i,
    }));
    reorderCards(reordered);
  }

  return (
    <div className="flex flex-col gap-2">
      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              isSelected={selectedId === card.id}
              onSelect={() => onSelect(card.id)}
            />
          ))}
        </SortableContext>
      </DndContext>
      <button
        className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        onClick={() => addCard({ title: "", body: "" })}
      >
        + 새 카드
      </button>
    </div>
  );
}
```

- [ ] **Step 2: CardDetail.tsx 작성**

`src/editor/CardDetail.tsx`:
```tsx
import { useEffect, useState } from "react";
import { useCardStore } from "../store/useCardStore";
import { Card } from "../types";
import { Trash2 } from "lucide-react";

export default function CardDetail({ cardId }: { cardId: string }) {
  const { cards, updateCard, deleteCard } = useCardStore();
  const card = cards.find((c) => c.id === cardId);
  const [title, setTitle] = useState(card?.title ?? "");
  const [body, setBody] = useState(card?.body ?? "");
  const [tagInput, setTagInput] = useState("");

  useEffect(() => {
    if (card) {
      setTitle(card.title);
      setBody(card.body);
    }
  }, [cardId]);

  if (!card) return null;

  function handleSave() {
    updateCard(cardId, { title, body });
  }

  function addTag() {
    const tag = tagInput.trim();
    if (tag && !card!.tags.includes(tag)) {
      updateCard(cardId, { tags: [...card!.tags, tag] });
    }
    setTagInput("");
  }

  function removeTag(tag: string) {
    updateCard(cardId, { tags: card!.tags.filter((t) => t !== tag) });
  }

  return (
    <div className="flex flex-col gap-4 p-4 h-full">
      <div className="flex items-center justify-between">
        <input
          className="flex-1 text-xl font-bold border-b-2 border-gray-300 focus:border-blue-500 outline-none pb-1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSave}
          placeholder="카드 제목"
        />
        <button
          className="ml-4 text-red-400 hover:text-red-600"
          onClick={() => deleteCard(cardId)}
        >
          <Trash2 size={18} />
        </button>
      </div>
      {/* 태그 chips (PRD F-04) */}
      <div className="flex flex-wrap gap-2 items-center">
        {card.tags.map((tag) => (
          <span key={tag} className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">
            {tag}
            <button onClick={() => removeTag(tag)} className="hover:text-red-500">×</button>
          </span>
        ))}
        <input
          className="border rounded px-2 py-0.5 text-xs w-24"
          value={tagInput}
          onChange={(e) => setTagInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") addTag(); }}
          placeholder="태그 추가"
        />
      </div>
      <textarea
        className="flex-1 p-3 border rounded resize-none font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={handleSave}
        placeholder="답변 내용을 입력하세요..."
      />
    </div>
  );
}
```

- [ ] **Step 3: EditorApp.tsx 레이아웃 조립**

`src/editor/EditorApp.tsx`:
```tsx
import { useEffect, useState } from "react";
import { useCardStore } from "../store/useCardStore";
import { usePrefsStore } from "../store/usePrefsStore";
import CardList from "./CardList";
import CardDetail from "./CardDetail";

export default function EditorApp() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { hydrate: hydrateCards } = useCardStore();
  const { hydrate: hydratePrefs } = usePrefsStore();

  useEffect(() => {
    hydrateCards();
    hydratePrefs();
  }, []);

  return (
    <div className="flex h-screen pt-8">
      {/* 사이드바: 카드 목록 */}
      <div className="w-72 border-r overflow-y-auto p-3">
        <CardList selectedId={selectedId} onSelect={setSelectedId} />
      </div>
      {/* 메인: 카드 상세 */}
      <div className="flex-1 overflow-y-auto">
        {selectedId ? (
          <CardDetail cardId={selectedId} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            카드를 선택하거나 새 카드를 추가하세요
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 동작 확인**

```bash
pnpm tauri dev
```
수동 검증: Editor에서 카드 추가 → 저장 → 앱 재시작 → 카드 목록 복원 확인.

- [ ] **Step 5: Commit**

```bash
git add src/editor/
git commit -m "feat(editor): add CardList with dnd-kit sorting and CardDetail CRUD"
```

---

## Phase 3 — Navigation

> **목표:** 글로벌 단축키로 카드를 전환하고, Accessibility 권한 부재 시 경고 배너를 표시한다.

### Task 3-1: Accessibility 권한 체크 및 배너

**Files:**
- Modify: `src-tauri/Info.plist`
- Modify: `src-tauri/capabilities/default.json`
- Modify: `src/editor/EditorApp.tsx`

- [ ] **Step 1: Info.plist에 NSAccessibilityUsageDescription 추가**

`src-tauri/Info.plist`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSAccessibilityUsageDescription</key>
  <string>키보드 단축키 사용을 위해 손쉬운 사용 권한이 필요합니다.</string>
</dict>
</plist>
```

- [ ] **Step 2: capabilities/default.json에 권한 추가**

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capability",
  "windows": ["main", "overlay", "editor"],
  "permissions": [
    "core:default",
    "fs:default",
    "global-shortcut:allow-register",
    "global-shortcut:allow-unregister",
    "macos-permissions:default",
    "dialog:allow-save",
    "dialog:allow-open"
  ]
}
```

- [ ] **Step 3: EditorApp에 권한 배너 추가**

`src/editor/EditorApp.tsx` 상단에 추가:
```tsx
import { checkAccessibilityPermission, requestAccessibilityPermission } from "tauri-plugin-macos-permissions-api";

// EditorApp 내부
const [needsAccessibility, setNeedsAccessibility] = useState(false);

useEffect(() => {
  checkAccessibilityPermission().then((granted) => {
    setNeedsAccessibility(!granted);
  });
}, []);

// JSX에 배너 추가 (pt-8 div 안에)
{needsAccessibility && (
  <div className="fixed top-0 left-0 right-0 bg-yellow-400 text-yellow-900 px-4 py-2 flex items-center justify-between z-50 text-sm">
    <span>단축키를 사용하려면 손쉬운 사용 권한이 필요합니다</span>
    <button
      className="underline font-medium"
      onClick={async () => {
        await requestAccessibilityPermission();
        const granted = await checkAccessibilityPermission();
        if (granted) setNeedsAccessibility(false);
      }}
    >
      설정 열기
    </button>
  </div>
)}
```

- [ ] **Step 4: Commit**

```bash
git add src-tauri/Info.plist src-tauri/capabilities/ src/editor/EditorApp.tsx
git commit -m "feat(permissions): add accessibility permission check and warning banner"
```

---

### Task 3-2: 글로벌 단축키 등록 (Rust)

**Files:**
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/src/commands/window.rs`

> **주의(ADR-005):** `tauri add global-shortcut`으로 자동 삽입된 `.plugin()` 라인과 `.setup()` 내 수동 초기화가 겹치면 panic. builder chain에서 중복 제거.

- [ ] **Step 1: lib.rs에 글로벌 단축키 setup 추가**

`src-tauri/src/lib.rs`:
```rust
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

.setup(|app| {
    #[cfg(target_os = "macos")]
    commands::window::configure_overlay_window(&app.handle());

    let handle = app.handle().clone();
    app.handle()
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |_app, shortcut, event| {
                    if event.state == ShortcutState::Released {
                        return;
                    }
                    // ADR-005: Pressed 이벤트만 처리
                    handle.emit("hotkey-fired", shortcut.id()).ok();
                })
                .build(),
        )
        .unwrap();

    // 기본 단축키 등록
    app.global_shortcut().register("Ctrl+Right").unwrap();
    app.global_shortcut().register("Ctrl+Left").unwrap();
    app.global_shortcut().register("Ctrl+Shift+P").unwrap();
    app.global_shortcut().register("Ctrl+G").unwrap();
    app.global_shortcut().register("Ctrl+F").unwrap();

    Ok(())
})
```

- [ ] **Step 2: 빌드 확인**

```bash
cd src-tauri && cargo check
```

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/lib.rs
git commit -m "feat(rust): register global hotkeys and emit hotkey-fired events"
```

---

### Task 3-3: Overlay 카드 전환 로직

**Files:**
- Modify: `src/overlay/OverlayApp.tsx`
- Create: `src/overlay/CardDisplay.tsx`
- Create: `src/overlay/NavBar.tsx`

- [ ] **Step 1: CardDisplay.tsx 작성**

`src/overlay/CardDisplay.tsx`:
```tsx
import { useCardStore } from "../store/useCardStore";
import { usePrefsStore } from "../store/usePrefsStore";
import { useEffect, useRef } from "react";

export default function CardDisplay() {
  const { cards, currentIndex } = useCardStore();
  const { prefs } = usePrefsStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const card = cards[currentIndex];

  // 카드 전환 시 스크롤 상단으로 (PRD F-03)
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [currentIndex]);

  if (!card) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
        카드가 없습니다. Editor에서 카드를 추가하세요.
      </div>
    );
  }

  const paragraphs = card.body.split("\n").filter((p) => p.trim());

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-3 py-2"
      style={{
        fontSize: `${prefs.fontSize}px`,
        lineHeight: prefs.lineHeight,
        color: prefs.theme === "dark" ? "#f5f5f5" : "#1a1a1a",
      }}
    >
      {paragraphs.map((p, i) => (
        <p key={i} className="mb-2">
          {p}
        </p>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: NavBar.tsx 작성**

`src/overlay/NavBar.tsx`:
```tsx
import { ChevronLeft, ChevronRight, X, Settings } from "lucide-react";
import { useCardStore } from "../store/useCardStore";

export default function NavBar({
  onSettings,
}: {
  onSettings: () => void;
}) {
  const { cards, currentIndex, setCurrentIndex } = useCardStore();
  const total = cards.length;
  const card = cards[currentIndex];

  function prev() {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }
  function next() {
    if (currentIndex < total - 1) setCurrentIndex(currentIndex + 1);
  }

  return (
    <div
      className="flex items-center gap-1 px-2 py-1 text-white/80 text-xs"
      style={{ pointerEvents: "auto" }}
    >
      <button onClick={prev} className="hover:text-white disabled:opacity-30" disabled={currentIndex === 0}>
        <ChevronLeft size={14} />
      </button>
      <span className="flex-1 text-center truncate">
        {total > 0 ? `${currentIndex + 1} / ${total}  ${card?.title ?? ""}` : "카드 없음"}
      </span>
      <button onClick={next} className="hover:text-white disabled:opacity-30" disabled={currentIndex >= total - 1}>
        <ChevronRight size={14} />
      </button>
      <button onClick={onSettings} className="hover:text-white ml-1">
        <Settings size={12} />
      </button>
    </div>
  );
}
```

- [ ] **Step 3: OverlayApp에서 hotkey-fired 이벤트 리스닝**

`src/overlay/OverlayApp.tsx`:
```tsx
import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { useCardStore } from "../store/useCardStore";
import { usePrefsStore } from "../store/usePrefsStore";
import DragHandle from "./DragHandle";
import CardDisplay from "./CardDisplay";
import NavBar from "./NavBar";
import SettingsPopup from "./SettingsPopup";

export default function OverlayApp() {
  const [showSettings, setShowSettings] = useState(false);
  const { cards, currentIndex, setCurrentIndex, hydrate } = useCardStore();
  const { hydrate: hydratePrefs, prefs } = usePrefsStore();

  useEffect(() => {
    hydrate();
    hydratePrefs();

    const unlisten = listen<string>("hotkey-fired", (event) => {
      const id = event.payload;
      const { currentIndex, cards } = useCardStore.getState();
      if (id.includes("Right") && currentIndex < cards.length - 1) {
        useCardStore.setState({ currentIndex: currentIndex + 1 });
      } else if (id.includes("Left") && currentIndex > 0) {
        useCardStore.setState({ currentIndex: currentIndex - 1 });
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, []);

  const bgOpacity = prefs.opacity;

  return (
    <div
      className="flex flex-col w-full h-screen overflow-hidden"
      style={{
        backgroundColor: `rgba(0, 0, 0, ${bgOpacity})`,
        pointerEvents: "none",
      }}
    >
      <div style={{ pointerEvents: "auto" }}>
        <DragHandle />
        <NavBar onSettings={() => setShowSettings((v) => !v)} />
      </div>
      <CardDisplay />
      {showSettings && <SettingsPopup onClose={() => setShowSettings(false)} />}
    </div>
  );
}
```

- [ ] **Step 4: 동작 확인**

```bash
pnpm tauri dev
```
수동 검증: Editor에서 카드 2개 이상 추가 후 `Ctrl+Right` → Overlay 카드 전환 확인.

- [ ] **Step 5: Commit**

```bash
git add src/overlay/
git commit -m "feat(overlay): add CardDisplay, NavBar, and global hotkey navigation"
```

---

### Task 3-4: Jump-to-index 다이얼로그 및 Fuzzy 검색

**Files:**
- Create: `src/utils/search.ts`
- Modify: `src/overlay/OverlayApp.tsx`

- [ ] **Step 1: search.ts 작성**

`src/utils/search.ts`:
```typescript
import Fuse from "fuse.js";
import { Card } from "../types";

let fuse: Fuse<Card> | null = null;

export function initSearch(cards: Card[]) {
  fuse = new Fuse(cards, {
    keys: ["title", "body"],
    threshold: 0.4,
    includeScore: true,
  });
}

export function searchCards(query: string): Card[] {
  if (!fuse || !query.trim()) return [];
  return fuse.search(query).map((r) => r.item);
}
```

- [ ] **Step 2: OverlayApp에 Jump/Search 다이얼로그 추가**

`src/overlay/OverlayApp.tsx` 내 전체 다이얼로그 상태 + JSX:
```tsx
import { initSearch, searchCards } from "../utils/search";
import { Card } from "../types";

// 상태
const [jumpInput, setJumpInput] = useState("");
const [showJump, setShowJump] = useState(false);
const [searchQuery, setSearchQuery] = useState("");
const [showSearch, setShowSearch] = useState(false);
const [searchResults, setSearchResults] = useState<Card[]>([]);

// 카드 변경 시 검색 인덱스 갱신
useEffect(() => {
  initSearch(cards);
}, [cards]);

// hotkey-fired 리스너 내에서 추가:
if (id.includes("KeyG")) { setShowJump(true); return; }
if (id.includes("KeyF")) { setShowSearch(true); return; }

// Jump-to-index 다이얼로그 JSX
{showJump && (
  <div
    className="absolute inset-0 flex items-center justify-center bg-black/50"
    style={{ pointerEvents: "auto" }}
  >
    <div className="bg-gray-800 rounded p-4 flex gap-2 items-center">
      <span className="text-white text-sm">카드 번호</span>
      <input
        autoFocus
        className="bg-gray-700 text-white px-2 py-1 rounded w-16 text-center"
        value={jumpInput}
        onChange={(e) => setJumpInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            const n = parseInt(jumpInput, 10);
            if (!isNaN(n) && n >= 1 && n <= cards.length) {
              setCurrentIndex(n - 1);
            }
            setShowJump(false);
            setJumpInput("");
          }
          if (e.key === "Escape") { setShowJump(false); setJumpInput(""); }
        }}
        placeholder="1"
      />
    </div>
  </div>
)}

// Fuzzy Search 다이얼로그 JSX
{showSearch && (
  <div
    className="absolute inset-0 flex flex-col items-center pt-8 bg-black/60"
    style={{ pointerEvents: "auto" }}
  >
    <div className="bg-gray-800 rounded p-4 w-80 flex flex-col gap-2">
      <input
        autoFocus
        className="bg-gray-700 text-white px-3 py-1.5 rounded w-full"
        value={searchQuery}
        placeholder="카드 검색..."
        onChange={(e) => {
          setSearchQuery(e.target.value);
          setSearchResults(searchCards(e.target.value));
        }}
        onKeyDown={(e) => { if (e.key === "Escape") { setShowSearch(false); setSearchQuery(""); } }}
      />
      <ul className="max-h-40 overflow-y-auto flex flex-col gap-1">
        {searchResults.map((card) => (
          <li
            key={card.id}
            className="px-3 py-1.5 rounded bg-gray-700 hover:bg-gray-600 cursor-pointer text-white text-sm"
            onClick={() => {
              const idx = cards.findIndex((c) => c.id === card.id);
              if (idx !== -1) setCurrentIndex(idx);
              setShowSearch(false);
              setSearchQuery("");
            }}
          >
            <span className="font-medium">{card.title}</span>
            <span className="text-gray-400 ml-2 text-xs truncate">{card.body.slice(0, 40)}</span>
          </li>
        ))}
        {searchQuery && searchResults.length === 0 && (
          <li className="text-gray-500 text-sm px-2">결과 없음</li>
        )}
      </ul>
    </div>
  </div>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/search.ts src/overlay/OverlayApp.tsx
git commit -m "feat(overlay): add jump-to-index and fuzzy search dialogs"
```

---

## Phase 4 — Reading UX

> **목표:** 읽기 편의성 — 폰트 크기, 줄간격, 투명도 슬라이더, 단락 하이라이트, 테마 전환.

### Task 4-1: 투명도 슬라이더 팝업 (⚙ 아이콘)

**Files:**
- Create: `src/overlay/SettingsPopup.tsx`

- [ ] **Step 1: SettingsPopup.tsx 작성**

`src/overlay/SettingsPopup.tsx`:
```tsx
import { usePrefsStore } from "../store/usePrefsStore";

export default function SettingsPopup({ onClose }: { onClose: () => void }) {
  const { prefs, updatePrefs } = usePrefsStore();

  return (
    <div
      className="absolute bottom-8 right-2 bg-gray-800 rounded shadow-xl p-4 flex flex-col gap-3 text-white text-sm w-56"
      style={{ pointerEvents: "auto" }}
    >
      <div className="flex justify-between items-center">
        <span>설정</span>
        <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
      </div>
      <label className="flex flex-col gap-1">
        <span>투명도 {Math.round(prefs.opacity * 100)}%</span>
        <input
          type="range"
          min={40}
          max={100}
          value={Math.round(prefs.opacity * 100)}
          onChange={(e) => updatePrefs({ opacity: parseInt(e.target.value) / 100 })}
          className="w-full"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span>글자 크기 {prefs.fontSize}px</span>
        <input
          type="range"
          min={14}
          max={40}
          value={prefs.fontSize}
          onChange={(e) => updatePrefs({ fontSize: parseInt(e.target.value) })}
          className="w-full"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span>줄 간격 {prefs.lineHeight}</span>
        <input
          type="range"
          min={12}
          max={20}
          value={Math.round(prefs.lineHeight * 10)}
          onChange={(e) => updatePrefs({ lineHeight: parseInt(e.target.value) / 10 })}
          className="w-full"
        />
      </label>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/overlay/SettingsPopup.tsx
git commit -m "feat(overlay): add settings popup with opacity, font size, line height sliders"
```

---

### Task 4-2: 단락 하이라이트 (PRD F-03)

**Files:**
- Modify: `src/overlay/CardDisplay.tsx`

- [ ] **Step 1: CardDisplay에 단락 하이라이트 로직 추가**

`src/overlay/CardDisplay.tsx`에 active 단락 추적 추가:
```tsx
import { useEffect, useRef, useState } from "react";

// CardDisplay 내부에 추가
const [activeIndex, setActiveIndex] = useState(0);
const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([]);

// IntersectionObserver로 가장 많이 보이는 단락 추적
useEffect(() => {
  const observers = paragraphRefs.current.map((el, i) => {
    if (!el) return null;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          setActiveIndex(i);
        }
      },
      { threshold: 0.5, root: scrollRef.current }
    );
    obs.observe(el);
    return obs;
  });
  return () => observers.forEach((obs) => obs?.disconnect());
}, [currentIndex, paragraphs.length]);

// 단락 렌더링에 ref와 active 클래스 적용
{paragraphs.map((p, i) => (
  <p
    key={i}
    ref={(el) => { paragraphRefs.current[i] = el; }}
    className={`mb-3 px-1 rounded transition-colors ${
      prefs.highlightCurrentParagraph && i === activeIndex
        ? "bg-white/10"
        : ""
    }`}
  >
    {p}
  </p>
))}
```

- [ ] **Step 2: Commit**

```bash
git add src/overlay/CardDisplay.tsx
git commit -m "feat(overlay): add paragraph highlight tracking with IntersectionObserver"
```

---

### Task 4-3: Editor 설정 탭 (Preferences.tsx)

**Files:**
- Create: `src/editor/Preferences.tsx`
- Modify: `src/editor/EditorApp.tsx`

- [ ] **Step 1: Preferences.tsx 작성**

`src/editor/Preferences.tsx`:
```tsx
import { usePrefsStore } from "../store/usePrefsStore";

export default function Preferences() {
  const { prefs, updatePrefs } = usePrefsStore();

  return (
    <div className="p-6 flex flex-col gap-6 max-w-md">
      <h2 className="text-lg font-semibold">환경설정</h2>

      <section className="flex flex-col gap-4">
        <h3 className="font-medium text-gray-700">표시</h3>
        <label className="flex items-center justify-between">
          <span>글자 크기 ({prefs.fontSize}px)</span>
          <input type="range" min={14} max={40} value={prefs.fontSize}
            onChange={(e) => updatePrefs({ fontSize: +e.target.value })} />
        </label>
        <label className="flex items-center justify-between">
          <span>줄 간격 ({prefs.lineHeight})</span>
          <input type="range" min={12} max={20} value={Math.round(prefs.lineHeight * 10)}
            onChange={(e) => updatePrefs({ lineHeight: +e.target.value / 10 })} />
        </label>
        <label className="flex items-center justify-between">
          <span>기본 투명도 ({Math.round(prefs.opacity * 100)}%)</span>
          <input type="range" min={40} max={100} value={Math.round(prefs.opacity * 100)}
            onChange={(e) => updatePrefs({ opacity: +e.target.value / 100 })} />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={prefs.highlightCurrentParagraph}
            onChange={(e) => updatePrefs({ highlightCurrentParagraph: e.target.checked })} />
          <span>현재 단락 하이라이트</span>
        </label>
        <label className="flex items-center gap-2">
          <span>테마</span>
          <select value={prefs.theme} onChange={(e) => updatePrefs({ theme: e.target.value as "dark" | "light" })}>
            <option value="dark">다크</option>
            <option value="light">라이트</option>
          </select>
        </label>
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-medium text-gray-700">단축키</h3>
        {(["next", "prev", "jump", "search", "toggle"] as const).map((key) => (
          <label key={key} className="flex items-center justify-between">
            <span className="text-sm text-gray-600">{key}</span>
            <input
              className="border rounded px-2 py-1 text-sm font-mono w-32"
              value={prefs.hotkeys[key]}
              onChange={(e) => updatePrefs({ hotkeys: { ...prefs.hotkeys, [key]: e.target.value } })}
            />
          </label>
        ))}
      </section>
    </div>
  );
}
```

- [ ] **Step 2: EditorApp에 탭 추가**

EditorApp 상단에 탭 UI 추가 (카드 편집 / 환경설정).

- [ ] **Step 3: Commit**

```bash
git add src/editor/Preferences.tsx src/editor/EditorApp.tsx
git commit -m "feat(editor): add Preferences tab with font, theme, and hotkey settings"
```

---

## Phase 5 — Polish

> **목표:** 시스템 트레이, Import/Export, 오버레이 위치 저장, 앱 아이콘.

### Task 5-1: 시스템 트레이 (PRD F-05)

**Files:**
- Modify: `src-tauri/src/main.rs`

- [ ] **Step 1: main.rs에 트레이 설정**

`src-tauri/src/main.rs`:
```rust
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, Runtime,
};

fn setup_tray<R: Runtime>(app: &tauri::App<R>) -> tauri::Result<()> {
    let show_hide = MenuItem::with_id(app, "toggle_overlay", "Show/Hide Overlay", true, None::<&str>)?;
    let open_editor = MenuItem::with_id(app, "open_editor", "Open Editor", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_hide, &open_editor, &quit])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "toggle_overlay" => {
                if let Some(w) = app.get_webview_window("overlay") {
                    if w.is_visible().unwrap_or(false) {
                        let _ = w.hide();
                    } else {
                        let _ = w.show();
                    }
                }
            }
            "open_editor" => {
                if let Some(w) = app.get_webview_window("editor") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}
```

- [ ] **Step 2: lib.rs setup에서 setup_tray 호출**

- [ ] **Step 3: 트레이 동작 확인**

수동 검증: 메뉴바 아이콘 우클릭 → 메뉴 3개 확인 → 각 동작 검증.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/main.rs src-tauri/src/lib.rs
git commit -m "feat(tray): add system tray with show/hide overlay, open editor, quit"
```

---

### Task 5-2: 오버레이 위치/크기 자동 저장

**Files:**
- Modify: `src/overlay/OverlayApp.tsx`
- Modify: `src-tauri/src/commands/window.rs`

- [ ] **Step 1: window.rs에 set_overlay_position 커맨드 추가**

`src-tauri/src/commands/window.rs`:
```rust
#[tauri::command]
pub async fn set_overlay_bounds(
    app: tauri::AppHandle,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    if let Some(overlay) = app.get_webview_window("overlay") {
        overlay
            .set_position(tauri::PhysicalPosition::new(x as i32, y as i32))
            .map_err(|e| e.to_string())?;
        overlay
            .set_size(tauri::PhysicalSize::new(width as u32, height as u32))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
```

- [ ] **Step 2: OverlayApp에서 drag-end 시 위치 저장**

```tsx
import { getCurrentWindow } from "@tauri-apps/api/window";

// useEffect 내에서
const win = getCurrentWindow();
const unlisten2 = await win.onMoved(({ payload: pos }) => {
  usePrefsStore.getState().updatePrefs({
    overlayX: pos.x,
    overlayY: pos.y,
  });
});
const unlisten3 = await win.onResized(({ payload: size }) => {
  usePrefsStore.getState().updatePrefs({
    overlayWidth: size.width,
    overlayHeight: size.height,
  });
});
```

- [ ] **Step 3: 앱 시작 시 저장된 위치 복원 (lib.rs setup)**

`setup()` 내에서 파일을 직접 읽어 복원 (`read_prefs` 커맨드는 async라 setup에서 직접 호출 불가):

```rust
// lib.rs setup 내부
let app_dir = app.path().app_data_dir().unwrap();
let prefs_path = app_dir.join("preferences.json");
if prefs_path.exists() {
    if let Ok(content) = std::fs::read_to_string(&prefs_path) {
        if let Ok(prefs) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(overlay) = app.get_webview_window("overlay") {
                let x = prefs["overlayX"].as_f64().unwrap_or(0.0) as i32;
                let y = prefs["overlayY"].as_f64().unwrap_or(0.0) as i32;
                let w = prefs["overlayWidth"].as_f64().unwrap_or(480.0) as u32;
                let h = prefs["overlayHeight"].as_f64().unwrap_or(160.0) as u32;
                overlay.set_position(tauri::PhysicalPosition::new(x, y)).ok();
                overlay.set_size(tauri::PhysicalSize::new(w, h)).ok();
            }
        }
    }
}
```

- [ ] **Step 4: Commit**

```bash
git add src-tauri/ src/overlay/
git commit -m "feat: persist overlay position and size on move/resize"
```

---

### Task 5-3: Import/Export JSON (PRD F-04)

**Files:**
- Modify: `src/editor/EditorApp.tsx`

- [ ] **Step 1: Export 함수 작성**

```tsx
import { save, open } from "@tauri-apps/plugin-dialog";
import { writeTextFile, readTextFile } from "@tauri-apps/plugin-fs";

async function exportCards() {
  const cards = useCardStore.getState().cards;
  const path = await save({ filters: [{ name: "JSON", extensions: ["json"] }] });
  if (path) {
    await writeTextFile(path, JSON.stringify(cards, null, 2));
  }
}

async function importCards() {
  const path = await open({ filters: [{ name: "JSON", extensions: ["json"] }] });
  if (!path || typeof path !== "string") return;
  const content = await readTextFile(path);
  const imported: Card[] = JSON.parse(content);
  const mode = confirm("기존 카드를 교체할까요? (취소: 병합)") ? "replace" : "merge";
  const existing = useCardStore.getState().cards;
  const result = mode === "replace" ? imported : [...existing, ...imported];
  await invoke("write_cards", { cards: result });
}
```

- [ ] **Step 2: dialog 플러그인 추가**

```bash
pnpm tauri add dialog
```

- [ ] **Step 3: EditorApp 툴바에 Import/Export 버튼 추가**

- [ ] **Step 4: Commit**

```bash
git add src/editor/
git commit -m "feat(editor): add card JSON import and export"
```

---

### Task 5-4: 앱 아이콘 및 최종 빌드 검증

**Files:**
- Modify: `src-tauri/icons/` (아이콘 파일)

- [ ] **Step 1: 아이콘 생성**

```bash
# 1024x1024 PNG를 icons/ 폴더에 준비 후:
pnpm tauri icon path/to/icon.png
```
Expected: `src-tauri/icons/` 에 모든 사이즈 자동 생성.

- [ ] **Step 2: Universal Binary 빌드**

```bash
pnpm tauri build --target universal-apple-darwin
```
Expected: `src-tauri/target/universal-apple-darwin/release/bundle/macos/` 에 `.app` 생성.

- [ ] **Step 3: 최종 통합 검증 체크리스트**

- [ ] Zoom 전체화면 위에 오버레이 표시 확인
- [ ] Overlay 클릭 시 Zoom 포커스 유지 확인
- [ ] `Ctrl+Right` / `Ctrl+Left`로 카드 전환 확인
- [ ] Editor에서 카드 저장 → Overlay 실시간 반영 확인
- [ ] 앱 재시작 후 카드 목록 및 오버레이 위치 복원 확인
- [ ] 메뉴바 트레이 Show/Hide/Quit 동작 확인
- [ ] Import/Export JSON 라운드트립 확인
- [ ] Accessibility 권한 없을 때 경고 배너 표시 확인

- [ ] **Step 4: 최종 Commit**

```bash
git add .
git commit -m "feat: complete interview-prompter v1 — all phases implemented"
```

---

## 참고 문서

- `docs/PRD.md` — 기능 스펙 전체
- `docs/architecture.md` — 파일 구조, 데이터 모델, 기술 스택
- `docs/decisions/ADR-001` — 포커스 비탈취
- `docs/decisions/ADR-002` — Zoom 전체화면 오버레이
- `docs/decisions/ADR-003` — 투명 창 드래그
- `docs/decisions/ADR-004` — 크로스 윈도우 상태 동기화
- `docs/decisions/ADR-005` — Accessibility 권한
- `docs/decisions/ADR-007` — 앱 번들 설정
