use crate::{
    commands::{self, AppState},
    views,
};
use serde::Serialize;
use tauri::menu::{
    CheckMenuItem, ContextMenu, IsMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu,
};
use tauri::{AppHandle, Emitter, EventTarget, Manager, State, Webview};
use uuid::Uuid;

#[tauri::command]
pub fn reorder_accounts(
    caller: Webview,
    state: State<AppState>,
    ids: Vec<Uuid>,
) -> Result<(), String> {
    commands::trusted(&caller)?;
    commands::update(&state, |s| {
        s.reorder_accounts(&ids).map_err(|e| e.to_string())
    })
}

#[tauri::command]
pub fn set_account_color(
    caller: Webview,
    state: State<AppState>,
    id: Uuid,
    color: Option<String>,
) -> Result<(), String> {
    commands::trusted(&caller)?;
    commands::update(&state, |s| {
        s.accounts
            .iter_mut()
            .find(|a| a.id == id)
            .ok_or("Account no longer exists")?
            .color = color;
        Ok(())
    })
}

#[tauri::command]
pub fn set_tab_layout(
    caller: Webview,
    app: AppHandle,
    state: State<AppState>,
    horizontal: bool,
) -> Result<(), String> {
    commands::trusted(&caller)?;
    commands::update(&state, |s| {
        s.horizontal_tabs = horizontal;
        Ok(())
    })?;
    *app.state::<views::Workspace>()
        .horizontal_tabs
        .lock()
        .map_err(|_| "Workspace lock failed")? = horizontal;
    views::resize(&app.get_window("main").ok_or("Main window unavailable")?)
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn account_menu(
    caller: Webview,
    app: AppHandle,
    state: State<'_, AppState>,
    id: Uuid,
) -> Result<(), String> {
    commands::trusted(&caller)?;
    let account = commands::account(&state, id)?;
    let ids: Vec<_> = state
        .store
        .lock()
        .map_err(|_| "Settings lock failed")?
        .as_ref()
        .map_err(Clone::clone)?
        .settings
        .accounts
        .iter()
        .map(|a| a.id)
        .collect();
    let index = ids
        .iter()
        .position(|other| *other == id)
        .ok_or("Account no longer exists")?;
    let loaded = app.get_webview(&format!("account-{id}")).is_some();
    let item = |action: &str, label: &str, enabled| {
        MenuItem::with_id(
            &app,
            format!("account:{id}:{action}"),
            label,
            enabled,
            None::<&str>,
        )
    };
    let reload = item("reload", "Reload", loaded).map_err(|e| e.to_string())?;
    let edit = item("edit", "Rename / edit…", true).map_err(|e| e.to_string())?;
    let up = item("up", "Move earlier", index > 0).map_err(|e| e.to_string())?;
    let down = item("down", "Move later", index + 1 < ids.len()).map_err(|e| e.to_string())?;
    let zoom_in = item("zoom-in", "Zoom in", account.zoom < 2.0).map_err(|e| e.to_string())?;
    let zoom_out = item("zoom-out", "Zoom out", account.zoom > 0.5).map_err(|e| e.to_string())?;
    let zoom_reset =
        item("zoom-reset", "Reset zoom", account.zoom != 1.0).map_err(|e| e.to_string())?;
    let zoom = Submenu::with_items(
        &app,
        format!("Zoom · {:.0}%", account.zoom * 100.0),
        true,
        &[&zoom_in, &zoom_out, &zoom_reset],
    )
    .map_err(|e| e.to_string())?;
    let colors = [
        ("None", None),
        ("Violet", Some("#a78bfa")),
        ("Blue", Some("#60a5fa")),
        ("Green", Some("#4ade80")),
        ("Orange", Some("#fb923c")),
        ("Pink", Some("#f472b6")),
    ];
    let color_items = colors
        .iter()
        .map(|(name, color)| {
            CheckMenuItem::with_id(
                &app,
                format!("account:{id}:color-{}", color.unwrap_or("none")),
                *name,
                true,
                account.color.as_deref() == *color,
                None::<&str>,
            )
        })
        .collect::<tauri::Result<Vec<_>>>()
        .map_err(|e| e.to_string())?;
    let color_refs: Vec<&dyn IsMenuItem<tauri::Wry>> = color_items
        .iter()
        .map(|i| i as &dyn IsMenuItem<tauri::Wry>)
        .collect();
    let colors =
        Submenu::with_items(&app, "Color tag", true, &color_refs).map_err(|e| e.to_string())?;
    let close = item("close", "Close tab", loaded).map_err(|e| e.to_string())?;
    let remove = item("remove", "Remove account…", true).map_err(|e| e.to_string())?;
    let separator = PredefinedMenuItem::separator(&app).map_err(|e| e.to_string())?;
    let menu = Menu::with_items(
        &app,
        &[
            &reload, &edit, &zoom, &colors, &up, &down, &separator, &close, &remove,
        ],
    )
    .map_err(|e| e.to_string())?;
    menu.popup(app.get_window("main").ok_or("Main window unavailable")?)
        .map_err(|e| e.to_string())
}

#[derive(Clone, Serialize)]
pub struct AccountAction {
    id: Uuid,
    action: String,
}

pub fn handle_menu(app: &AppHandle, event: tauri::menu::MenuEvent) {
    let Some((id, action)) = event
        .id()
        .as_ref()
        .strip_prefix("account:")
        .and_then(|s| s.split_once(':'))
    else {
        return;
    };
    let Ok(id) = Uuid::parse_str(id) else {
        return;
    };
    if commands::account(&app.state::<AppState>(), id).is_err() {
        return;
    }
    if let Err(error) = app.emit_to(
        EventTarget::Webview {
            label: "main".into(),
        },
        "account-action",
        AccountAction {
            id,
            action: action.into(),
        },
    ) {
        tracing::warn!(%error, "Could not deliver account action");
    }
}
