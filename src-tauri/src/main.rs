#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod commands;
mod registry;
mod settings;
use commands::AppState;
use settings::Store;
use std::sync::Mutex;
use tauri::webview::{NewWindowResponse, PermissionResponse};
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

fn main() {
    tracing_subscriber::fmt().with_target(false).init();
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            if let Some(main) = app.get_webview_window("main") {
                let _ = main.show();
                let _ = main.set_focus();
            }
        }))
        .setup(|app| {
            let path = app.path().app_config_dir()?.join("settings.json");
            let store = Store::load(path).map_err(|e| e.to_string());
            app.manage(AppState {
                store: Mutex::new(store),
            });
            WebviewWindowBuilder::new(app, "main", WebviewUrl::App("index.html".into()))
                .title(if cfg!(debug_assertions) {
                    "SyntraChat · Development"
                } else {
                    "SyntraChat"
                })
                .inner_size(1180.0, 800.0)
                .min_inner_size(760.0, 560.0)
                .on_navigation(|url| {
                    (url.scheme() == "tauri" && url.host_str() == Some("localhost"))
                        || (url.scheme() == "http" && url.host_str() == Some("tauri.localhost"))
                        || (cfg!(debug_assertions)
                            && url.scheme() == "http"
                            && url.host_str() == Some("127.0.0.1")
                            && url.port() == Some(1420))
                })
                .on_new_window(|_, _| NewWindowResponse::Deny)
                .on_permission_request(|_, _| PermissionResponse::Deny)
                .build()?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::snapshot,
            commands::add_account,
            commands::edit_account,
            commands::remove_account,
            commands::set_appearance,
            commands::open_account,
            commands::reload_account,
            commands::close_account,
            commands::quit,
        ])
        .run(tauri::generate_context!())
        .expect("SyntraChat could not start");
}
