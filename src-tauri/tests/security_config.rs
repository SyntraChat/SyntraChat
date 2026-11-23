use serde_json::Value;

#[test]
fn only_local_shell_webview_receives_explicit_command_permissions() {
    let capability: Value =
        serde_json::from_str(include_str!("../capabilities/shell.json")).unwrap();
    assert_eq!(capability["local"], true);
    assert_eq!(capability["webviews"], serde_json::json!(["main"]));
    assert!(
        capability.get("windows").is_none(),
        "A window grant would include remote children"
    );
    assert!(capability.get("remote").is_none());
    for permission in capability["permissions"].as_array().unwrap() {
        let permission = permission.as_str().unwrap();
        assert!(permission.starts_with("allow-"));
        assert!(!permission.contains(':') && !permission.contains('*'));
    }
    let config: Value = serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
    assert_eq!(
        config["app"]["security"]["capabilities"],
        serde_json::json!(["shell"])
    );
    assert_eq!(config["identifier"], "org.syntrachat.desktop.dev");
    let release: Value = serde_json::from_str(include_str!("../tauri.release.conf.json")).unwrap();
    assert_eq!(release["identifier"], "org.syntrachat.desktop");
    assert!(
        config["app"]["security"]["csp"]
            .as_str()
            .unwrap()
            .contains("frame-src 'none'")
    );
}
