# ADR-002: Zoom 전체화면 위에 오버레이 표시

- **Status**: Accepted
- **Date**: 2026-03-22

## Problem
Tauri `alwaysOnTop: true`만으론 Zoom 전체화면 모드에서 오버레이가 묻힘.
macOS는 전체화면 앱에 별도 Space를 할당하므로, window level 단독으로는 Space 경계를 넘지 못함.

## Root Cause
Window Level은 **같은 Space 내** 레이어 순서만 제어.
Zoom 전체화면 = 전용 Space → level을 아무리 높여도(1000+도) 다른 Space이면 무효.
핵심 해결책은 level이 아닌 **`NSWindowCollectionBehavior`** 플래그.

> 높은 level(1000+) 사용은 Sandbox entitlement 문제를 유발할 수 있어 지양.

## Decision
`setLevel(Floating)` + `canJoinAllSpaces` + `fullScreenAuxiliary` 조합으로 해결.

## Implementation

```rust
// src-tauri/src/commands/window.rs
#[cfg(target_os = "macos")]
pub fn set_overlay_window_behavior(app: &tauri::AppHandle) {
    use objc2::runtime::AnyObject;
    use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior, NSWindowLevel};

    let overlay = app.get_webview_window("overlay").unwrap();
    let ns_window_ptr = overlay.ns_window().unwrap() as *mut AnyObject;
    let ns_window = unsafe { &*(ns_window_ptr as *const NSWindow) };

    unsafe {
        // Level: floating(3)으로 일반 창보다 위 — screensaver level 불필요
        ns_window.setLevel(NSWindowLevel::Floating);

        // 모든 Space에 표시 + 전체화면 Space도 포함
        ns_window.setCollectionBehavior(
            NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorIgnoresCycle,
        );
    }
}
```

**Cargo.toml:**
```toml
[target.'cfg(target_os = "macos")'.dependencies]
objc2 = "0.5"
objc2-app-kit = { version = "0.2", features = ["NSWindow"] }
```

> `cocoa = "0.25"` / `objc = "0.2"` 는 deprecated. `objc2-app-kit`으로 교체.

## CollectionBehavior 플래그 역할

| 플래그 | 역할 |
|--------|------|
| `canJoinAllSpaces` | 모든 Space에 동시 표시 (전체화면 Space 포함) — **핵심** |
| `fullScreenAuxiliary` | 전체화면 앱과 같은 Space에 표시 |
| `stationary` | Exposé/Mission Control 중에도 고정 유지 |
| `ignoresCycle` | Cmd+\` 창 순환 제외 |

## Verification
Zoom을 전체화면으로 열고 오버레이가 위에 뜨는지 확인.
Mission Control 진입 시 오버레이가 고정 유지되는지 확인.
