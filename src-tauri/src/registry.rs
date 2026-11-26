use serde::Serialize;
use url::Url;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Service {
    pub id: &'static str,
    pub name: &'static str,
    pub url: &'static str,
    pub category: &'static str,
    pub limitation: &'static str,
    pub requires_url: bool,
}

pub fn services() -> Vec<Service> {
    [
        ("discord", "Discord", "https://discord.com/app", "Community"),
        ("telegram-k", "Telegram Web K", "https://web.telegram.org/k/", "Messaging"),
        ("telegram-a", "Telegram Web A", "https://web.telegram.org/a/", "Messaging"),
        ("whatsapp", "WhatsApp", "https://web.whatsapp.com/", "Messaging"),
        ("slack", "Slack", "https://app.slack.com/", "Work"),
        ("steamchat", "Steam Chat", "https://steamcommunity.com/chat/", "Gaming"),
        ("cinny", "Cinny", "https://app.cinny.in/", "Matrix"),
        ("element", "Element", "https://app.element.io/", "Matrix"),
        ("stoat", "Stoat", "https://stoat.chat/app", "Community"),
        ("fluxer", "Fluxer", "https://web.fluxer.app/", "Community"),
        ("yapper", "Yapper", "https://www.yapper.website/", "Community"),
        ("wire", "Wire", "https://app.wire.com/", "Work"),
        ("threema", "Threema", "https://web.threema.com/", "Messaging"),
        ("mattermost", "Mattermost", "https://community.mattermost.com/", "Work"),
        ("zulip", "Zulip", "https://chat.zulip.org/", "Work"),
    ].into_iter().map(|(id, name, url, category)| Service {
        id, name, url, category,
        limitation: "Experimental: login and messaging unverified; media, downloads and cross-origin sign-in disabled.",
        requires_url: server_service(id),
    }).collect()
}

pub fn server_service(id: &str) -> bool {
    matches!(id, "mattermost" | "zulip")
}

pub fn validate_url(raw: &str) -> Result<Url, String> {
    if raw.len() > 2048 {
        return Err("URL is too long".into());
    }
    let url = Url::parse(raw).map_err(|_| "Enter a complete HTTPS URL")?;
    if url.scheme() != "https"
        || url.host_str().is_none()
        || !url.username().is_empty()
        || url.password().is_some()
    {
        return Err("Use HTTPS without embedded credentials".into());
    }
    Ok(url)
}

pub fn navigation_allowed(home: &Url, target: &Url) -> bool {
    target.scheme() == "https"
        && target.origin() == home.origin()
        && target.username().is_empty()
        && target.password().is_none()
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn rejects_privileged_schemes_and_credentials() {
        for raw in [
            "javascript:alert(1)",
            "file:///etc/passwd",
            "http://example.com",
            "https://user:secret@example.com",
            "https://user@example.com",
        ] {
            assert!(validate_url(raw).is_err(), "{raw}");
        }
    }
    #[test]
    fn compares_origins_not_domain_prefixes() {
        let home = validate_url("https://discord.com/app").unwrap();
        for raw in [
            "https://discord.com.evil.test",
            "https://discord.com:444",
            "http://discord.com",
            "tauri://localhost",
            "https://user@discord.com",
        ] {
            assert!(!navigation_allowed(&home, &Url::parse(raw).unwrap()));
        }
        assert!(navigation_allowed(
            &home,
            &validate_url("https://discord.com/login").unwrap()
        ));
    }
}
