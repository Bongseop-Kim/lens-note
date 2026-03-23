mod commands;

use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    use tauri::menu::{Menu, MenuItem};
    use tauri::tray::TrayIconBuilder;

    let show_hide = MenuItem::with_id(app, "toggle_overlay", "Show/Hide Overlay", true, None::<&str>)?;
    let open_editor = MenuItem::with_id(app, "open_editor", "Open Editor", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_hide, &open_editor, &quit])?;

    TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "toggle_overlay" => {
                if let Some(w) = app.get_webview_window("overlay") {
                    if w.is_visible().unwrap_or(false) {
                        let _ = w.hide();
                    } else {
                        let _ = w.show();
                    }
                }
            }
            "open_editor" => {
                if let Some(w) = app.get_webview_window("editor") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                app.handle().plugin(tauri_plugin_macos_permissions::init())?;
                commands::window::configure_overlay_window(&app.handle());
            }

            setup_tray(app)?;

            let handle = app.handle().clone();
            app.handle()
                .plugin(
                    tauri_plugin_global_shortcut::Builder::new()
                        .with_handler(move |_app, shortcut, event| {
                            if event.state() == ShortcutState::Released {
                                return;
                            }
                            handle.emit("hotkey-fired", shortcut.id()).ok();
                        })
                        .build(),
                )
                .unwrap();

            app.global_shortcut().register("Ctrl+Right").unwrap();
            app.global_shortcut().register("Ctrl+Left").unwrap();
            app.global_shortcut().register("Ctrl+Shift+P").unwrap();
            app.global_shortcut().register("Ctrl+G").unwrap();
            app.global_shortcut().register("Ctrl+F").unwrap();

            // 저장된 오버레이 위치/크기 복원
            let app_dir = app.path().app_data_dir().unwrap();
            let prefs_path = app_dir.join("preferences.json");
            if prefs_path.exists() {
                if let Ok(content) = std::fs::read_to_string(&prefs_path) {
                    if let Ok(prefs) = serde_json::from_str::<serde_json::Value>(&content) {
                        if let Some(overlay) = app.get_webview_window("overlay") {
                            let x = prefs["overlayX"].as_f64().unwrap_or(0.0) as i32;
                            let y = prefs["overlayY"].as_f64().unwrap_or(0.0) as i32;
                            let w = prefs["overlayWidth"].as_f64().unwrap_or(480.0) as u32;
                            let h = prefs["overlayHeight"].as_f64().unwrap_or(160.0) as u32;
                            overlay.set_position(tauri::PhysicalPosition::new(x, y)).ok();
                            overlay.set_size(tauri::PhysicalSize::new(w, h)).ok();
                        }
                    }
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::cards::read_cards,
            commands::cards::write_cards,
            commands::preferences::read_prefs,
            commands::preferences::write_prefs,
            commands::window::set_overlay_bounds,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
