use crate::preferences::AccountDetails;
use crate::{registry, settings, views};
use serde::Serialize;
use settings::{Account, Settings, Store};
use std::sync::{Mutex, MutexGuard};
use tauri::webview::{NewWindowResponse, PermissionResponse, WebviewBuilder};
use tauri::{AppHandle, Manager, State, Webview, WebviewUrl};
use uuid::Uuid;

pub struct AppState {
    pub store: Mutex<Result<Store>>,
}
type Result<T> = std::result::Result<T, String>;

pub(crate) fn trusted(caller: &Webview) -> Result<()> {
    if caller.label() == "main" {
        Ok(())
    } else {
        Err("Untrusted command caller".into())
    }
}
fn locked(state: &AppState) -> Result<MutexGuard<'_, std::result::Result<Store, String>>> {
    state
        .store
        .lock()
        .map_err(|_| "Settings lock failed".into())
}
pub(crate) fn account(state: &AppState, id: Uuid) -> Result<Account> {
    locked(state)?
        .as_ref()
        .map_err(Clone::clone)?
        .settings
        .accounts
        .iter()
        .find(|a| a.id == id)
        .cloned()
        .ok_or_else(|| "Account no longer exists".into())
}
pub(crate) fn update(
    state: &AppState,
    mutate: impl FnOnce(&mut Settings) -> Result<()>,
) -> Result<()> {
    let mut guard = locked(state)?;
    let store = guard.as_mut().map_err(|e| e.clone())?;
    let mut next = store.settings.clone();
    mutate(&mut next)?;
    store.commit(next).map_err(|e| e.to_string())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Snapshot {
    settings: Settings,
    services: Vec<registry::Service>,
    open_accounts: Vec<String>,
    active_account: Option<Uuid>,
    version: &'static str,
    os: &'static str,
    engine: &'static str,
    view_states: std::collections::HashMap<Uuid, views::LoadState>,
    tray_available: bool,
    desktop_error: Option<String>,
}

#[tauri::command]
pub fn snapshot(caller: Webview, app: AppHandle, state: State<AppState>) -> Result<Snapshot> {
    trusted(&caller)?;
    let settings = locked(&state)?
        .as_ref()
        .map_err(Clone::clone)?
        .settings
        .clone();
    let open_accounts = settings
        .accounts
        .iter()
        .filter(|a| app.get_webview(&format!("account-{}", a.id)).is_some())
        .map(|a| a.id.to_string())
        .collect();
    Ok(Snapshot {
        settings,
        services: registry::services(),
        open_accounts,
        active_account: *app
            .state::<views::Workspace>()
            .active
            .lock()
            .map_err(|_| "Workspace lock failed")?,
        version: env!("CARGO_PKG_VERSION"),
        os: std::env::consts::OS,
        engine: if cfg!(target_os = "windows") {
            "WebView2"
        } else if cfg!(target_os = "linux") {
            "WebKitGTK"
        } else {
            "WKWebView"
        },
        view_states: app
            .state::<views::Workspace>()
            .loads
            .lock()
            .map_err(|_| "Workspace lock failed")?
            .clone(),
        tray_available: app
            .state::<views::Workspace>()
            .tray_available
            .load(std::sync::atomic::Ordering::Relaxed),
        desktop_error: app
            .state::<views::Workspace>()
            .desktop_error
            .lock()
            .map_err(|_| "Workspace lock failed")?
            .clone(),
    })
}

#[tauri::command]
pub fn add_account(
    caller: Webview,
    state: State<AppState>,
    service_id: String,
    name: String,
    url: Option<String>,
    mut details: Option<AccountDetails>,
) -> Result<()> {
    trusted(&caller)?;
    if let Some(details) = &mut details {
        details.folder = details.folder.trim().into();
    }
    let name = settings::label(&name).map_err(|e| e.to_string())?;
    let home = if service_id == "custom" || registry::server_service(&service_id) {
        let default = registry::services()
            .into_iter()
            .find(|s| s.id == service_id)
            .map(|s| s.url)
            .unwrap_or_default();
        registry::validate_url(url.as_deref().filter(|s| !s.is_empty()).unwrap_or(default))?
            .to_string()
    } else {
        registry::services()
            .into_iter()
            .find(|s| s.id == service_id)
            .ok_or("Unknown service")?
            .url
            .into()
    };
    update(&state, |s| {
        s.accounts.push(Account {
            id: Uuid::new_v4(),
            service_id,
            name,
            url: home,
            zoom: 1.0,
            color: None,
            details: details.unwrap_or(AccountDetails {
                workspace_id: s.active_workspace,
                ..Default::default()
            }),
        });
        Ok(())
    })
}

#[tauri::command]
pub fn edit_account(
    caller: Webview,
    app: AppHandle,
    state: State<AppState>,
    id: Uuid,
    name: String,
    zoom: f64,
    mut details: Option<AccountDetails>,
) -> Result<()> {
    trusted(&caller)?;
    if let Some(details) = &mut details {
        details.folder = details.folder.trim().into();
    }
    let editing_active = *app
        .state::<views::Workspace>()
        .active
        .lock()
        .map_err(|_| "Workspace lock failed")?
        == Some(id);
    let name = settings::label(&name).map_err(|e| e.to_string())?;
    update(&state, |s| {
        let a = s
            .accounts
            .iter_mut()
            .find(|a| a.id == id)
            .ok_or("Account no longer exists")?;
        a.name = name;
        a.zoom = zoom;
        if let Some(details) = details {
            a.details = details;
        }
        let workspace = a.details.workspace_id;
        if editing_active && s.active_workspace.is_some() && s.active_workspace != workspace {
            s.active_workspace = workspace;
        }
        Ok(())
    })?;
    if let Some(view) = app.get_webview(&format!("account-{id}")) {
        view.set_zoom(zoom).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn remove_account(
    caller: Webview,
    app: AppHandle,
    state: State<AppState>,
    id: Uuid,
) -> Result<()> {
    trusted(&caller)?;
    account(&state, id)?;
    if let Some(view) = app.get_webview(&format!("account-{id}")) {
        view.close().map_err(|e| e.to_string())?;
    }
    clear_active(&app, id)?;
    app.state::<views::Workspace>()
        .loads
        .lock()
        .map_err(|_| "Workspace lock failed")?
        .remove(&id);
    // Session data is deliberately retained; deletion needs an engine-shutdown-safe workflow.
    update(&state, |s| {
        s.accounts.retain(|a| a.id != id);
        s.session.retain(|other| *other != id);
        if s.last_active == Some(id) {
            s.last_active = None;
        }
        Ok(())
    })
}

#[tauri::command]
pub fn set_appearance(
    caller: Webview,
    state: State<AppState>,
    theme: String,
    accent: String,
) -> Result<()> {
    trusted(&caller)?;
    update(&state, |s| {
        s.theme = theme;
        s.accent = accent;
        Ok(())
    })
}

#[tauri::command]
pub async fn open_account(
    caller: Webview,
    app: AppHandle,
    state: State<'_, AppState>,
    id: Uuid,
) -> Result<()> {
    trusted(&caller)?;
    open(&app, &state, id, true)
}

pub(crate) fn open(app: &AppHandle, state: &AppState, id: Uuid, remember: bool) -> Result<()> {
    let account = account(state, id)?;
    let view_label = format!("account-{id}");
    let window = app.get_window("main").ok_or("Main window unavailable")?;
    if app.get_webview(&view_label).is_none() {
        let home = registry::validate_url(&account.url)?;
        let allowed = home.clone();
        let navigation_app = app.clone();
        let load_app = app.clone();
        let profile = settings::profile_path(
            &app.path().app_local_data_dir().map_err(|e| e.to_string())?,
            id,
        );
        let rect = views::bounds(&window).map_err(|e| e.to_string())?;
        let builder = WebviewBuilder::new(&view_label, WebviewUrl::External(home))
            .data_directory(profile)
            .on_navigation(move |target| {
                let permitted = registry::navigation_allowed(&allowed, target);
                if !permitted {
                    views::load_state(&navigation_app, id, "blocked", Some(format!("This page requested a different origin ({}). Cross-site sign-in is restricted in this preview.", target.origin().ascii_serialization())));
                }
                permitted
            })
            .on_page_load(move |_, payload| {
                let state = match payload.event() { tauri::webview::PageLoadEvent::Started => "loading", tauri::webview::PageLoadEvent::Finished => "loaded" };
                views::load_state(&load_app, id, state, None);
            })
            .on_new_window(|_, _| NewWindowResponse::Deny)
            .on_permission_request(|_, _| PermissionResponse::Deny)
            .on_download(|_, _| false);
        // WKWebView ignores data_directory; macOS 14+ supports persistent UUID stores.
        #[cfg(target_os = "macos")]
        let builder = builder.data_store_identifier(*id.as_bytes());
        let view = window
            .add_child(builder, rect.position, rect.size)
            .map_err(|e| e.to_string())?;
        if let Err(error) = crate::desktop::attach_shortcuts(&view) {
            let _ = view.close();
            return Err(error.to_string());
        }
        if let Err(error) = view.set_zoom(account.zoom) {
            let _ = view.close();
            return Err(error.to_string());
        }
    }
    if !remember {
        app.get_webview(&view_label)
            .ok_or("Account view unavailable")?
            .hide()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }
    *app.state::<views::Workspace>()
        .active
        .lock()
        .map_err(|_| "Workspace lock failed")? = Some(id);
    views::set_visible(app, true)?;
    if window.is_visible().map_err(|e| e.to_string())? {
        app.get_webview(&view_label)
            .ok_or("Account view unavailable")?
            .set_focus()
            .map_err(|e| e.to_string())?;
    }
    if remember {
        update(state, |s| {
            if !s.session.contains(&id) {
                s.session.push(id);
            }
            s.last_active = Some(id);
            if s.active_workspace.is_some() && s.active_workspace != account.details.workspace_id {
                s.active_workspace = account.details.workspace_id;
            }
            Ok(())
        })?;
    }
    Ok(())
}

#[tauri::command]
pub fn reload_account(
    caller: Webview,
    app: AppHandle,
    state: State<AppState>,
    id: Uuid,
) -> Result<()> {
    trusted(&caller)?;
    account(&state, id)?;
    app.get_webview(&format!("account-{id}"))
        .ok_or("Open this account first")?
        .reload()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn close_account(
    caller: Webview,
    app: AppHandle,
    state: State<AppState>,
    id: Uuid,
) -> Result<()> {
    trusted(&caller)?;
    account(&state, id)?;
    if let Some(view) = app.get_webview(&format!("account-{id}")) {
        view.close().map_err(|e| e.to_string())?;
    }
    clear_active(&app, id)?;
    app.state::<views::Workspace>()
        .loads
        .lock()
        .map_err(|_| "Workspace lock failed")?
        .remove(&id);
    update(&state, |s| {
        s.session.retain(|other| *other != id);
        if s.last_active == Some(id) {
            s.last_active = None;
        }
        Ok(())
    })?;
    Ok(())
}

fn clear_active(app: &AppHandle, id: Uuid) -> Result<()> {
    let workspace = app.state::<views::Workspace>();
    let mut active = workspace
        .active
        .lock()
        .map_err(|_| "Workspace lock failed")?;
    if *active == Some(id) {
        *active = None;
    }
    Ok(())
}

#[tauri::command]
pub fn show_home(caller: Webview, app: AppHandle, state: State<AppState>) -> Result<()> {
    trusted(&caller)?;
    *app.state::<views::Workspace>()
        .active
        .lock()
        .map_err(|_| "Workspace lock failed")? = None;
    views::set_visible(&app, false)?;
    update(&state, |s| {
        s.last_active = None;
        Ok(())
    })
}

#[tauri::command]
pub fn set_content_visible(caller: Webview, app: AppHandle, visible: bool) -> Result<()> {
    trusted(&caller)?;
    views::set_visible(&app, visible)
}

#[tauri::command]
pub fn quit(caller: Webview, app: AppHandle) -> Result<()> {
    trusted(&caller)?;
    app.exit(0);
    Ok(())
}
