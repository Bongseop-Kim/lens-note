use tauri::Manager;

#[cfg(target_os = "macos")]
pub fn configure_overlay_window(app: &tauri::AppHandle) {
    use objc2_app_kit::{NSFloatingWindowLevel, NSWindow, NSWindowCollectionBehavior};

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
    }
}

#[tauri::command]
pub async fn set_overlay_bounds(
    app: tauri::AppHandle,
    x: f64,
    y: f64,
    width: f64,
    height: f64,
) -> Result<(), String> {
    if let Some(overlay) = app.get_webview_window("overlay") {
        overlay
            .set_position(tauri::PhysicalPosition::new(x as i32, y as i32))
            .map_err(|e| e.to_string())?;
        overlay
            .set_size(tauri::PhysicalSize::new(width as u32, height as u32))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
