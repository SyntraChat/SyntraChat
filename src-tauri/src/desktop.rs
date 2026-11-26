use crate::{
    commands::{self, AppState},
    preferences::Desktop,
    views,
};
use std::sync::atomic::Ordering;
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, EventTarget, Manager, State, Webview};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_global_shortcut::GlobalShortcutExt;

// WebView2 consumes accelerator messages before the hidden native menu sees them.
pub fn attach_shortcuts(view: &Webview) -> tauri::Result<()> {
    #[cfg(windows)]
    {
        let app = view.app_handle().clone();
        view.with_webview(move |native| unsafe {
            use webview2_com::{
                AcceleratorKeyPressedEventHandler, Microsoft::Web::WebView2::Win32::*,
            };
            use windows::Win32::UI::Input::KeyboardAndMouse::{
                GetKeyState, VK_CONTROL, VK_LWIN, VK_MENU, VK_RWIN, VK_SHIFT,
            };
            let handler = AcceleratorKeyPressedEventHandler::create(Box::new(move |_, args| {
                let Some(args) = args else { return Ok(()) };
                let mut kind = COREWEBVIEW2_KEY_EVENT_KIND_KEY_DOWN;
                args.KeyEventKind(&mut kind)?;
                if kind != COREWEBVIEW2_KEY_EVENT_KIND_KEY_DOWN {
                    return Ok(());
                }
                let mut key = 0;
                args.VirtualKey(&mut key)?;
                let down = |vk| GetKeyState(vk) < 0;
                if !down(VK_CONTROL.0 as i32)
                    || down(VK_MENU.0 as i32)
                    || down(VK_LWIN.0 as i32)
                    || down(VK_RWIN.0 as i32)
                {
                    return Ok(());
                }
                let shift = down(VK_SHIFT.0 as i32);
                let action = match (key, shift) {
                    (0x4b, false) => "quick-switch".to_string(),
                    (0xbc, false) => "settings".to_string(),
                    (0x09, false) => "next".to_string(),
                    (0x09, true) => "previous".to_string(),
                    (0x52, false) => "reload".to_string(),
                    (0x57, false) => "close".to_string(),
                    (0x51, false) => {
                        args.SetHandled(true)?;
                        app.exit(0);
                        return Ok(());
                    }
                    (0x31..=0x39, false) => format!("open:{}", key - 0x31),
                    _ => return Ok(()),
                };
                args.SetHandled(true)?;
                app.emit_to(
                    EventTarget::Webview {
                        label: "main".into(),
                    },
                    "shell-action",
                    action,
                )
                .ok();
                Ok(())
            }));
            let mut token = 0;
            if let Err(error) = native
                .controller()
                .add_AcceleratorKeyPressed(&handler, &mut token)
            {
                tracing::warn!(%error, "Could not attach account shortcuts");
            }
        })?;
    }
    #[cfg(not(windows))]
    let _ = view;
    Ok(())
}

pub fn show(app: &AppHandle) {
    if let Some(window) = app.get_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
    }
}
pub fn toggle(app: &AppHandle) {
    if let Some(window) = app.get_window("main") {
        if window.is_visible().unwrap_or(false) && window.is_focused().unwrap_or(false) {
            let _ = window.hide();
        } else {
            show(app);
        }
    }
}

fn shortcut(app: &AppHandle, prefs: &Desktop) -> Result<(), String> {
    if prefs.global_shortcut {
        app.global_shortcut()
            .register(prefs.toggle_shortcut.as_str())
            .map_err(|e| format!("Could not register the global shortcut: {e}"))?;
    }
    Ok(())
}

pub fn setup(app: &AppHandle) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "desktop:show", "Show SyntraChat", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "desktop:quit", "Quit SyntraChat", true, None::<&str>)?;
    let tray_menu = Menu::with_items(app, &[&show_item, &quit])?;
    if let Some(icon) = app.default_window_icon() {
        let cache = app.path().app_cache_dir()?;
        std::fs::create_dir_all(&cache)?;
        match TrayIconBuilder::with_id("syntrachat")
            .icon(icon.clone())
            .icon_as_template(cfg!(target_os = "macos"))
            .tooltip("SyntraChat")
            .menu(&tray_menu)
            .show_menu_on_left_click(false)
            .temp_dir_path(cache)
            .on_tray_icon_event(|tray, event| {
                if matches!(
                    event,
                    TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    }
                ) {
                    show(tray.app_handle());
                }
            })
            .build(app)
        {
            Ok(_) => app
                .state::<views::Workspace>()
                .tray_available
                .store(true, Ordering::Relaxed),
            Err(error) => tracing::warn!(%error, "System tray unavailable"),
        }
    }
    let mut items = vec![];
    for (action, label, key) in [
        ("quick-switch", "Quick switch", "CmdOrCtrl+K"),
        ("settings", "Settings", "CmdOrCtrl+,"),
        ("next", "Next account", "Ctrl+Tab"),
        ("previous", "Previous account", "Ctrl+Shift+Tab"),
        ("reload", "Reload account", "CmdOrCtrl+R"),
        ("close", "Close account tab", "CmdOrCtrl+W"),
    ] {
        items.push(MenuItem::with_id(
            app,
            format!("shell:{action}"),
            label,
            true,
            Some(key),
        )?);
    }
    for n in 1..=9 {
        items.push(MenuItem::with_id(
            app,
            format!("shell:open:{}", n - 1),
            format!("Account {n}"),
            true,
            Some(format!("CmdOrCtrl+{n}")),
        )?);
    }
    items.push(MenuItem::with_id(
        app,
        "desktop:quit",
        "Quit SyntraChat",
        true,
        Some("CmdOrCtrl+Q"),
    )?);
    let refs: Vec<&dyn tauri::menu::IsMenuItem<tauri::Wry>> = items
        .iter()
        .map(|item| item as &dyn tauri::menu::IsMenuItem<tauri::Wry>)
        .collect();
    let account_menu = Submenu::with_items(app, "SyntraChat", true, &refs)?;
    let edit = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;
    app.set_menu(Menu::with_items(app, &[&account_menu, &edit])?)?;
    #[cfg(not(target_os = "macos"))]
    app.hide_menu()?;
    let guard = app.state::<AppState>();
    let prefs = guard
        .store
        .lock()
        .ok()
        .and_then(|s| s.as_ref().ok().map(|s| s.settings.desktop.clone()));
    if let Some(prefs) = prefs {
        if let Err(error) = shortcut(app, &prefs) {
            *app.state::<views::Workspace>()
                .desktop_error
                .lock()
                .expect("New workspace lock") = Some(error);
        }
        if prefs.start_hidden
            && app
                .state::<views::Workspace>()
                .tray_available
                .load(Ordering::Relaxed)
            && let Some(window) = app.get_window("main")
        {
            window.hide()?;
        }
    }
    Ok(())
}

pub fn menu(app: &AppHandle, event: &tauri::menu::MenuEvent) {
    match event.id().as_ref() {
        "desktop:show" => show(app),
        "desktop:quit" => app.exit(0),
        id if id.starts_with("shell:") => {
            let _ = app.emit_to(
                EventTarget::Webview {
                    label: "main".into(),
                },
                "shell-action",
                &id[6..],
            );
        }
        _ => {}
    }
}

#[tauri::command]
pub fn set_desktop(
    caller: Webview,
    app: AppHandle,
    state: State<AppState>,
    desktop: Desktop,
) -> Result<(), String> {
    commands::trusted(&caller)?;
    let previous = state
        .store
        .lock()
        .map_err(|_| "Settings lock failed")?
        .as_ref()
        .map_err(Clone::clone)?
        .settings
        .desktop
        .clone();
    let mut candidate = state
        .store
        .lock()
        .map_err(|_| "Settings lock failed")?
        .as_ref()
        .map_err(Clone::clone)?
        .settings
        .clone();
    candidate.desktop = desktop.clone();
    candidate.validate().map_err(|e| e.to_string())?;
    if (desktop.close_to_tray || desktop.start_hidden)
        && !app
            .state::<views::Workspace>()
            .tray_available
            .load(Ordering::Relaxed)
    {
        return Err("A system tray is required for hiding the window".into());
    }
    if previous.global_shortcut {
        let _ = app
            .global_shortcut()
            .unregister(previous.toggle_shortcut.as_str());
    }
    if let Err(error) = shortcut(&app, &desktop) {
        let _ = shortcut(&app, &previous);
        return Err(error);
    }
    let apply = || -> Result<(), String> {
        if desktop.launch_at_login != previous.launch_at_login {
            if desktop.launch_at_login {
                app.autolaunch().enable()
            } else {
                app.autolaunch().disable()
            }
            .map_err(|e| e.to_string())?;
        }
        commands::update(&state, |s| {
            s.desktop = desktop.clone();
            Ok(())
        })
    };
    if let Err(error) = apply() {
        if desktop.global_shortcut {
            let _ = app
                .global_shortcut()
                .unregister(desktop.toggle_shortcut.as_str());
        }
        let _ = shortcut(&app, &previous);
        if desktop.launch_at_login != previous.launch_at_login {
            let _ = if previous.launch_at_login {
                app.autolaunch().enable()
            } else {
                app.autolaunch().disable()
            };
        }
        return Err(error);
    }
    *app.state::<views::Workspace>()
        .desktop_error
        .lock()
        .map_err(|_| "Workspace lock failed")? = None;
    Ok(())
}
