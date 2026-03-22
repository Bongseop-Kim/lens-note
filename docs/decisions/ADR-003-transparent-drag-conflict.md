# ADR-003: 투명 창 + 드래그 충돌

- **Status**: Accepted
- **Date**: 2026-03-22

## Problem
`decorations: false` + `transparent: true` 조합에서 드래그 영역과 클릭 통과 영역 구분이 필요.
투명 픽셀 위에서 `data-tauri-drag-region`이 동작하지 않는 경우 있음.

## Decision
세 영역을 명확히 분리:
- 상단 drag handle (24px): `data-tauri-drag-region` → 드래그
- 텍스트 본문: pointer-events 없음 → 클릭 Zoom으로 통과
- 버튼 영역만: pointer-events 활성화

## Implementation

```tsx
// DragHandle.tsx
// overlay-root에 pointer-events: none이 걸려 있으므로 drag handle에 auto 복원 필수
<div
  data-tauri-drag-region
  className="h-6 w-full cursor-move"
  style={{ pointerEvents: 'auto' }}
/>
```

Tauri 2.x에서 투명 픽셀 위 드래그가 동작하려면 `accept_first_mouse` 설정 필요.

```json
// tauri.conf.json (overlay window)
{
  "acceptFirstMouse": true
}
```

## Verification
오버레이 투명 영역에서 드래그 → 창 이동 확인.
버튼 외 영역 클릭 → Zoom으로 클릭 통과 확인.
