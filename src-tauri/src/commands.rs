use crate::{registry, settings};
use serde::Serialize;
use settings::{Account, Settings, Store};
use std::sync::{Mutex, MutexGuard};
use tauri::webview::{NewWindowResponse, PermissionResponse};
use tauri::{AppHandle, Manager, State, WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use uuid::Uuid;

pub struct AppState {
    pub store: Mutex<Result<Store>>,
}
type Result<T> = std::result::Result<T, String>;

fn trusted(caller: &WebviewWindow) -> Result<()> {
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
fn account(state: &AppState, id: Uuid) -> Result<Account> {
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
fn update(state: &AppState, mutate: impl FnOnce(&mut Settings) -> Result<()>) -> Result<()> {
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
    version: &'static str,
    os: &'static str,
    engine: &'static str,
}

#[tauri::command]
pub fn snapshot(caller: WebviewWindow, app: AppHandle, state: State<AppState>) -> Result<Snapshot> {
    trusted(&caller)?;
    let settings = locked(&state)?
        .as_ref()
        .map_err(Clone::clone)?
        .settings
        .clone();
    let open_accounts = settings
        .accounts
        .iter()
        .filter(|a| {
            app.get_webview_window(&format!("account-{}", a.id))
                .is_some()
        })
        .map(|a| a.id.to_string())
        .collect();
    Ok(Snapshot {
        settings,
        services: registry::services(),
        open_accounts,
        version: env!("CARGO_PKG_VERSION"),
        os: std::env::consts::OS,
        engine: if cfg!(target_os = "windows") {
            "WebView2"
        } else if cfg!(target_os = "linux") {
            "WebKitGTK"
        } else {
            "WKWebView"
        },
    })
}

#[tauri::command]
pub fn add_account(
    caller: WebviewWindow,
    state: State<AppState>,
    service_id: String,
    name: String,
    url: Option<String>,
) -> Result<()> {
    trusted(&caller)?;
    let name = settings::label(&name).map_err(|e| e.to_string())?;
    let home = if service_id == "custom" {
        registry::validate_url(url.as_deref().unwrap_or_default())?.to_string()
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
        });
        Ok(())
    })
}

#[tauri::command]
pub fn edit_account(
    caller: WebviewWindow,
    app: AppHandle,
    state: State<AppState>,
    id: Uuid,
    name: String,
    zoom: f64,
) -> Result<()> {
    trusted(&caller)?;
    let name = settings::label(&name).map_err(|e| e.to_string())?;
    update(&state, |s| {
        let a = s
            .accounts
            .iter_mut()
            .find(|a| a.id == id)
            .ok_or("Account no longer exists")?;
        a.name = name;
        a.zoom = zoom;
        Ok(())
    })?;
    if let Some(view) = app.get_webview_window(&format!("account-{id}")) {
        view.set_zoom(zoom).map_err(|e| e.to_string())?;
        view.set_title(&format!("{} · SyntraChat", account(&state, id)?.name))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn remove_account(
    caller: WebviewWindow,
    app: AppHandle,
    state: State<AppState>,
    id: Uuid,
) -> Result<()> {
    trusted(&caller)?;
    account(&state, id)?;
    if let Some(view) = app.get_webview_window(&format!("account-{id}")) {
        view.close().map_err(|e| e.to_string())?;
    }
    // Session data is deliberately retained; deletion needs an engine-shutdown-safe workflow.
    update(&state, |s| {
        s.accounts.retain(|a| a.id != id);
        Ok(())
    })
}

#[tauri::command]
pub fn set_appearance(
    caller: WebviewWindow,
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
    caller: WebviewWindow,
    app: AppHandle,
    state: State<'_, AppState>,
    id: Uuid,
) -> Result<()> {
    trusted(&caller)?;
    let account = account(&state, id)?;
    let window_label = format!("account-{id}");
    if let Some(view) = app.get_webview_window(&window_label) {
        view.show().map_err(|e| e.to_string())?;
        return view.set_focus().map_err(|e| e.to_string());
    }
    if cfg!(target_os = "macos") {
        return Err("macOS profile isolation is not verified; account windows are unavailable on this platform".into());
    }
    let home = registry::validate_url(&account.url)?;
    let allowed = home.clone();
    let profile = settings::profile_path(
        &app.path().app_local_data_dir().map_err(|e| e.to_string())?,
        id,
    );
    let view = WebviewWindowBuilder::new(&app, &window_label, WebviewUrl::External(home))
        .title(format!("{} · SyntraChat", account.name))
        .inner_size(1100.0, 780.0)
        .data_directory(profile)
        .on_navigation(move |target| registry::navigation_allowed(&allowed, target))
        .on_new_window(|_, _| NewWindowResponse::Deny)
        .on_permission_request(|_, _| PermissionResponse::Deny)
        .on_download(|_, _| false)
        .build()
        .map_err(|e| e.to_string())?;
    view.set_zoom(account.zoom).map_err(|e| e.to_string())?;
    tracing::info!("Account window created");
    Ok(())
}

#[tauri::command]
pub fn reload_account(
    caller: WebviewWindow,
    app: AppHandle,
    state: State<AppState>,
    id: Uuid,
) -> Result<()> {
    trusted(&caller)?;
    account(&state, id)?;
    app.get_webview_window(&format!("account-{id}"))
        .ok_or("Open this account first")?
        .reload()
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn close_account(
    caller: WebviewWindow,
    app: AppHandle,
    state: State<AppState>,
    id: Uuid,
) -> Result<()> {
    trusted(&caller)?;
    account(&state, id)?;
    if let Some(view) = app.get_webview_window(&format!("account-{id}")) {
        view.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn quit(caller: WebviewWindow, app: AppHandle) -> Result<()> {
    trusted(&caller)?;
    app.exit(0);
    Ok(())
}
