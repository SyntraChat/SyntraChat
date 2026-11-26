use crate::{
    commands::{self, AppState},
    preferences::{Customization, Workspace},
    views,
};
use tauri::{AppHandle, Manager, State, Webview};
use tauri_plugin_dialog::DialogExt;
use uuid::Uuid;

#[tauri::command]
pub fn save_workspace(
    caller: Webview,
    state: State<AppState>,
    id: Option<Uuid>,
    name: String,
) -> Result<(), String> {
    commands::trusted(&caller)?;
    let name = crate::settings::label(&name).map_err(|e| e.to_string())?;
    commands::update(&state, |s| {
        if let Some(id) = id {
            s.workspaces
                .iter_mut()
                .find(|w| w.id == id)
                .ok_or("Workspace no longer exists")?
                .name = name;
        } else {
            s.workspaces.push(Workspace {
                id: Uuid::new_v4(),
                name,
            });
        }
        Ok(())
    })
}

#[tauri::command]
pub fn remove_workspace(
    caller: Webview,
    app: AppHandle,
    state: State<AppState>,
    id: Uuid,
) -> Result<(), String> {
    commands::trusted(&caller)?;
    commands::update(&state, |s| {
        s.remove_workspace(id).map_err(|e| e.to_string())
    })?;
    let _ = app.emit_to(
        tauri::EventTarget::Webview {
            label: "main".into(),
        },
        "workspace-updated",
        (),
    );
    Ok(())
}

use tauri::Emitter;

#[tauri::command]
pub fn select_workspace(
    caller: Webview,
    app: AppHandle,
    state: State<AppState>,
    id: Option<Uuid>,
) -> Result<(), String> {
    commands::trusted(&caller)?;
    commands::update(&state, |s| {
        s.active_workspace = id;
        s.last_active = None;
        Ok(())
    })?;
    *app.state::<views::Workspace>()
        .active
        .lock()
        .map_err(|_| "Workspace lock failed")? = None;
    views::set_visible(&app, false)
}

#[tauri::command]
pub fn set_customization(
    caller: Webview,
    state: State<AppState>,
    customization: Customization,
    theme: Option<String>,
    accent: Option<String>,
) -> Result<(), String> {
    commands::trusted(&caller)?;
    commands::update(&state, |s| {
        s.customization = customization;
        if let Some(theme) = theme {
            s.theme = theme;
        }
        if let Some(accent) = accent {
            s.accent = accent;
        }
        Ok(())
    })
}

#[tauri::command]
pub async fn export_theme(
    caller: Webview,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    commands::trusted(&caller)?;
    let data = {
        let guard = state.store.lock().map_err(|_| "Settings lock failed")?;
        let s = &guard.as_ref().map_err(Clone::clone)?.settings;
        serde_json::to_vec_pretty(&serde_json::json!({"format":"syntrachat-theme", "version":1, "theme":s.theme, "accent":s.accent, "customization":s.customization})).map_err(|e| e.to_string())?
    };
    let window = app.get_window("main").ok_or("Main window unavailable")?;
    if let Some(file) = app
        .dialog()
        .file()
        .set_parent(&window)
        .add_filter("Theme JSON", &["json"])
        .set_file_name("SyntraChat-theme.json")
        .blocking_save_file()
    {
        let path = file.into_path().map_err(|e| e.to_string())?;
        std::fs::write(path, data).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn restore_session(
    caller: Webview,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    commands::trusted(&caller)?;
    if app
        .state::<views::Workspace>()
        .restore_attempted
        .swap(true, std::sync::atomic::Ordering::AcqRel)
    {
        return Ok(());
    }
    let (enabled, ids, active) = {
        let guard = state.store.lock().map_err(|_| "Settings lock failed")?;
        let s = &guard.as_ref().map_err(Clone::clone)?.settings;
        (s.desktop.restore_session, s.session.clone(), s.last_active)
    };
    if !enabled {
        return Ok(());
    }
    let mut errors = vec![];
    for id in ids {
        if let Err(error) = commands::open(&app, &state, id, false) {
            errors.push(error);
        }
    }
    *app.state::<views::Workspace>()
        .active
        .lock()
        .map_err(|_| "Workspace lock failed")? =
        active.filter(|id| app.get_webview(&format!("account-{id}")).is_some());
    views::set_visible(&app, true)?;
    if errors.is_empty() {
        Ok(())
    } else {
        Err(format!(
            "Some saved tabs could not be restored: {}",
            errors.join("; ")
        ))
    }
}
