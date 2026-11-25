use std::sync::Mutex;
use tauri::{AppHandle, LogicalPosition, LogicalSize, Manager, Rect, Window};
use uuid::Uuid;

#[derive(Default)]
pub struct Workspace {
    pub active: Mutex<Option<Uuid>>,
    pub horizontal_tabs: Mutex<bool>,
}

pub fn content_size(width: f64, height: f64, horizontal: bool) -> LogicalSize<f64> {
    let (left, top) = if horizontal {
        (0.0, 84.0)
    } else {
        (56.0, 42.0)
    };
    LogicalSize::new((width - left).max(1.0), (height - top).max(1.0))
}

pub fn bounds(window: &Window) -> tauri::Result<Rect> {
    let size = window
        .inner_size()?
        .to_logical::<f64>(window.scale_factor()?);
    let horizontal = *window
        .state::<Workspace>()
        .horizontal_tabs
        .lock()
        .map_err(|_| tauri::Error::Io(std::io::Error::other("Workspace lock failed")))?;
    Ok(Rect {
        position: if horizontal {
            LogicalPosition::new(0.0, 84.0)
        } else {
            LogicalPosition::new(56.0, 42.0)
        }
        .into(),
        size: content_size(size.width, size.height, horizontal).into(),
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
        assert_eq!(
            content_size(1180.0, 800.0, false),
            LogicalSize::new(1124.0, 758.0)
        );
        assert_eq!(
            content_size(760.0, 560.0, false),
            LogicalSize::new(704.0, 518.0)
        );
        assert_eq!(
            content_size(1180.0, 800.0, true),
            LogicalSize::new(1180.0, 716.0)
        );
        assert_eq!(content_size(0.0, 0.0, true), LogicalSize::new(1.0, 1.0));
    }
}
