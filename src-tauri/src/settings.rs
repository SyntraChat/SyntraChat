use crate::preferences::{AccountDetails, Customization, Desktop, Workspace, validate_image};
use crate::registry::{services, validate_url};
use serde::{Deserialize, Serialize};
use std::{
    collections::HashSet,
    fs,
    io::Write,
    path::{Path, PathBuf},
};
use uuid::Uuid;

#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Settings I/O failed: {0}")]
    Io(#[from] std::io::Error),
    #[error("Settings are invalid: {0}")]
    Json(#[from] serde_json::Error),
    #[error("{0}")]
    Invalid(String),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Account {
    pub id: Uuid,
    pub service_id: String,
    pub name: String,
    pub url: String,
    pub zoom: f64,
    #[serde(default)]
    pub color: Option<String>,
    #[serde(default)]
    pub details: AccountDetails,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Settings {
    pub version: u32,
    pub accounts: Vec<Account>,
    pub theme: String,
    pub accent: String,
    #[serde(default)]
    pub horizontal_tabs: bool,
    #[serde(default)]
    pub workspaces: Vec<Workspace>,
    #[serde(default)]
    pub active_workspace: Option<Uuid>,
    #[serde(default)]
    pub customization: Customization,
    #[serde(default)]
    pub desktop: Desktop,
    #[serde(default)]
    pub session: Vec<Uuid>,
    #[serde(default)]
    pub last_active: Option<Uuid>,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            version: 2,
            accounts: vec![],
            theme: "dark".into(),
            accent: "#a78bfa".into(),
            horizontal_tabs: false,
            workspaces: vec![],
            active_workspace: None,
            customization: Customization::default(),
            desktop: Desktop::default(),
            session: vec![],
            last_active: None,
        }
    }
}

pub fn label(value: &str) -> Result<String, Error> {
    let value = value.trim();
    if value.is_empty() || value.chars().count() > 80 || value.chars().any(char::is_control) {
        return Err(Error::Invalid(
            "Use a label of 1–80 characters without control characters".into(),
        ));
    }
    Ok(value.into())
}

pub fn is_color(value: &str) -> bool {
    value.len() == 7 && value.starts_with('#') && value[1..].bytes().all(|b| b.is_ascii_hexdigit())
}

impl Settings {
    pub fn validate(&self) -> Result<(), Error> {
        if self.version != 2 {
            return Err(Error::Invalid(
                "Unsupported settings version; original file was kept".into(),
            ));
        }
        if !["dark", "light", "oled", "midnight", "system"].contains(&self.theme.as_str())
            || !is_color(&self.accent)
        {
            return Err(Error::Invalid("Invalid appearance".into()));
        }
        let mut ids = HashSet::new();
        let workspace_ids: HashSet<_> = self.workspaces.iter().map(|w| w.id).collect();
        if self.workspaces.len() > 20
            || workspace_ids.len() != self.workspaces.len()
            || self
                .active_workspace
                .is_some_and(|id| !workspace_ids.contains(&id))
        {
            return Err(Error::Invalid(
                "Invalid workspace selection or duplicate workspace".into(),
            ));
        }
        for workspace in &self.workspaces {
            label(&workspace.name)?;
        }
        let c = &self.customization;
        if !["system", "sans", "mono"].contains(&c.font.as_str())
            || !(11..=18).contains(&c.font_size)
            || c.radius > 16
            || [&c.background, &c.panel, &c.text, &c.muted]
                .iter()
                .any(|v| !is_color(v))
        {
            return Err(Error::Invalid(
                "Invalid theme: font size 11–18, corners 0–16, and hexadecimal colors required"
                    .into(),
            ));
        }
        if c.colors
            && [&c.background, &c.panel].iter().any(|bg| {
                [&c.text, &c.muted]
                    .iter()
                    .any(|text| crate::preferences::contrast(text, bg) < 4.5)
            })
        {
            return Err(Error::Invalid(
                "Theme text and muted text need at least 4.5:1 contrast against both backgrounds"
                    .into(),
            ));
        }
        if self.desktop.toggle_shortcut.len() > 80
            || self.desktop.toggle_shortcut.chars().any(char::is_control)
            || (self.desktop.global_shortcut
                && self
                    .desktop
                    .toggle_shortcut
                    .parse::<tauri_plugin_global_shortcut::Shortcut>()
                    .is_err())
        {
            return Err(Error::Invalid("Invalid desktop shortcut".into()));
        }
        if self.accounts.len() > 100 {
            return Err(Error::Invalid("At most 100 accounts are supported".into()));
        }
        for account in &self.accounts {
            label(&account.name)?;
            if (!account.details.folder.is_empty() && label(&account.details.folder).is_err())
                || account
                    .details
                    .workspace_id
                    .is_some_and(|id| !workspace_ids.contains(&id))
                || account
                    .details
                    .image
                    .as_deref()
                    .is_some_and(|image| !validate_image(image))
            {
                return Err(Error::Invalid(
                    "Invalid account workspace, folder or image".into(),
                ));
            }
            if account
                .color
                .as_deref()
                .is_some_and(|color| !is_color(color))
            {
                return Err(Error::Invalid("Invalid account color".into()));
            }
            validate_url(&account.url).map_err(Error::Invalid)?;
            if !ids.insert(account.id) || !(0.5..=2.0).contains(&account.zoom) {
                return Err(Error::Invalid(
                    "Duplicate account ID or invalid zoom".into(),
                ));
            }
            if account.service_id != "custom"
                && !services()
                    .iter()
                    .any(|s| s.id == account.service_id && (s.requires_url || s.url == account.url))
            {
                return Err(Error::Invalid(
                    "Unknown or modified built-in service".into(),
                ));
            }
        }
        let session: HashSet<_> = self.session.iter().copied().collect();
        if session.len() != self.session.len()
            || session.iter().any(|id| !ids.contains(id))
            || self.last_active.is_some_and(|id| !session.contains(&id))
        {
            return Err(Error::Invalid("Invalid saved session".into()));
        }
        Ok(())
    }

    pub fn reorder_accounts(&mut self, ids: &[Uuid]) -> Result<(), Error> {
        let unique: HashSet<_> = ids.iter().copied().collect();
        if ids.len() != self.accounts.len()
            || unique.len() != ids.len()
            || self.accounts.iter().any(|a| !unique.contains(&a.id))
        {
            return Err(Error::Invalid(
                "Account order must contain each existing account exactly once".into(),
            ));
        }
        self.accounts
            .sort_by_key(|a| ids.iter().position(|id| *id == a.id));
        Ok(())
    }

    pub fn remove_workspace(&mut self, id: Uuid) -> Result<(), Error> {
        if !self.workspaces.iter().any(|w| w.id == id) {
            return Err(Error::Invalid("Workspace no longer exists".into()));
        }
        self.workspaces.retain(|w| w.id != id);
        for account in &mut self.accounts {
            if account.details.workspace_id == Some(id) {
                account.details.workspace_id = None;
            }
        }
        if self.active_workspace == Some(id) {
            self.active_workspace = None;
        }
        Ok(())
    }
}

pub struct Store {
    pub path: PathBuf,
    pub settings: Settings,
}

impl Store {
    pub fn load(path: PathBuf) -> Result<Self, Error> {
        let mut settings = match fs::read(&path) {
            Ok(bytes) => {
                if bytes.len() > 1024 * 1024 {
                    return Err(Error::Invalid("Settings exceed size limit".into()));
                }
                serde_json::from_slice::<Settings>(&bytes)?
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Settings::default(),
            Err(e) => return Err(e.into()),
        };
        if settings.version == 1 {
            settings.version = 2;
        }
        settings.validate()?;
        Ok(Self { path, settings })
    }
    pub fn commit(&mut self, next: Settings) -> Result<(), Error> {
        next.validate()?;
        let parent = self
            .path
            .parent()
            .ok_or_else(|| Error::Invalid("Invalid settings location".into()))?;
        fs::create_dir_all(parent)?;
        let mut staged = tempfile::NamedTempFile::new_in(parent)?;
        let bytes = serde_json::to_vec_pretty(&next)?;
        if bytes.len() > 1024 * 1024 {
            return Err(Error::Invalid(
                "Settings exceed size limit; reduce custom account images".into(),
            ));
        }
        staged.write_all(&bytes)?;
        staged.as_file().sync_all()?;
        staged.persist(&self.path).map_err(|e| e.error)?;
        self.settings = next;
        Ok(())
    }
}

pub fn profile_path(root: &Path, id: Uuid) -> PathBuf {
    root.join("profiles").join(id.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn v1_migrates_in_memory_without_overwriting_or_losing_accounts() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        let original = r##"{"version":1,"accounts":[{"id":"b5293173-768d-421f-980e-581da3ffb374","serviceId":"discord","name":"Personal","url":"https://discord.com/app","zoom":1.1}],"theme":"dark","accent":"#a78bfa"}"##;
        fs::write(&path, original).unwrap();
        let mut store = Store::load(path.clone()).unwrap();
        assert_eq!(store.settings.version, 2);
        assert_eq!(store.settings.accounts[0].name, "Personal");
        assert_eq!(store.settings.accounts[0].zoom, 1.1);
        assert!(store.settings.accounts[0].details.image.is_none());
        assert!(!store.settings.desktop.launch_at_login);
        assert_eq!(fs::read_to_string(&path).unwrap(), original);
        store.commit(store.settings.clone()).unwrap();
        assert_eq!(Store::load(path).unwrap().settings.accounts.len(), 1);
    }

    #[test]
    fn workspace_removal_keeps_accounts_profiles_and_session_references() {
        let id = Uuid::new_v4();
        let account_id = Uuid::new_v4();
        let mut s = Settings::default();
        s.workspaces.push(Workspace {
            id,
            name: "Work".into(),
        });
        s.active_workspace = Some(id);
        s.accounts.push(Account {
            id: account_id,
            service_id: "custom".into(),
            name: "Test".into(),
            url: "https://example.com/".into(),
            zoom: 1.0,
            color: None,
            details: AccountDetails {
                workspace_id: Some(id),
                folder: "Team".into(),
                ..Default::default()
            },
        });
        s.session.push(account_id);
        s.last_active = Some(account_id);
        s.validate().unwrap();
        assert!(s.remove_workspace(Uuid::new_v4()).is_err());
        assert_eq!(s.workspaces.len(), 1);
        s.remove_workspace(id).unwrap();
        s.validate().unwrap();
        assert_eq!(s.accounts[0].id, account_id);
        assert!(s.accounts[0].details.workspace_id.is_none());
        assert_eq!(s.accounts[0].details.folder, "Team");
        assert_eq!(s.session, vec![account_id]);
        assert!(s.active_workspace.is_none());
    }

    #[test]
    fn references_themes_and_shortcuts_fail_closed() {
        let mut s = Settings::default();
        s.session.push(Uuid::new_v4());
        assert!(s.validate().is_err());
        s.session.clear();
        s.active_workspace = Some(Uuid::new_v4());
        assert!(s.validate().is_err());
        s.active_workspace = None;
        s.customization.colors = true;
        s.customization.text = s.customization.background.clone();
        assert!(s.validate().is_err());
        s.customization = Customization::default();
        s.desktop.global_shortcut = true;
        s.desktop.toggle_shortcut = "this is not a chord".into();
        assert!(s.validate().is_err());
        s.desktop.toggle_shortcut = "CommandOrControl+Shift+Space".into();
        s.validate().unwrap();
        assert!(
            serde_json::from_str::<Customization>(r#"{"css":"url(https://bad.test)"}"#).is_err()
        );
    }
    #[test]
    fn persistent_roundtrip_and_invalid_write_preserves_data() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        let mut store = Store::load(path.clone()).unwrap();
        let mut next = store.settings.clone();
        next.theme = "light".into();
        store.commit(next.clone()).unwrap();
        next.version = 99;
        assert!(store.commit(next).is_err());
        assert_eq!(Store::load(path).unwrap().settings.theme, "light");
    }
    #[test]
    fn corrupt_and_future_files_are_not_overwritten() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        for data in [
            "{",
            r##"{"version":99,"accounts":[],"theme":"dark","accent":"#a78bfa"}"##,
        ] {
            fs::write(&path, data).unwrap();
            assert!(Store::load(path.clone()).is_err());
            assert_eq!(fs::read_to_string(&path).unwrap(), data);
        }
    }
    #[test]
    fn duplicate_ids_and_nonfinite_zoom_rejected() {
        let mut settings = Settings::default();
        let account = Account {
            id: Uuid::new_v4(),
            service_id: "custom".into(),
            name: "Test".into(),
            url: "https://example.com/".into(),
            zoom: 1.0,
            color: None,
            details: AccountDetails::default(),
        };
        settings.accounts = vec![account.clone(), account];
        assert!(settings.validate().is_err());
        settings.accounts.pop();
        settings.accounts[0].zoom = f64::NAN;
        assert!(settings.validate().is_err());
    }
    #[test]
    fn only_server_presets_accept_a_custom_https_origin() {
        let mut settings = Settings::default();
        settings.accounts.push(Account {
            id: Uuid::new_v4(),
            service_id: "mattermost".into(),
            name: "Team".into(),
            url: "https://team.example.test/".into(),
            zoom: 1.0,
            color: None,
            details: AccountDetails::default(),
        });
        settings.validate().unwrap();
        settings.accounts[0].service_id = "zulip".into();
        settings.validate().unwrap();
        settings.accounts[0].service_id = "discord".into();
        assert!(settings.validate().is_err());
        settings.accounts[0].service_id = "mattermost".into();
        settings.accounts[0].url = "http://team.example.test/".into();
        assert!(settings.validate().is_err());
    }
    #[test]
    fn profiles_are_distinct_uuid_children() {
        let root = Path::new("app-data");
        let a = profile_path(root, Uuid::new_v4());
        let b = profile_path(root, Uuid::new_v4());
        assert_ne!(a, b);
        assert_eq!(a.parent().unwrap(), root.join("profiles"));
    }
    #[test]
    fn old_settings_gain_defaults_and_new_tab_preferences_roundtrip() {
        let old = r##"{"version":1,"accounts":[{"id":"b5293173-768d-421f-980e-581da3ffb374","serviceId":"discord","name":"Personal","url":"https://discord.com/app","zoom":1.0}],"theme":"dark","accent":"#a78bfa"}"##;
        let mut settings: Settings = serde_json::from_str(old).unwrap();
        settings.version = 2;
        assert!(!settings.horizontal_tabs);
        assert_eq!(settings.accounts[0].color, None);
        settings.horizontal_tabs = true;
        settings.accounts[0].color = Some("#60a5fa".into());
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        let mut store = Store::load(path.clone()).unwrap();
        store.commit(settings.clone()).unwrap();
        let loaded = Store::load(path).unwrap().settings;
        assert!(loaded.horizontal_tabs);
        assert_eq!(loaded.accounts[0].color.as_deref(), Some("#60a5fa"));
        settings.accounts[0].color = Some("url(https://evil.test)".into());
        assert!(settings.validate().is_err());
    }
    #[test]
    fn account_order_rejects_partial_duplicate_and_unknown_ids() {
        let id = Uuid::new_v4();
        let other = Uuid::new_v4();
        let mut settings = Settings::default();
        for id in [id, other] {
            settings.accounts.push(Account {
                id,
                service_id: "custom".into(),
                name: "Test".into(),
                url: "https://example.com/".into(),
                zoom: 1.0,
                color: None,
                details: AccountDetails::default(),
            });
        }
        for invalid in [vec![id], vec![id, id], vec![id, Uuid::new_v4()]] {
            assert!(settings.reorder_accounts(&invalid).is_err());
            assert_eq!(settings.accounts[0].id, id);
        }
        settings.reorder_accounts(&[other, id]).unwrap();
        assert_eq!(settings.accounts[0].id, other);
    }
}
