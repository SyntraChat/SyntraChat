use base64::{Engine, engine::general_purpose::STANDARD};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct AccountDetails {
    pub workspace_id: Option<Uuid>,
    pub folder: String,
    pub pinned: bool,
    pub image: Option<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Workspace {
    pub id: Uuid,
    pub name: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct Customization {
    pub font: String,
    pub font_size: u8,
    pub radius: u8,
    pub comfortable: bool,
    pub colors: bool,
    pub background: String,
    pub panel: String,
    pub text: String,
    pub muted: String,
}

impl Default for Customization {
    fn default() -> Self {
        Self {
            font: "system".into(),
            font_size: 13,
            radius: 5,
            comfortable: false,
            colors: false,
            background: "#141419".into(),
            panel: "#1a1a21".into(),
            text: "#eeeef3".into(),
            muted: "#a1a1b1".into(),
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase", deny_unknown_fields)]
pub struct Desktop {
    pub close_to_tray: bool,
    pub launch_at_login: bool,
    pub start_hidden: bool,
    pub restore_session: bool,
    pub global_shortcut: bool,
    pub toggle_shortcut: String,
}

impl Default for Desktop {
    fn default() -> Self {
        Self {
            close_to_tray: false,
            launch_at_login: false,
            start_hidden: false,
            restore_session: false,
            global_shortcut: false,
            toggle_shortcut: "CommandOrControl+Shift+Space".into(),
        }
    }
}

pub fn validate_image(value: &str) -> bool {
    let Some(encoded) = value.strip_prefix("data:image/png;base64,") else {
        return false;
    };
    if encoded.len() > 64 * 1024 {
        return false;
    }
    let Ok(bytes) = STANDARD.decode(encoded) else {
        return false;
    };
    if bytes.len() < 33 || !bytes.starts_with(b"\x89PNG\r\n\x1a\n") || &bytes[12..16] != b"IHDR" {
        return false;
    }
    let width = u32::from_be_bytes(bytes[16..20].try_into().unwrap());
    let height = u32::from_be_bytes(bytes[20..24].try_into().unwrap());
    (1..=128).contains(&width)
        && (1..=128).contains(&height)
        && tauri::image::Image::from_bytes(&bytes).is_ok()
}

pub fn contrast(a: &str, b: &str) -> f64 {
    let luminance = |hex: &str| {
        let channel = |offset| {
            let value =
                u8::from_str_radix(&hex[offset..offset + 2], 16).unwrap_or(0) as f64 / 255.0;
            if value <= 0.04045 {
                value / 12.92
            } else {
                ((value + 0.055) / 1.055).powf(2.4)
            }
        };
        channel(1) * 0.2126 + channel(3) * 0.7152 + channel(5) * 0.0722
    };
    let (a, b) = (luminance(a), luminance(b));
    (a.max(b) + 0.05) / (a.min(b) + 0.05)
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn images_are_small_raster_pngs_only() {
        let png = format!(
            "data:image/png;base64,{}",
            STANDARD.encode(include_bytes!("../icons/32x32.png"))
        );
        assert!(validate_image(&png));
        for bad in [
            "https://example.com/a.png",
            "data:image/svg+xml,<svg/>",
            "data:image/png;base64,AAAA",
        ] {
            assert!(!validate_image(bad));
        }
        let mut bytes = STANDARD.decode(png.split(',').nth(1).unwrap()).unwrap();
        bytes[16..20].copy_from_slice(&10000u32.to_be_bytes());
        assert!(!validate_image(&format!(
            "data:image/png;base64,{}",
            STANDARD.encode(bytes)
        )));
    }
}
