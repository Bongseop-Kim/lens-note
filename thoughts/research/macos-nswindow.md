# macOS NSWindow Research

> Last updated: 2026-03-22 | Verified against Tauri 2.10.x

---

## Window Level Constants

`CGWindowLevel.h` 기준 실제 numeric 값:

| Constant | Value | Description |
|----------|-------|-------------|
| `kCGNormalWindowLevel` | 0 | 일반 창 |
| `kCGFloatingWindowLevel` | 3 | NSFloatingWindowLevel (alwaysOnTop) |
| `kCGDockWindowLevel` | 10 | Dock |
| `kCGMainMenuWindowLevel` | 20 | 메인 메뉴 |
| `kCGStatusWindowLevel` | 21 | NSStatusWindowLevel |
| `kCGPopUpMenuWindowLevel` | 101 | 팝업 메뉴 |
| `kCGOverlayWindowLevel` | 102 | 오버레이 |
| `kCGScreenSaverWindowLevel` | 1000 | 화면 보호기 |
| `kCGAssistiveTechHighWindowLevel` | 1500 | 손쉬운 사용 |

**중요**: `kCGFloatingWindowLevel = 3`은 Zoom 전체화면 위에 뜨기에 **단독으로는 부족**.
→ 이유: Zoom 전체화면은 macOS가 전용 Space를 별도 생성함. Window Level은 같은 Space 내 레이어 순서만 제어하므로, Space 경계를 넘으려면 `NSWindowCollectionBehavior` 설정이 필수.
→ 해결책: Level을 무한정 높이는 것이 아니라 `canJoinAllSpaces` + `fullScreenAuxiliary` 조합 사용.

---

## NSWindowCollectionBehavior

### 플래그별 의미

| 플래그 | 역할 |
|--------|------|
| `canJoinAllSpaces` | **모든 Space에 동시 표시** — 전체화면 Space 포함. 오버레이 핵심 플래그 |
| `fullScreenAuxiliary` | 전체화면 앱과 **같은 Space에 표시**. Zoom 전체화면 위에 뜨려면 필수 |
| `stationary` | Exposé/Mission Control 중에도 **고정 유지** (배경처럼 움직이지 않음) |
| `transient` | Exposé/Mission Control 중 **숨겨짐** (`stationary`와 상호 배타적) |
| `ignoresCycle` | Cmd+\` 창 순환에서 제외 — 항상 뜨는 오버레이에 적합 |

### 오버레이에 권장하는 조합

```rust
use objc2_app_kit::{NSWindowCollectionBehavior, NSWindow};

unsafe {
    let behavior = NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
        | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary
        | NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary
        | NSWindowCollectionBehavior::NSWindowCollectionBehaviorIgnoresCycle;
    ns_window.setCollectionBehavior(behavior);
    ns_window.setLevel(objc2_app_kit::NSWindowLevel::Floating); // 3
}
```

> `NSWindowCollectionBehavior` 자체는 포커스 비탈취와 **무관**. 포커스 제어는 별도 처리 필요 (아래 섹션 참고).

---

## 포커스 비탈취 (Focus Steal Prevention)

### 방법 A — NSPanel + `.nonactivatingPanel` (권장, 표준)

- `NSPanel`(NSWindow 서브클래스)에 `.nonactivatingPanel` style mask 적용
- 창 **init 시점**에만 적용해야 함 — 나중에 추가하면 WindowServer 태그가 동기화되지 않아 무효
- 클릭해도 앱 활성화 없이 key window가 됨 (Spotlight, Alfred, Raycast 패턴)
- **`NSWindow`는 `.nonactivatingPanel`을 지원하지 않음** — NSPanel 전용 플래그

### 방법 B — `ignoresMouseEvents = true`

- 마우스 이벤트 자체를 무시 → 창 아래 앱(Zoom 등)에 통과
- 읽기 전용 HUD에 적합. 버튼 클릭 불가

### Tauri에서의 현실적 접근

Tauri의 overlay window는 NSPanel이 아닌 NSWindow 기반이므로 완벽한 `nonactivatingPanel`은 불가.
대안:
1. 버튼 외 영역에 `pointer-events: none` CSS 적용 → 클릭이 Zoom으로 통과
2. Rust에서 `setIgnoresMouseEvents(true/false)` 토글 — 상호작용 필요 시 on, 읽기 시 off

---

## Rust 의존성 — cocoa 크레이트 폐기

### 현황

`cocoa = "0.25"` 크레이트는 **공식 deprecated**. lib.rs에서 `[not recommended]` 표시.

Tauri 2 내부는 이미 **`objc2` 생태계로 완전 마이그레이션 완료** (PR #10924).

### 권장 교체

```toml
# Cargo.toml
[target.'cfg(target_os = "macos")'.dependencies]
objc2 = "0.5"
objc2-app-kit = { version = "0.2", features = ["NSWindow", "NSPanel"] }
objc2-foundation = "0.2"
```

### objc2-app-kit 사용 예시

```rust
#[cfg(target_os = "macos")]
pub fn configure_overlay(app: &tauri::AppHandle) {
    use objc2::runtime::AnyObject;
    use objc2_app_kit::{NSWindow, NSWindowCollectionBehavior, NSWindowLevel};

    let overlay = app.get_webview_window("overlay").unwrap();
    let ns_window_ptr = overlay.ns_window().unwrap() as *mut AnyObject;
    let ns_window = unsafe { &*(ns_window_ptr as *const NSWindow) };

    unsafe {
        // Zoom 전체화면 위에 표시
        ns_window.setLevel(NSWindowLevel::Floating);

        // 모든 Space + 전체화면 Space 포함
        ns_window.setCollectionBehavior(
            NSWindowCollectionBehavior::NSWindowCollectionBehaviorCanJoinAllSpaces
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorFullScreenAuxiliary
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorStationary
            | NSWindowCollectionBehavior::NSWindowCollectionBehaviorIgnoresCycle,
        );
    }
}
```

> `window.ns_window()` → Tauri 2.10.x 기준 여전히 유효. `*mut c_void` 반환.

---

## accept_first_mouse

투명 창에서 드래그 첫 클릭이 동작하려면 필요.

```json
// tauri.conf.json (overlay window)
{
  "acceptFirstMouse": true
}
```

---

## Zoom Fullscreen 동작 원리 (정정)

기존 문서의 내용 **일부 수정**:

- Zoom 전체화면은 macOS 전용 Space를 생성함 → 맞음
- `alwaysOnTop`만으론 부족 → 맞음
- `NSFloatingWindowLevel(3)` **단독**으로 해결 → **틀림**
- **올바른 해결**: `setLevel(3)` + `canJoinAllSpaces` + `fullScreenAuxiliary` 조합

level을 1000+ 로 높이는 방법은 **Sandbox entitlement 문제** 유발 가능. 권장하지 않음.

---

## Accessibility 권한 체크

### 권장 방법: `tauri-plugin-macos-permissions`

```bash
cargo add tauri-plugin-macos-permissions
pnpm add tauri-plugin-macos-permissions-api
```

```typescript
import {
  checkAccessibilityPermission,
  requestAccessibilityPermission,
} from "tauri-plugin-macos-permissions-api";

// 권한 상태 확인 (side-effect 없음)
const granted = await checkAccessibilityPermission();

// 없으면 System Settings 유도 (직접 grant 불가, 사용자가 수동 토글 필요)
if (!granted) {
  await requestAccessibilityPermission();
}
```

**주의**: `requestAccessibilityPermission()`은 결과를 await할 수 없음.
호출 후 재확인: `checkAccessibilityPermission()`을 polling하거나 앱 재실행 후 재체크.

---

## tauri-plugin-global-shortcut 주의사항

**버전**: 2.3.1 (requires Tauri ^2.8.2)

### 알려진 버그: 이중 초기화 panic

`tauri add global-shortcut` 실행 시 builder chain에 자동 삽입되는 `.plugin(...)` 라인과
`.setup()` 내부 수동 초기화가 겹치면 `"Invalid argument (os error 22)"` panic 발생.

**Fix**: builder chain의 자동 삽입 라인 제거, `.setup()` 내부에서만 초기화.

### 콜백 2회 호출

`Pressed` + `Released` 각각 1회씩 이벤트 발생 → 의도된 동작.

```typescript
register("Ctrl+Right", (event) => {
  if (event.state === "Released") return; // Pressed만 처리
  // handle...
});
```

### Accessibility 권한 미보유 시 동작

플러그인 자체에 권한 체크 로직 없음. 권한 없으면 단축키 무음 실패.
`tauri-plugin-macos-permissions`로 선행 체크 필수.

---

## References

- [Tauri 2 Window Customization](https://v2.tauri.app/learn/window-customization/)
- [docs.rs — tauri::WebviewWindow (2.10.x, apple-darwin)](https://docs.rs/tauri/latest/x86_64-apple-darwin/tauri/webview/struct.WebviewWindow.html)
- [objc2-app-kit NSWindow](https://docs.rs/objc2-app-kit/latest/objc2_app_kit/struct.NSWindow.html)
- [NSWindow.CollectionBehavior — Apple Developer Docs](https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct)
- [NSWindowCollectionBehavior.fullScreenAuxiliary](https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct/fullscreenauxiliary)
- [tauri-plugin-macos-permissions (GitHub)](https://github.com/ayangweb/tauri-plugin-macos-permissions)
- [tauri-plugin-global-shortcut v2 Docs](https://v2.tauri.app/plugin/global-shortcut/)
- [CGWindowLevel.h constants (gist)](https://gist.github.com/rismay/ab10e87dc10a76c25986d52c65441bf2)
- [NSPanel nonactivatingPanel 동작 원리 (philz.blog)](https://philz.blog/nspanel-nonactivating-style-mask-flag/)
- [cocoa crate deprecated (lib.rs)](https://lib.rs/crates/cocoa)
- [tauri-plugin-global-shortcut double-init bug #2540](https://github.com/tauri-apps/plugins-workspace/issues/2540)
