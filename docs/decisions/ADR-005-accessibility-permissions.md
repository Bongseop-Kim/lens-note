# ADR-005: Accessibility 권한 요청

- **Status**: Accepted
- **Date**: 2026-03-22

## Problem
글로벌 단축키는 macOS Accessibility 권한 없이는 동작하지 않음.
권한 거부 시 핫키가 무음 실패 — 사용자가 이유를 모름.

## Constraints
- `tauri-plugin-global-shortcut`은 권한 체크 기능을 **내장하지 않음**. 권한 없으면 단축키 등록 자체는 성공하지만 발동이 무음 실패.
- macOS는 Accessibility 권한을 앱이 직접 "grant"할 수 없음 — 항상 System Settings에서 사용자가 수동 토글.

## Decision
`tauri-plugin-macos-permissions`로 앱 시작 시 권한 체크 → 없으면 Editor에 배너 표시.

## Implementation

**의존성 추가:**
```bash
cargo add tauri-plugin-macos-permissions
pnpm add tauri-plugin-macos-permissions-api
```

**Rust 등록 (`lib.rs`):**
```rust
tauri::Builder::default()
    .plugin(tauri_plugin_macos_permissions::init())
    // ...
```

**capability 추가 (`capabilities/default.json`):**
```json
{ "permissions": ["macos-permissions:default"] }
```

**Frontend 권한 체크 흐름:**
```typescript
import {
  checkAccessibilityPermission,
  requestAccessibilityPermission,
} from "tauri-plugin-macos-permissions-api";

// 앱 시작 시 체크
const granted = await checkAccessibilityPermission();
if (!granted) {
  // Editor에 배너 표시
  showAccessibilityBanner();
}

// 배너 [설정 열기] 클릭 시
async function openAccessibilitySettings() {
  await requestAccessibilityPermission(); // System Settings로 유도
  // 사용자가 설정 후 앱으로 돌아오면 재확인
  const nowGranted = await checkAccessibilityPermission();
  if (nowGranted) hideAccessibilityBanner();
}
```

**배너 UX:**
```
"단축키를 사용하려면 손쉬운 사용 권한이 필요합니다"  [설정 열기]
```

**Info.plist 추가 필요:**
```xml
<key>NSAccessibilityUsageDescription</key>
<string>키보드 단축키 사용을 위해 손쉬운 사용 권한이 필요합니다.</string>
```

## tauri-plugin-global-shortcut 주의사항

### 이중 초기화 panic
`tauri add global-shortcut` 실행 시 builder chain에 자동 삽입되는 `.plugin(...)` 라인과
`.setup()` 내부 수동 초기화가 겹치면 `"Invalid argument (os error 22)"` panic 발생.

**Fix**: builder chain의 자동 삽입 라인 제거, `.setup()` 내부에서만 초기화.

### 콜백 2회 호출
`Pressed` + `Released` 각각 이벤트 발생 — 의도된 동작.
```typescript
register("Ctrl+Right", (event) => {
  if (event.state === "Released") return;
  // handle...
});
```

## Hotkey Constraints (macOS)
- `Cmd+Tab` 절대 사용 금지 — macOS 시스템 단축키 충돌
- Zoom 기본 단축키(`Cmd+Shift+A` 음소거 등)와 겹치지 않도록 기본값 선정
- 기본값: `Ctrl+Shift+Right` / `Ctrl+Shift+Left`
  - `Ctrl+Right` / `Ctrl+Left`는 macOS 기본 Space 전환 단축키 — 실수로 눌리면 카드 이동과 Space 전환이 동시에 발생하므로 사용하지 않음
  - `Ctrl+Shift+Right/Left`는 macOS 및 Zoom 어디에도 기본 단축키 없음
- Jump/Search/Toggle: `Cmd+G` / `Cmd+F` / `Cmd+Shift+P` (macOS 관례 따름)
