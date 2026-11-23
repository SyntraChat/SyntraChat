fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&[
            "snapshot",
            "add_account",
            "edit_account",
            "remove_account",
            "set_appearance",
            "open_account",
            "reload_account",
            "close_account",
            "quit",
            "show_home",
            "set_content_visible",
        ]),
    ))
    .expect("Tauri build configuration failed");
}
