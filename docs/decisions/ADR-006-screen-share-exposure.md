# ADR-006: 화면 공유 시 오버레이 노출

- **Status**: Deferred (v2)
- **Date**: 2026-03-22

## Problem
Zoom 화면 공유 중 오버레이가 상대방 화면에 보일 수 있음.

## Decision

### v1 (현재)
문서화로 대응 — "화면 공유 시 오버레이 숨기기 단축키(`Cmd+Shift+P`) 사용" 안내.

### v2 (Roadmap)
macOS `CGWindowListCreateImage` API로 화면 공유 감지 → 자동 숨김.

## Rationale
v1에서는 개인용 빌드 대상이므로 사용자가 직접 제어 가능. 자동화 로직 추가는 복잡도 대비 효과가 낮음.
