#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod commands;
mod desktop;
mod preferences;
mod registry;
mod settings;
mod tab_controls;
mod views;
mod workspace_commands;
use commands::AppState;
use settings::Store;
use std::sync::Mutex;
use tauri::webview::{NewWindowResponse, PermissionResponse, WebviewBuilder};
use tauri::window::WindowBuilder;
use tauri::{LogicalPosition, Manager, WebviewUrl, WindowEvent};

fn main() {
    tracing_subscriber::fmt().with_target(false).init();
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(main) = app.get_window("main") {
                let _ = main.show();
                let _ = main.set_focus();
            }
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_autostart::Builder::new().build())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _, event| {
                    if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                        desktop::toggle(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            let path = app.path().app_config_dir()?.join("settings.json");
            let store = Store::load(path).map_err(|e| e.to_string());
            let horizontal_tabs = store
                .as_ref()
                .map(|s| s.settings.horizontal_tabs)
                .unwrap_or(false);
            app.manage(AppState {
                store: Mutex::new(store),
            });
            let workspace = views::Workspace::default();
            *workspace
                .horizontal_tabs
                .lock()
                .expect("New workspace lock") = horizontal_tabs;
            app.manage(workspace);
            let window = WindowBuilder::new(app, "main")
                .title(if cfg!(debug_assertions) {
                    "SyntraChat · Development"
                } else {
                    "SyntraChat"
                })
                .inner_size(1180.0, 800.0)
                .min_inner_size(760.0, 560.0)
                .build()?;
            let resize_window = window.clone();
            window.on_window_event(move |event| {
                if let WindowEvent::CloseRequested { api, .. } = event {
                    let app = resize_window.app_handle();
                    let close_to_tray = app
                        .state::<AppState>()
                        .store
                        .lock()
                        .ok()
                        .and_then(|s| s.as_ref().ok().map(|s| s.settings.desktop.close_to_tray))
                        .unwrap_or(false);
                    if close_to_tray
                        && app
                            .state::<views::Workspace>()
                            .tray_available
                            .load(std::sync::atomic::Ordering::Relaxed)
                    {
                        api.prevent_close();
                        let _ = resize_window.hide();
                    }
                }
                if matches!(
                    event,
                    WindowEvent::Resized(_) | WindowEvent::ScaleFactorChanged { .. }
                ) && let Err(error) = views::resize(&resize_window)
                {
                    tracing::warn!(%error, "Could not resize account view");
                }
            });
            let shell = WebviewBuilder::new("main", WebviewUrl::App("index.html".into()))
                .auto_resize()
                .on_navigation(|url| {
                    (url.scheme() == "tauri" && url.host_str() == Some("localhost"))
                        || (url.scheme() == "http" && url.host_str() == Some("tauri.localhost"))
                        || (cfg!(debug_assertions)
                            && url.scheme() == "http"
                            && url.host_str() == Some("127.0.0.1")
                            && url.port() == Some(1420))
                })
                .on_new_window(|_, _| NewWindowResponse::Deny)
                .on_permission_request(|_, _| PermissionResponse::Deny);
            let shell =
                window.add_child(shell, LogicalPosition::new(0.0, 0.0), window.inner_size()?)?;
            desktop::attach_shortcuts(&shell)?;
            if let Err(error) = desktop::setup(app.handle()) {
                tracing::warn!(%error, "Some desktop controls are unavailable");
                *app.state::<views::Workspace>()
                    .desktop_error
                    .lock()
                    .map_err(|_| "Workspace lock failed")? = Some(error.to_string());
            }
            Ok(())
        })
        .on_menu_event(|app, event| {
            desktop::menu(app, &event);
            tab_controls::handle_menu(app, event);
        })
        .invoke_handler(tauri::generate_handler![
            workspace_commands::save_workspace,
            workspace_commands::remove_workspace,
            workspace_commands::select_workspace,
            workspace_commands::set_customization,
            workspace_commands::export_theme,
            workspace_commands::restore_session,
            desktop::set_desktop,
            tab_controls::account_menu,
            tab_controls::reorder_accounts,
            tab_controls::set_account_color,
            tab_controls::set_tab_layout,
            commands::snapshot,
            commands::add_account,
            commands::edit_account,
            commands::remove_account,
            commands::set_appearance,
            commands::open_account,
            commands::reload_account,
            commands::close_account,
            commands::quit,
            commands::show_home,
            commands::set_content_visible,
        ])
        .run(tauri::generate_context!())
        .expect("SyntraChat could not start");
}
