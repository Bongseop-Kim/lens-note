# Implementation Phases

## Phase 1 — Core Shell

> macOS 검증 필수

- [x] `create-tauri-app` bootstrap with React+TS template
- [x] Two windows configured (`overlay`, `editor`) in `tauri.conf.json`
- [x] Transparent frameless overlay renders "Hello" text
- [x] `NSWindow.level` floating 설정 (→ ADR-002)
- [x] `NSNonactivatingPanel` 설정 (→ ADR-001)
- [x] Draggable overlay via `data-tauri-drag-region`
- [x] **[검증 체크포인트]** Zoom 실행 후 오버레이가 위에 뜨고, 클릭해도 Zoom 포커스 유지되는지 확인

## Phase 2 — Data Layer

- [ ] `cards.rs` command: `read_cards`, `write_cards`
- [ ] `preferences.rs` command: `read_prefs`, `write_prefs`
- [ ] Zustand store hydrated from Tauri command on app start
- [ ] CRUD operations in Editor window
- [ ] Preferences persistence

## Phase 3 — Navigation

> 권한 처리 포함

- [ ] Accessibility 권한 체크 로직 (→ ADR-005)
- [ ] 권한 없을 시 Editor 경고 배너 + "설정 열기" 버튼
- [ ] Global hotkey 등록 (`next` / `prev` / `toggle`)
- [ ] Overlay card change via Tauri event (→ ADR-004)
- [ ] Jump-to-index dialog (`Cmd+G`)
- [ ] Fuzzy search dialog (`Cmd+F`)

## Phase 4 — Reading UX

- [ ] Font size / line height CSS vars wired to preferences
- [ ] Paragraph highlight on active `<p>`
- [ ] `[Space]` key → advance to next paragraph (overlay-local `keydown` listener, Accessibility 권한 불필요)
- [ ] Scroll to top on card switch
- [ ] Opacity control slider in [⚙] popup
- [ ] Dark/light theme toggle
- [ ] Preferences sync to Overlay via `prefs-updated` event (→ ADR-004)

## Phase 5 — Polish

- [ ] System tray (show/hide overlay, open editor, quit)
- [ ] Import/Export JSON (cards)
- [ ] Window position/size persistence on drag-end
- [ ] App icon (macOS `.icns`)
