# Interview Prompter — AI Rules

## Project
- **Name**: interview-prompter
- **Stack**: Tauri 2 + React + TypeScript
- **Platform**: macOS only (Ventura 13+, Universal Binary)

## Key Docs
- Product requirements → `docs/PRD.md`
- Architecture & data model → `docs/architecture.md`
- Key decisions (ADRs) → `docs/decisions/`
- Implementation phases → `thoughts/plans/implementation-phases.md`
- Feature backlog → `backlog.md`

## Rules
1. macOS-only code must be gated with `#[cfg(target_os = "macos")]`
2. Do not add dependencies outside `docs/architecture.md#tech-stack` without noting rationale in `docs/decisions/`
3. Follow file structure in `docs/architecture.md#file-structure` exactly
4. Use data types from `docs/architecture.md#data-model` verbatim
5. Cross-window state sync must go through Rust backend (see ADR-004)
6. Overlay window must never steal focus from Zoom/Meet (see ADR-001)

## Build Commands
```bash
pnpm tauri dev                                      # 개발
pnpm tauri build --target universal-apple-darwin    # 프로덕션
```
