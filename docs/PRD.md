# Product Requirements Document — Interview Prompter

## Problem Statement

### Context
Job candidates in video interviews need to reference prepared answers without obviously looking away from the camera. Existing solutions (sticky notes, another monitor) cause visible gaze deviation.

### Core Need
A desktop overlay that sits **directly below the webcam lens**, showing answer snippets that can be switched **instantly via keyboard** — minimizing eye movement and maximizing naturalness.

### Non-Goals
- Not a general-purpose note-taking app
- Not a teleprompter with auto-scrolling motor (manual control only)
- Not cloud-synced (local storage only, v1)

---

## User Story Map

```
BEFORE INTERVIEW
  └─ Setup phase
       ├─ Create/edit answer cards (Q&A pairs)
       ├─ Reorder cards to match expected question order
       └─ Position overlay window below camera

DURING INTERVIEW
  └─ Active phase
       ├─ Interviewer asks question
       ├─ User presses [→] or hotkey to jump to matching card
       ├─ Glance at card while appearing to look at camera
       └─ Press [→] to advance or [←] to go back

AFTER INTERVIEW
  └─ Review phase
       └─ Edit cards for next session
```

---

## Feature Spec

### F-01: Overlay Window

**Behavior**
- Frameless, transparent background
- `always_on_top = true` — cannot be buried by browser or Zoom
- Draggable via custom drag region (top strip, 24px)
- Resize handles on right/bottom edges
- Window position/size persisted on every drag-end

**Visual Layout**
```
┌──────────────────────── drag handle ─────────────────┐
│  [←]  3 / 12  자기소개                         [✕][⚙] │
├──────────────────────────────────────────────────────┤
│                                                      │
│  안녕하세요. 저는 5년간 프론트엔드 개발을             │
│  해온 김봉섭입니다. 최근에는 React Native와           │
│  ▶ 디자인 시스템 구축에 집중하고 있습니다.           │
│                                                      │
│  [→ Next]                                            │
└──────────────────────────────────────────────────────┘
```

**Opacity Control**
- Slider accessible via [⚙] icon popup
- CSS `background: rgba(0,0,0, opacity)` on container div

---

### F-02: Card Navigation

**Keyboard (global hotkeys — work even when overlay not focused)**

| Key | Action |
|-----|--------|
| `Ctrl+Shift+Right` | Next card |
| `Ctrl+Shift+Left` | Prev card |
| `Cmd+G` | Jump-to dialog (type number → Enter) |
| `Cmd+F` | Search dialog (fuzzy match on title+body) |
| `Cmd+Shift+P` | Toggle overlay visibility |

> Accessibility 권한 필요. 권한 거부 시 Editor에 경고 배너 표시. (→ ADR-005)

---

### F-03: Reading Optimization

| Feature | Implementation |
|---------|----------------|
| Large font | `font-size` CSS var, default 22px, range 14–40 |
| Line height | `line-height` CSS var, default 1.7 |
| Paragraph highlight | Track paragraph index by scroll position, highlight active `<p>` |
| Scroll on nav | On card switch → scroll to top automatically |
| Dark mode | Default dark (black bg, white text) for low visual distraction |

**Paragraph Highlight Logic**
```typescript
// Detect which paragraph is most visible in viewport
// Apply .active class → different bg color
// Advance paragraph with [Space] key (overlay binding)
```

---

### F-04: Editor Window

**Views**
1. **Card List** — sortable list, click to edit
2. **Card Detail** — textarea for body, input for title, tag chips
3. **Preferences** — font, hotkeys, opacity defaults

**Import/Export**
- Export: `cards.json` download
- Import: file picker → merge or replace dialog

**Reordering**
- Drag-and-drop (`@dnd-kit/sortable`) or up/down arrow buttons

---

### F-05: System Tray

- Icon always present in macOS menu bar
- Right-click menu:
  - Show/Hide Overlay
  - Open Editor
  - Quit

---

## Open Questions

| # | Question | Default Assumption |
|---|----------|--------------------|
| Q1 | Card body: plain text or markdown? | Plain text v1, markdown v2 |
| Q2 | Max cards limit? | No limit, paginate list at 50 |
| Q3 | Auto-advance timer? | Not in v1 |
| Q4 | Font choice? | SF Pro (macOS 시스템 폰트, 한글 렌더링 최적) |
| Q5 | 배포 방식? | 개인용 → 코드사이닝 없이 직접 빌드. 공개 배포 시 Notarization 필요 |
