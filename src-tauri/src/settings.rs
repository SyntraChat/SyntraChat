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
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct Settings {
    pub version: u32,
    pub accounts: Vec<Account>,
    pub theme: String,
    pub accent: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            version: 1,
            accounts: vec![],
            theme: "dark".into(),
            accent: "#a78bfa".into(),
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

impl Settings {
    pub fn validate(&self) -> Result<(), Error> {
        if self.version != 1 {
            return Err(Error::Invalid(
                "Unsupported settings version; original file was kept".into(),
            ));
        }
        if !["dark", "light", "oled", "midnight", "system"].contains(&self.theme.as_str())
            || self.accent.len() != 7
            || !self.accent.starts_with('#')
            || !self.accent[1..].bytes().all(|b| b.is_ascii_hexdigit())
        {
            return Err(Error::Invalid("Invalid appearance".into()));
        }
        let mut ids = HashSet::new();
        if self.accounts.len() > 100 {
            return Err(Error::Invalid("At most 100 accounts are supported".into()));
        }
        for account in &self.accounts {
            label(&account.name)?;
            validate_url(&account.url).map_err(Error::Invalid)?;
            if !ids.insert(account.id) || !(0.5..=2.0).contains(&account.zoom) {
                return Err(Error::Invalid(
                    "Duplicate account ID or invalid zoom".into(),
                ));
            }
            if account.service_id != "custom"
                && !services()
                    .iter()
                    .any(|s| s.id == account.service_id && s.url == account.url)
            {
                return Err(Error::Invalid(
                    "Unknown or modified built-in service".into(),
                ));
            }
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
        let settings = match fs::read(&path) {
            Ok(bytes) => {
                if bytes.len() > 1024 * 1024 {
                    return Err(Error::Invalid("Settings exceed size limit".into()));
                }
                serde_json::from_slice::<Settings>(&bytes)?
            }
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => Settings::default(),
            Err(e) => return Err(e.into()),
        };
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
        staged.write_all(&serde_json::to_vec_pretty(&next)?)?;
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
        };
        settings.accounts = vec![account.clone(), account];
        assert!(settings.validate().is_err());
        settings.accounts.pop();
        settings.accounts[0].zoom = f64::NAN;
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
}
