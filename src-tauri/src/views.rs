use std::sync::Mutex;
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, Rect, Window};
use uuid::Uuid;

#[derive(Default)]
pub struct Workspace {
    pub active: Mutex<Option<Uuid>>,
}

pub fn content_size(width: f64, height: f64) -> LogicalSize<f64> {
    LogicalSize::new((width - 56.0).max(1.0), (height - 42.0).max(1.0))
}

pub fn bounds(window: &Window) -> tauri::Result<Rect> {
    let size = window
        .inner_size()?
        .to_logical::<f64>(window.scale_factor()?);
    Ok(Rect {
        position: LogicalPosition::new(56.0, 42.0).into(),
        size: content_size(size.width, size.height).into(),
    })
}

pub fn resize(window: &Window) -> tauri::Result<()> {
    let rect = bounds(window)?;
    for view in window.webviews() {
        if view.label().starts_with("account-") {
            view.set_bounds(rect)?;
        }
    }
    Ok(())
}

pub fn set_visible(app: &AppHandle, visible: bool) -> Result<(), String> {
    let active = *app
        .state::<Workspace>()
        .active
        .lock()
        .map_err(|_| "Workspace lock failed")?;
    let selected = active.map(|id| format!("account-{id}"));
    for (label, view) in app.webviews() {
        if label.starts_with("account-") {
            if visible && selected.as_deref() == Some(label.as_str()) {
                view.show().map_err(|e| e.to_string())?;
            } else {
                view.hide().map_err(|e| e.to_string())?;
            }
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn content_leaves_rail_and_toolbar_visible_at_every_size() {
        assert_eq!(content_size(1180.0, 800.0), LogicalSize::new(1124.0, 758.0));
        assert_eq!(content_size(760.0, 560.0), LogicalSize::new(704.0, 518.0));
        assert_eq!(content_size(0.0, 0.0), LogicalSize::new(1.0, 1.0));
    }
}
