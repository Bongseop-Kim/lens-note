mod commands;

use std::collections::HashMap;
use std::sync::Mutex;

use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::commands::preferences::{HotkeyConfig, Preferences};

#[derive(Default)]
struct HotkeyBindings(Mutex<HashMap<u32, String>>);

const HOTKEY_ACTIONS: [(&str, fn(&HotkeyConfig) -> &str); 5] = [
    ("next", |config| config.next.as_str()),
    ("prev", |config| config.prev.as_str()),
    ("jump", |config| config.jump.as_str()),
    ("search", |config| config.search.as_str()),
    ("toggle", |config| config.toggle.as_str()),
];

pub(crate) fn register_configured_hotkeys(
    app: &tauri::AppHandle,
    config: &HotkeyConfig,
) -> std::result::Result<(), tauri_plugin_global_shortcut::Error> {
    if app
        .try_state::<tauri_plugin_global_shortcut::GlobalShortcut<tauri::Wry>>()
        .is_none()
    {
        eprintln!("Global shortcut plugin is unavailable; skipping hotkey registration");
        return Ok(());
    }

    let bindings = app.state::<HotkeyBindings>();
    let mut stored_bindings = match bindings.0.lock() {
        Ok(guard) => guard,
        Err(_) => {
            eprintln!("Failed to lock hotkey bindings map; skipping hotkey registration");
            return Err(tauri_plugin_global_shortcut::Error::GlobalHotkey(
                "mutex poisoned; hotkey registration skipped".to_string(),
            ));
        }
    };

    app.global_shortcut().unregister_all()?;

    let mut next_bindings = HashMap::new();
    for (action, shortcut_getter) in HOTKEY_ACTIONS {
        let shortcut = shortcut_getter(config).trim();
        if shortcut.is_empty() {
            eprintln!("Skipping empty hotkey for action '{action}'");
            continue;
        }

        match app.global_shortcut().register(shortcut) {
            Ok(()) => {
                if let Ok(parsed) = shortcut.parse::<tauri_plugin_global_shortcut::Shortcut>() {
                    next_bindings.insert(parsed.id(), action.to_string());
                } else {
                    eprintln!("Registered hotkey '{shortcut}' for '{action}' but failed to parse it for event mapping");
                }
            }
            Err(error) => {
                eprintln!("Failed to register hotkey '{shortcut}' for '{action}': {error}");
            }
        }
    }

    *stored_bindings = next_bindings;

    Ok(())
}

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem};
    use tauri::tray::TrayIconBuilder;

    let show_hide = MenuItem::with_id(app, "toggle_overlay", "Show/Hide Overlay", true, None::<&str>)?;
    let open_editor = MenuItem::with_id(app, "open_editor", "Open Editor", true, None::<&str>)?;
    let position = MenuItem::with_id(app, "position", "위치 조정", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_hide, &open_editor, &sep1, &position, &sep2, &quit])?;

    let mut tray_builder = TrayIconBuilder::new()
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
            "position" => {
                if let Some(w) = app.get_webview_window("editor") {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
                let _ = app.emit_to("editor", "navigate-to-position", ());
            }
            "quit" => app.exit(0),
            _ => {}
        });

    if let Some(icon) = app.default_window_icon().cloned() {
        tray_builder = tray_builder.icon(icon);
    } else {
        eprintln!("Skipping tray icon image because no default window icon is configured");
    }

    if let Err(error) = tray_builder.build(app) {
        eprintln!("Failed to build tray icon: {error}");
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(HotkeyBindings::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                if let Err(error) = app.handle().plugin(tauri_plugin_macos_permissions::init()) {
                    eprintln!("Failed to initialize tauri-plugin-macos-permissions: {error}");
                }
                commands::window::configure_overlay_window(&app.handle());
            }

            if let Err(error) = setup_tray(app) {
                eprintln!("Failed to set up tray: {error}");
            }

            // Hide the editor window on close instead of destroying it so that
            // "Open Editor" from the tray can always show it again.
            if let Some(editor) = app.get_webview_window("editor") {
                let editor_handle = editor.clone();
                editor.on_window_event(move |event| {
                    if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                        api.prevent_close();
                        let _ = editor_handle.hide();
                    }
                });
            }

            let prefs = commands::preferences::load_prefs_sync(&app.handle());

            let handle = app.handle().clone();
            match app.handle().plugin(
                tauri_plugin_global_shortcut::Builder::new()
                    .with_handler(move |app_handle, shortcut, event| {
                        if event.state() == ShortcutState::Released {
                            return;
                        }

                        let bindings = app_handle.state::<HotkeyBindings>();
                        let action = match bindings.0.lock() {
                            Ok(bindings) => bindings.get(&shortcut.id()).cloned(),
                            Err(_) => {
                                eprintln!("Failed to read hotkey bindings map");
                                None
                            }
                        };

                        if let Some(action) = action {
                            if let Err(error) = handle.emit("hotkey-fired", action.clone()) {
                                eprintln!("Failed to emit hotkey-fired for '{}': {error}", action);
                            }
                        }
                    })
                    .build(),
            ) {
                Ok(_) => {
                    if let Err(error) = register_configured_hotkeys(&app.handle(), &prefs.hotkeys) {
                        eprintln!("Failed to register configured hotkeys: {error}");
                    }
                }
                Err(error) => {
                    eprintln!("Failed to initialize global shortcut plugin: {error}");
                }
            }

            restore_overlay_bounds(app, &prefs);

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::cards::read_cards,
            commands::cards::write_cards,
            commands::preferences::read_prefs,
            commands::preferences::write_prefs,
            commands::window::set_overlay_bounds,
            commands::window::get_monitors,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn restore_overlay_bounds(app: &tauri::App, prefs: &Preferences) {
    if let Some(overlay) = app.get_webview_window("overlay") {
        let clamped = prefs.clone().clamped();

        let ox = clamped.overlay_x as i64;
        let oy = clamped.overlay_y as i64;
        let ow = clamped.overlay_width as i64;
        let oh = clamped.overlay_height as i64;

        // Determine whether the clamped rect intersects at least one monitor.
        let intersects_any_monitor = match app.available_monitors() {
            Ok(monitors) => monitors.into_iter().any(|monitor| {
                let mx = monitor.position().x as i64;
                let my = monitor.position().y as i64;
                let mw = monitor.size().width as i64;
                let mh = monitor.size().height as i64;
                ox < mx + mw && ox + ow > mx && oy < my + mh && oy + oh > my
            }),
            Err(e) => {
                eprintln!("Failed to enumerate monitors when restoring overlay bounds: {e}");
                // Fall through to default position.
                false
            }
        };

        let position = if intersects_any_monitor {
            tauri::PhysicalPosition::new(ox as i32, oy as i32)
        } else {
            eprintln!("Saved overlay position ({ox},{oy}) is off-screen; falling back to primary monitor center");
            match app.primary_monitor() {
                Ok(Some(monitor)) => {
                    let cx = monitor.position().x as i64
                        + monitor.size().width as i64 / 2
                        - ow / 2;
                    let cy = monitor.position().y as i64
                        + monitor.size().height as i64 / 2
                        - oh / 2;
                    tauri::PhysicalPosition::new(cx as i32, cy as i32)
                }
                _ => tauri::PhysicalPosition::new(100, 100),
            }
        };

        overlay.set_position(position).ok();
        overlay
            .set_size(tauri::PhysicalSize::new(
                clamped.overlay_width as u32,
                clamped.overlay_height as u32,
            ))
            .ok();
    }
}
