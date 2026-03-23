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

    if let Ok(mut stored_bindings) = bindings.0.lock() {
        *stored_bindings = next_bindings;
    } else {
        eprintln!("Failed to update hotkey bindings map");
    }

    Ok(())
}

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    use tauri::menu::{Menu, MenuItem};
    use tauri::tray::TrayIconBuilder;

    let show_hide = MenuItem::with_id(app, "toggle_overlay", "Show/Hide Overlay", true, None::<&str>)?;
    let open_editor = MenuItem::with_id(app, "open_editor", "Open Editor", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_hide, &open_editor, &quit])?;

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
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn restore_overlay_bounds(app: &tauri::App, prefs: &Preferences) {
    if let Some(overlay) = app.get_webview_window("overlay") {
        let clamped = prefs.clone().clamped();
        overlay
            .set_position(tauri::PhysicalPosition::new(
                clamped.overlay_x as i32,
                clamped.overlay_y as i32,
            ))
            .ok();
        overlay
            .set_size(tauri::PhysicalSize::new(
                clamped.overlay_width as u32,
                clamped.overlay_height as u32,
            ))
            .ok();
    }
}
