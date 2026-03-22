#[cfg(target_os = "macos")]
pub fn configure_overlay_window(app: &tauri::AppHandle) {
    use objc2::msg_send;
    use objc2_app_kit::{NSFloatingWindowLevel, NSWindow, NSWindowCollectionBehavior};
    use tauri::Manager;

    let Some(overlay) = app.get_webview_window("overlay") else {
        eprintln!("configure_overlay_window: 'overlay' window not found");
        return;
    };
    let ns_window_ptr = match overlay.ns_window() {
        Ok(ptr) => ptr,
        Err(e) => {
            eprintln!("configure_overlay_window: ns_window() failed: {e}");
            return;
        }
    };
    let ns_window: &NSWindow = unsafe { &*ns_window_ptr.cast() };

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

        // key window 차단 → drag handle 클릭해도 Zoom 포커스 유지 (ADR-001)
        let _: () = msg_send![ns_window, setCanBecomeKeyWindow: false];
    }
}
