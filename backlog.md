# Feature Backlog

## Phase 1 — Core Shell
- [ ] Tauri 2 + React + TS 프로젝트 bootstrap
- [ ] Overlay 창 (frameless, transparent, alwaysOnTop)
- [ ] Editor 창 (native titlebar overlay)
- [ ] NSWindow floating level 설정 (ADR-002)
- [ ] NSNonactivatingPanel 설정 (ADR-001)
- [ ] Drag handle (`data-tauri-drag-region`)

## Phase 2 — Data Layer
- [ ] `read_cards` / `write_cards` Tauri commands
- [ ] `read_prefs` / `write_prefs` Tauri commands
- [ ] Zustand 스토어 초기 hydrate
- [ ] 카드 CRUD (생성, 수정, 삭제)
- [ ] 설정 저장/불러오기

## Phase 3 — Navigation
- [ ] Accessibility 권한 체크 + 경고 배너
- [ ] 글로벌 단축키: 다음 카드 (`Ctrl+Right`)
- [ ] 글로벌 단축키: 이전 카드 (`Ctrl+Left`)
- [ ] 글로벌 단축키: 오버레이 토글 (`Cmd+Shift+P`)
- [ ] Jump-to-index 다이얼로그 (`Cmd+G`)
- [ ] Fuzzy 검색 다이얼로그 (`Cmd+F`)


## Phase 4 — Reading UX
- [ ] 글꼴 크기 슬라이더 (14–40px)
- [ ] 줄 간격 설정 (1.2–2.0)
- [ ] 현재 단락 하이라이트
- [ ] `[Space]` 키로 단락 이동 (overlay 로컬 바인딩, Accessibility 권한 불필요)
- [ ] 카드 전환 시 스크롤 상단 이동
- [ ] 투명도 슬라이더 (0.4–1.0)
- [ ] 다크/라이트 테마 토글
- [ ] 설정 변경 시 Overlay 즉시 반영 (→ ADR-004 `prefs-updated` 이벤트)

## Phase 5 — Polish
- [ ] 시스템 트레이 (메뉴바 아이콘)
- [ ] 카드 JSON 내보내기
- [ ] 카드 JSON 가져오기 (병합/교체 선택)
- [ ] 오버레이 위치/크기 자동 저장
- [ ] 앱 아이콘 (.icns)

## v2 Roadmap
- [ ] 화면 공유 감지 → 오버레이 자동 숨김 (ADR-006)
- [ ] 카드 본문 Markdown 지원
- [ ] 단락 자동 진행 타이머
- [ ] Notarization (공개 배포)
