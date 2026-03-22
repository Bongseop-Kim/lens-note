# Architecture — Interview Prompter

## Process Model

```
┌─────────────────────────────────────────────────┐
│  Tauri Main Process (Rust)                      │
│  ─────────────────────────────────────────────  │
│  • Window management (overlay + editor)         │
│  • Global hotkey registration                   │
│  • File I/O (JSON card storage)                 │
│  • System tray                                  │
└─────────────┬──────────────────────┬────────────┘
              │ tauri invoke          │ tauri invoke
┌─────────────▼──────────┐  ┌────────▼───────────┐
│  Overlay Window        │  │  Editor Window     │
│  (React)               │  │  (React)           │
│  ─────────────────────  │  │  ──────────────── │
│  • Displays 1 card     │  │  • Card list CRUD  │
│  • Prev/Next buttons   │  │  • Font/size prefs │
│  • Card index badge    │  │  • Import/Export   │
│  • Lock/unlock drag    │  │  • Hotkey config   │
└────────────────────────┘  └────────────────────┘
```

---

## Window Configuration (macOS)

### Overlay Window
```json
{
  "label": "overlay",
  "title": "",
  "width": 480,
  "height": 160,
  "decorations": false,
  "transparent": true,
  "alwaysOnTop": true,
  "skipTaskbar": true,
  "resizable": true,
  "focus": false,
  "shadow": false,
  "visibleOnAllWorkspaces": true
}
```

**Notes**
- `shadow: false` 필수 — 투명 창에 macOS 기본 드롭섀도가 붙으면 테두리처럼 보임
- `visibleOnAllWorkspaces: true` — Mission Control에서 Space 전환해도 오버레이가 사라지지 않음
- `NSWindow.level` + `NSWindowCollectionBehavior` 설정 필요 (→ ADR-002)
- 포커스 비탈취: CSS `pointer-events: none` + `ignoresCycle` (→ ADR-001)

### Editor Window
```json
{
  "label": "editor",
  "title": "Interview Prompter — Editor",
  "width": 900,
  "height": 640,
  "decorations": true,
  "titleBarStyle": "overlay",
  "hiddenTitle": true,
  "alwaysOnTop": false
}
```

**Notes**
- `titleBarStyle: "overlay"` — macOS 네이티브 신호등 버튼을 살리면서 콘텐츠 영역을 title bar까지 확장
- `hiddenTitle: true` 함께 사용

---

## Data Model

```typescript
// src/types.ts

interface Card {
  id: string;           // uuid v4
  title: string;        // short label e.g. "자기소개"
  body: string;         // answer text (supports \n paragraphs)
  tags: string[];       // optional: "technical", "hr", etc.
  order: number;        // display order in list
  createdAt: string;    // ISO 8601
  updatedAt: string;
}

interface AppState {
  cards: Card[];
  currentIndex: number;
  preferences: Preferences;
}

interface Preferences {
  fontSize: number;         // default: 22
  lineHeight: number;       // default: 1.7
  opacity: number;          // 0.4 – 1.0, default: 0.85
  overlayWidth: number;
  overlayHeight: number;
  overlayX: number;
  overlayY: number;
  hotkeys: HotkeyConfig;
  theme: "dark" | "light";
  highlightCurrentParagraph: boolean;
  dragLocked: boolean;      // default: true — 인터뷰 중 실수 이동 방지, false일 때만 drag handle 활성화 (→ ADR-001)
}

interface HotkeyConfig {
  next: string;     // default: "Ctrl+Shift+Right"
  prev: string;     // default: "Ctrl+Shift+Left"
  jump: string;     // default: "Cmd+G"
  search: string;   // default: "Cmd+F"
  toggle: string;   // default: "Cmd+Shift+P"
}
```

---

## Storage

```
~/Library/Application Support/interview-prompter/
  cards.json          ← Card[] array
  preferences.json    ← Preferences object
```

Rust side uses `app.path().app_data_dir()` (Tauri 2 Manager trait) → macOS에서 자동으로 `~/Library/Application Support/{bundle_id}/` 로 resolve됨.

---

## Tech Stack

### Rust (Tauri Core)

| Concern | Solution |
|---------|----------|
| Window creation | `tauri::WebviewWindowBuilder` |
| Global hotkeys | `tauri-plugin-global-shortcut` |
| File I/O | `tauri-plugin-fs` + `serde_json` |
| System tray | `tauri::tray::TrayIconBuilder` (코어 크레이트, 별도 플러그인 없음) |
| IPC | `tauri::command` (invoke) |
| macOS NSWindow | `objc2 = "0.5"`, `objc2-app-kit = "0.2"` |
| macOS 권한 체크 | `tauri-plugin-macos-permissions` |

### Frontend (React + TS)

| Concern | Solution |
|---------|----------|
| State management | Zustand |
| Styling | Tailwind CSS v3 |
| Drag-and-drop | `@dnd-kit/sortable` |
| Fuzzy search | `fuse.js` |
| Icons | `lucide-react` |
| Build | Vite |

### Why Tauri 2 over Electron
- Binary size: ~8MB vs ~120MB
- Memory: ~30MB vs ~150MB
- macOS 네이티브 API (NSWindow) 직접 접근 가능
- Universal Binary 빌드 지원 (Apple Silicon + Intel 동시)

---

## File Structure

멀티윈도우는 **방법 A (창별 HTML 분리)** 를 사용한다.
각 창이 독립된 HTML 진입점을 가지며, Vite 멀티페이지 빌드로 처리한다.

```
interview-prompter/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs              # App bootstrap, tray setup
│   │   ├── commands/
│   │   │   ├── cards.rs         # read_cards, write_cards
│   │   │   ├── preferences.rs   # read_prefs, write_prefs
│   │   │   └── window.rs        # set_overlay_position, set_opacity, NSWindow setup
│   │   └── lib.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/
│   ├── overlay/
│   │   ├── main.tsx             # ReactDOM.createRoot → <OverlayApp />
│   │   ├── OverlayApp.tsx       # Root for overlay window
│   │   ├── CardDisplay.tsx      # Main card renderer
│   │   ├── NavBar.tsx           # Prev/Next + index
│   │   └── DragHandle.tsx
│   ├── editor/
│   │   ├── main.tsx             # ReactDOM.createRoot → <EditorApp />
│   │   ├── EditorApp.tsx        # Root for editor window
│   │   ├── CardList.tsx
│   │   ├── CardDetail.tsx
│   │   └── Preferences.tsx
│   ├── store/
│   │   ├── useCardStore.ts      # Zustand: cards + currentIndex
│   │   └── usePrefsStore.ts     # Zustand: preferences
│   ├── types.ts
│   └── utils/
│       ├── search.ts            # fuse.js wrapper
│       └── hotkeys.ts           # hotkey string helpers
├── overlay.html                 # overlay 창 진입점 → src/overlay/main.tsx
├── editor.html                  # editor 창 진입점 → src/editor/main.tsx
├── vite.config.ts
├── package.json
└── README.md
```

### Vite 멀티페이지 설정

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        overlay: resolve(__dirname, "overlay.html"),
        editor: resolve(__dirname, "editor.html"),
      },
    },
  },
});
```

### tauri.conf.json 창별 URL 연결

```json
{
  "app": {
    "windows": [
      {
        "label": "overlay",
        "url": "overlay.html",
        ...
      },
      {
        "label": "editor",
        "url": "editor.html",
        ...
      }
    ]
  }
}
```

> `tauri dev` 시에는 Vite dev server URL에 경로를 붙여 사용 (`http://localhost:1420/overlay.html`).
> `tauri build` 시에는 빌드된 정적 파일을 참조.
