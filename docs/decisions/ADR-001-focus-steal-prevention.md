# ADR-001: 포커스 비탈취 (Focus Steal Prevention)

- **Status**: Accepted
- **Date**: 2026-03-22

## Problem
오버레이가 Zoom/Meet 위에 뜨면서도 포커스를 가져오면 안 됨.
클릭 시 Zoom이 비활성화되면 화상통화 상대방에게 이상하게 보일 수 있음.

## Constraints
- **`NSNonactivatingPanelMask`는 `NSPanel` 전용** — Tauri의 overlay window는 NSWindow 기반이므로 적용 불가
- **`NSWindowCollectionBehavior` 자체는 포커스 비탈취와 무관** — Space/Mission Control 제어 전용

## Decision
두 계층으로 분리 대응:
1. **본문 영역**: CSS `pointer-events: none` → 클릭이 아래 앱(Zoom)으로 통과
2. **버튼 영역만**: `pointer-events: auto` 복원 + `NSWindowCollectionBehavior.ignoresCycle` 추가

> **`focusable: false` 제거 이유**: Tauri의 `focusable: false`는 내부적으로 `setCanBecomeKeyWindow: false` + `setCanBecomeMainWindow: false`를 설정하는데, drag handle(`startDragging`)이 key window를 필요로 하므로 drag가 작동하지 않는 회귀를 유발했음. `ignoresCycle` + `pointer-events: none` 조합으로 동일한 포커스 비탈취 효과를 달성하므로 `focusable: false`는 불필요.

완전한 `NSNonactivatingPanel` 동작은 Tauri NSWindow 구조상 지원 불가. 실용적 대안으로 충분.

추가로 **드래그 잠금 기본값 = `true`** 를 적용. 인터뷰 중 실수로 창을 움직이는 문제도 함께 방지하며, 잠금 상태에서는 drag handle의 `pointer-events: none`이 유지되어 `acceptFirstMouse` 충돌 자체가 발생하지 않음.

## Implementation

### CSS 계층 분리
```css
/* overlay 컨테이너 전체 — 클릭 통과 */
.overlay-root {
  pointer-events: none;
}

/* 버튼, 슬라이더만 클릭 활성화 */
.overlay-controls {
  pointer-events: auto;
}
```

### NSWindowCollectionBehavior에 ignoresCycle 추가

`ignoresCycle` 플래그는 ADR-002의 `set_overlay_window_behavior()` 함수 내 `setCollectionBehavior` 호출에 이미 포함되어 있음 (→ ADR-002 참고).
별도 함수를 만들지 않고 ADR-002 구현 하나로 통합.

### focusable 설정 및 포커스 차단 전략

`tauri.conf.json`의 `focusable: false`는 제거됨. 이유: 내부적으로 `setCanBecomeKeyWindow: false` + `setCanBecomeMainWindow: false`를 설정하는데, drag handle(`startDragging`)이 key window를 필요로 하여 drag가 작동하지 않는 회귀를 유발함. (`setCanBecomeKeyWindow:` selector는 TaoWindow에 존재하지 않으며 msg_send 호출 시 런타임 패닉 발생 확인.)

**현재 전략**: `ignoresCycle` + `pointer-events: none`으로 포커스 비탈취 방지. 이 조합으로 실용적 수준에서 충분한 효과 달성.

**향후 검토**: 완전한 key window 차단이 필요한 경우 `objc2::ClassBuilder`로 TaoWindow 서브클래스를 런타임에 등록하여 `canBecomeKeyWindow`를 override하는 방식 검토.

### 드래그 잠금 (Preferences)

```typescript
// Preferences에 dragLocked 추가 (→ architecture.md)
interface Preferences {
  // ... 기존 필드
  dragLocked: boolean;  // default: true
}
```

```tsx
// DragHandle.tsx — dragLocked 상태에 따라 pointer-events 전환
<div
  data-tauri-drag-region
  className="h-6 w-full cursor-move"
  style={{ pointerEvents: dragLocked ? 'none' : 'auto' }}
/>
```

[⚙] 팝업에 "위치 고정 / 해제" 토글 추가. 기본값은 잠금.

## Verification
Zoom 화상통화 열고 오버레이 본문 영역 클릭 → Zoom 타이틀바 색이 유지되면 성공.
버튼 클릭 → 버튼 동작하면서도 Zoom 포커스 유지되면 성공.
드래그 잠금 해제 후 drag handle 드래그 → 창 이동되면서 Zoom 포커스 유지되면 성공.
