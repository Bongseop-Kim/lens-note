use tauri::Manager;

fn validated_i32(value: f64, field: &str) -> Result<i32, String> {
    if !value.is_finite() {
        return Err(format!("{field} must be a finite number"));
    }
    if value < i32::MIN as f64 || value > i32::MAX as f64 {
        return Err(format!(
            "{field} must be between {} and {}",
            i32::MIN,
            i32::MAX
        ));
    }
    Ok(value as i32)
}

fn validated_u32(value: f64, field: &str) -> Result<u32, String> {
    if !value.is_finite() {
        return Err(format!("{field} must be a finite number"));
    }
    if value < 0.0 {
        return Err(format!("{field} must be non-negative"));
    }
    if value > u32::MAX as f64 {
        return Err(format!("{field} must be at most {}", u32::MAX));
    }
    Ok(value as u32)
}

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
        let validated_x = validated_i32(x, "x")?;
        let validated_y = validated_i32(y, "y")?;
        let validated_width = validated_u32(width, "width")?;
        let validated_height = validated_u32(height, "height")?;

        overlay
            .set_position(tauri::PhysicalPosition::new(validated_x, validated_y))
            .map_err(|e| e.to_string())?;
        overlay
            .set_size(tauri::PhysicalSize::new(validated_width, validated_height))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorInfo {
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    pub scale_factor: f64,
}

#[tauri::command]
pub fn get_monitors(app: tauri::AppHandle) -> Result<Vec<MonitorInfo>, String> {
    Ok(app
        .available_monitors()
        .map_err(|e| format!("Failed to enumerate monitors: {e}"))?
        .into_iter()
        .map(|m| {
            let size = m.size();
            let pos = m.position();
            MonitorInfo {
                name: m.name().map_or("Monitor", |v| v).to_string(),
                width: size.width,
                height: size.height,
                x: pos.x as i32,
                y: pos.y as i32,
                scale_factor: m.scale_factor(),
            }
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn monitor_info_logical_size() {
        // Direct struct construction — verifies field layout and serde derive compile
        // width/height/x/y are physical pixels; scale_factor is exported separately.
        let info = MonitorInfo {
            name: "Test".to_string(),
            width: 1920,
            height: 1080,
            x: 0,
            y: 0,
            scale_factor: 2.0,
        };
        assert_eq!(info.width, 1920);
        assert_eq!(info.scale_factor, 2.0);
        // logical size = physical / scale_factor
        let logical_w = (info.width as f64 / info.scale_factor) as u32;
        assert_eq!(logical_w, 960);
    }
}
