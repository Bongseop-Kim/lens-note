#[cfg(target_os = "macos")]
pub fn configure_overlay_window(app: &tauri::AppHandle) {
    use objc2_app_kit::{NSFloatingWindowLevel, NSWindow, NSWindowCollectionBehavior};
    use tauri::Manager;

    let overlay = app.get_webview_window("overlay").unwrap();
    let ns_window: &NSWindow = unsafe { &*overlay.ns_window().unwrap().cast() };

    unsafe {
        // Floating level: 일반 창 위, screensaver 아래 (ADR-002)
        ns_window.setLevel(NSFloatingWindowLevel);

        // 모든 Space + 전체화면 Space에 표시, 포커스 순환 제외 (ADR-001, ADR-002)
        ns_window.setCollectionBehavior(
            NSWindowCollectionBehavior::CanJoinAllSpaces
                | NSWindowCollectionBehavior::FullScreenAuxiliary
                | NSWindowCollectionBehavior::Stationary
                | NSWindowCollectionBehavior::IgnoresCycle,
        );
    }
}
