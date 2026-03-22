# Session Context — Interview Prompter

## Project Summary
면접 화상통화 중 카메라 아래에 답변 카드를 표시하는 macOS 데스크탑 오버레이 앱.
Tauri 2 + React + TypeScript. macOS Ventura 13+ 전용. Universal Binary.

## Current Status
- 문서화 완료 (PRD, Architecture, ADRs, Implementation Plan, Backlog)
- 구현 시작 전

## Key Files
```
CLAUDE.md                              ← AI 규칙 (항상 먼저 읽기)
docs/PRD.md                            ← 기능 요구사항
docs/architecture.md                   ← 데이터 모델, 창 설정, 파일 구조
docs/decisions/ADR-00*.md              ← macOS 핵심 결정사항 7개
thoughts/plans/implementation-phases.md ← Phase 1-5 체크리스트
backlog.md                             ← 피처 전체 목록
```

## Critical macOS Constraints (요약)
1. **ADR-001**: 오버레이 클릭 시 Zoom 포커스 유지 → NSWindowCollectionBehavior
2. **ADR-002**: Zoom 전체화면 위 오버레이 → NSWindow.setLevel_(3)
3. **ADR-004**: 창간 상태 동기화 → Rust emit_all 브로드캐스트
4. **ADR-005**: 글로벌 단축키 → Accessibility 권한 필요

## Next Action
Phase 1 시작: `create-tauri-app` bootstrap → `thoughts/plans/implementation-phases.md` Phase 1 체크리스트 참고
