mod commands;

use std::collections::HashMap;
use std::sync::Mutex;

use tauri::image::Image;
use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::commands::preferences::{HotkeyConfig, Preferences};

#[derive(Default)]
struct HotkeyBindings(Mutex<HashMap<u32, String>>);

const HOTKEY_ACTIONS: [(&str, fn(&HotkeyConfig) -> &str); 7] = [
    ("next",      |config| config.next.as_str()),
    ("prev",      |config| config.prev.as_str()),
    ("jump",      |config| config.jump.as_str()),
    ("search",    |config| config.search.as_str()),
    ("next_line", |config| config.next_line.as_str()),
    ("prev_line", |config| config.prev_line.as_str()),
    ("toggle",    |config| config.toggle.as_str()),
];

/// Normalizes a shortcut string for `global-hotkey` compatibility.
/// Replaces the `"Meta"` modifier token (from older recordings) with `"Super"`,
/// which is the accepted form for the macOS Command key.
fn normalize_shortcut(shortcut: &str) -> String {
    shortcut
        .split('+')
        .map(|part| {
            if part.trim().eq_ignore_ascii_case("meta") {
                "Super"
            } else {
                part.trim()
            }
        })
        .collect::<Vec<_>>()
        .join("+")
}

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
        let raw = shortcut_getter(config).trim();
        let shortcut_owned = normalize_shortcut(raw);
        let shortcut = shortcut_owned.as_str();
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

fn show_and_focus_editor(app: &tauri::AppHandle) {
    if let Some(w) = app.get_webview_window("editor") {
        let _ = w.show();
        let _ = w.set_focus();
    }
}

#[cfg(target_os = "macos")]
fn make_tray_template_icon() -> Image<'static> {
    let width = 36usize;
    let height = 36usize;
    let mut rgba = vec![0u8; width * height * 4];

    let put = |rgba: &mut [u8], x: usize, y: usize, alpha: u8| {
        let index = (y * width + x) * 4;
        rgba[index] = 255;
        rgba[index + 1] = 255;
        rgba[index + 2] = 255;
        rgba[index + 3] = alpha;
    };

    for y in 0..height {
        for x in 0..width {
            let dx = x as f32 - 18.0;
            let dy = y as f32 - 16.0;
            let distance = (dx * dx + dy * dy).sqrt();
            if (8.0..=13.5).contains(&distance) {
                put(&mut rgba, x, y, 255);
            }
        }
    }

    for y in 20..34 {
        for x in 8..28 {
            let in_circle = |cx: f32, cy: f32| {
                let dx = x as f32 - cx;
                let dy = y as f32 - cy;
                dx * dx + dy * dy <= 9.0
            };
            let mut inside = true;
            if x < 11 && y < 23 {
                inside = in_circle(11.0, 23.0);
            } else if x > 24 && y < 23 {
                inside = in_circle(24.0, 23.0);
            } else if x < 11 && y > 30 {
                inside = in_circle(11.0, 30.0);
            } else if x > 24 && y > 30 {
                inside = in_circle(24.0, 30.0);
            }

            if inside {
                put(&mut rgba, x, y, 255);
            }
        }
    }

    Image::new_owned(rgba, width as u32, height as u32)
}

struct BuiltInPreset {
    id: &'static str,
    label: &'static str,
    x: f64,
    y: f64,
    w: f64,
    h: f64,
}

const BUILT_IN_PRESETS: &[BuiltInPreset] = &[
    BuiltInPreset { id: "bl-left", label: "Left", x: 0.0, y: 0.0, w: 0.5, h: 1.0 },
    BuiltInPreset { id: "bl-right", label: "Right", x: 0.5, y: 0.0, w: 0.5, h: 1.0 },
    BuiltInPreset { id: "bl-top", label: "Top", x: 0.0, y: 0.0, w: 1.0, h: 0.5 },
    BuiltInPreset { id: "bl-bottom", label: "Bottom", x: 0.0, y: 0.5, w: 1.0, h: 0.5 },
    BuiltInPreset { id: "bl-top-left", label: "Top Left", x: 0.0, y: 0.0, w: 0.5, h: 0.5 },
    BuiltInPreset { id: "bl-top-right", label: "Top Right", x: 0.5, y: 0.0, w: 0.5, h: 0.5 },
    BuiltInPreset { id: "bl-bottom-left", label: "Bottom Left", x: 0.0, y: 0.5, w: 0.5, h: 0.5 },
    BuiltInPreset { id: "bl-bottom-right", label: "Bottom Right", x: 0.5, y: 0.5, w: 0.5, h: 0.5 },
    BuiltInPreset { id: "bl-left-third", label: "Left Third", x: 0.0, y: 0.0, w: 1.0 / 3.0, h: 1.0 },
    BuiltInPreset { id: "bl-ctr-third", label: "Center Third", x: 1.0 / 3.0, y: 0.0, w: 1.0 / 3.0, h: 1.0 },
    BuiltInPreset { id: "bl-right-third", label: "Right Third", x: 2.0 / 3.0, y: 0.0, w: 1.0 / 3.0, h: 1.0 },
];

/// Convert preset ratios to physical pixel bounds.
/// All inputs and outputs are in physical pixels.
fn preset_to_physical_bounds(
    px: f64,
    py: f64,
    pw: f64,
    ph: f64,
    mon_x: f64,
    mon_y: f64,
    mon_w: f64,
    mon_h: f64,
) -> (i32, i32, u32, u32) {
    let x = (mon_x + px * mon_w).round() as i32;
    let y = (mon_y + py * mon_h).round() as i32;
    let w = (pw * mon_w).round() as u32;
    let h = (ph * mon_h).round() as u32;
    (x, y, w, h)
}

fn apply_preset_to_overlay(app: &tauri::AppHandle, preset: &BuiltInPreset) {
    let monitor = match app.primary_monitor() {
        Ok(Some(monitor)) => monitor,
        Ok(None) => {
            eprintln!("apply_preset_to_overlay: no primary monitor found");
            return;
        }
        Err(error) => {
            eprintln!("apply_preset_to_overlay: failed to get primary monitor: {error}");
            return;
        }
    };

    let mon_w = monitor.size().width as f64;
    let mon_h = monitor.size().height as f64;
    let mon_x = monitor.position().x as f64;
    let mon_y = monitor.position().y as f64;

    let (phys_x, phys_y, phys_w, phys_h) = preset_to_physical_bounds(
        preset.x, preset.y, preset.w, preset.h, mon_x, mon_y, mon_w, mon_h,
    );

    if let Some(overlay) = app.get_webview_window("overlay") {
        if let Err(error) = overlay.set_position(tauri::PhysicalPosition::new(phys_x, phys_y)) {
            eprintln!("apply_preset_to_overlay: set_position failed: {error}");
        }
        if let Err(error) = overlay.set_size(tauri::PhysicalSize::new(phys_w, phys_h)) {
            eprintln!("apply_preset_to_overlay: set_size failed: {error}");
        }
    }

    let app_clone = app.clone();
    let (fx, fy, fw, fh) = (phys_x as f64, phys_y as f64, phys_w as f64, phys_h as f64);
    tauri::async_runtime::spawn(async move {
        let mut prefs = commands::preferences::load_prefs_sync(&app_clone);
        prefs.overlay_x = fx;
        prefs.overlay_y = fy;
        prefs.overlay_width = fw;
        prefs.overlay_height = fh;
        if let Err(error) = commands::preferences::write_prefs(app_clone, prefs, None).await {
            eprintln!("apply_preset_to_overlay: failed to save prefs: {error}");
        }
    });
}

fn setup_tray(app: &tauri::App) -> tauri::Result<()> {
    use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
    use tauri::tray::TrayIconBuilder;

    let preset_label = |id| {
        BUILT_IN_PRESETS
            .iter()
            .find(|preset| preset.id == id)
            .map(|preset| preset.label)
            .expect("built-in preset should exist")
    };

    let show_hide = MenuItem::with_id(app, "toggle_overlay", "Show/Hide Overlay", true, None::<&str>)?;
    let open_editor = MenuItem::with_id(app, "open_editor", "Open Editor", true, None::<&str>)?;
    let p_left = MenuItem::with_id(app, "preset:bl-left", preset_label("bl-left"), true, None::<&str>)?;
    let p_right =
        MenuItem::with_id(app, "preset:bl-right", preset_label("bl-right"), true, None::<&str>)?;
    let p_top = MenuItem::with_id(app, "preset:bl-top", preset_label("bl-top"), true, None::<&str>)?;
    let p_bottom =
        MenuItem::with_id(app, "preset:bl-bottom", preset_label("bl-bottom"), true, None::<&str>)?;
    let sep_a = PredefinedMenuItem::separator(app)?;
    let p_top_left =
        MenuItem::with_id(app, "preset:bl-top-left", preset_label("bl-top-left"), true, None::<&str>)?;
    let p_top_right = MenuItem::with_id(
        app,
        "preset:bl-top-right",
        preset_label("bl-top-right"),
        true,
        None::<&str>,
    )?;
    let p_bottom_left = MenuItem::with_id(
        app,
        "preset:bl-bottom-left",
        preset_label("bl-bottom-left"),
        true,
        None::<&str>,
    )?;
    let p_bottom_right = MenuItem::with_id(
        app,
        "preset:bl-bottom-right",
        preset_label("bl-bottom-right"),
        true,
        None::<&str>,
    )?;
    let sep_b = PredefinedMenuItem::separator(app)?;
    let p_left_third = MenuItem::with_id(
        app,
        "preset:bl-left-third",
        preset_label("bl-left-third"),
        true,
        None::<&str>,
    )?;
    let p_ctr_third = MenuItem::with_id(
        app,
        "preset:bl-ctr-third",
        preset_label("bl-ctr-third"),
        true,
        None::<&str>,
    )?;
    let p_right_third = MenuItem::with_id(
        app,
        "preset:bl-right-third",
        preset_label("bl-right-third"),
        true,
        None::<&str>,
    )?;

    let position_submenu = Submenu::with_items(
        app,
        "Position",
        true,
        &[
            &p_left,
            &p_right,
            &p_top,
            &p_bottom,
            &sep_a,
            &p_top_left,
            &p_top_right,
            &p_bottom_left,
            &p_bottom_right,
            &sep_b,
            &p_left_third,
            &p_ctr_third,
            &p_right_third,
        ],
    )?;
    let sep1 = PredefinedMenuItem::separator(app)?;
    let sep2 = PredefinedMenuItem::separator(app)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu =
        Menu::with_items(app, &[&show_hide, &open_editor, &sep1, &position_submenu, &sep2, &quit])?;

    let mut tray_builder = TrayIconBuilder::new()
        .menu(&menu)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "toggle_overlay" => {
                commands::window::toggle_overlay_window(app);
            }
            "open_editor" => {
                show_and_focus_editor(app);
            }
            id if id.starts_with("preset:") => {
                let preset_id = id.trim_start_matches("preset:");
                if let Some(preset) = BUILT_IN_PRESETS.iter().find(|preset| preset.id == preset_id) {
                    apply_preset_to_overlay(app, preset);
                }
            }
            "quit" => app.exit(0),
            _ => {}
        });

    #[cfg(target_os = "macos")]
    {
        tray_builder = tray_builder
            .icon(make_tray_template_icon())
            .icon_as_template(true);
    }

    #[cfg(not(target_os = "macos"))]
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

#[cfg(test)]
mod preset_tests {
    use super::preset_to_physical_bounds;

    #[test]
    fn left_half_on_1920x1080_at_origin() {
        let (x, y, w, h) =
            preset_to_physical_bounds(0.0, 0.0, 0.5, 1.0, 0.0, 0.0, 1920.0, 1080.0);
        assert_eq!(x, 0);
        assert_eq!(y, 0);
        assert_eq!(w, 960);
        assert_eq!(h, 1080);
    }

    #[test]
    fn right_half_on_1920x1080_at_origin() {
        let (x, y, w, h) =
            preset_to_physical_bounds(0.5, 0.0, 0.5, 1.0, 0.0, 0.0, 1920.0, 1080.0);
        assert_eq!(x, 960);
        assert_eq!(y, 0);
        assert_eq!(w, 960);
        assert_eq!(h, 1080);
    }

    #[test]
    fn left_third_on_1920x1080_at_offset_monitor() {
        let (x, y, w, h) =
            preset_to_physical_bounds(0.0, 0.0, 1.0 / 3.0, 1.0, 2560.0, 0.0, 1920.0, 1080.0);
        assert_eq!(x, 2560);
        assert_eq!(y, 0);
        assert_eq!(w, 640);
        assert_eq!(h, 1080);
    }
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
            if let Some(overlay) = app.get_webview_window("overlay") {
                if let Err(e) = overlay.set_ignore_cursor_events(true) {
                    eprintln!("Failed to set initial overlay clickthrough: {e}");
                }
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
            commands::preferences::apply_editor_theme(&app.handle(), &prefs);

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
            commands::window::set_overlay_clickthrough,
            commands::window::toggle_overlay,
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
