# ADR-007: 앱 번들 설정 (코드사이닝 & 권한)

- **Status**: Accepted
- **Date**: 2026-03-22

## Problem
macOS 배포 시 코드사이닝, 권한 선언 필요. 개발 중과 배포 시 요구사항이 다름.

## Decision

### 개발 중
`tauri dev`로 실행 — 코드사이닝 불필요.

### 개인 배포
`tauri build --target universal-apple-darwin` → 코드사이닝 없이 직접 빌드 가능.
수령인이 최초 실행 시 "개발자를 확인할 수 없음" 경고 → Gatekeeper 우회 방법 안내 필요.

### 공개 배포 (v2)
Apple Developer 계정 필요 (연 $99). Notarization 필수.

## Required Info.plist Entries

```xml
<!-- src-tauri/Info.plist -->
<key>NSAccessibilityUsageDescription</key>
<string>키보드 단축키 사용을 위해 손쉬운 사용 권한이 필요합니다.</string>
```

## Universal Binary
```bash
pnpm tauri build --target universal-apple-darwin
```
Apple Silicon + Intel 동시 지원 단일 바이너리 생성.
