# Feature status

| Feature | Checkpoint status |
| --- | --- |
| Tauri/Rust executable, React shell | Windows build and native launch verified |
| Account creation/metadata restart | Windows native smoke test and unit/component tests |
| Custom HTTPS service, rename, zoom, remove confirmation | Implemented; component/backend validation tests; all native flows not yet manually covered |
| Embedded account tabs, focus/reload/close, resize | Implemented using native child WebViews; existing profiles retained |
| Separate persistent profile directories | Implemented Windows/Linux; directory separation unit-tested; runtime cookie/login isolation not yet verified |
| Service registry | 15 experimental web entries; Mattermost/Zulip accept a server HTTPS URL; no authenticated messaging certification |
| Dark/light/OLED/midnight/system and accent | Implemented; persistence unit tests; full visual/theme native test pending |
| Ctrl+K, account search, keyboard dialog escape | Implemented; interaction tests and native Ctrl+K smoke test |
| Diagnostics, actual loaded view count, Quit | Implemented; engine version/memory/startup unknown |
| Versioned settings, atomic saving | Schema 1 to 2 migration tested; invalid/corrupt/future schemas rejected without overwriting; no Electron session import |
| Account reorder, color tags, native menus, sidebar/top tabs | Implemented; Windows native drag/menu/layout/restart smoke tests; backend validation tests |
| Workspaces, folder groups, pinning, account images | Implemented; component/backend validation tests; workspace removal retains accounts and profiles |
| Theme editor and import/export | Implemented; font/spacing/colors, contrast validation, native theme Save As; theme JSON contains no accounts or sessions |
| Session restoration | Opt-in; saved open account IDs and last active tab; partial failures remain recoverable |
| Session-data deletion option and backup/restore | Planned; account removal currently retains session |
| Mute, unread badges, notifications, DND | Unavailable; no fabricated indicators |
| Tray, autostart, global shortcut | Implemented with official plugins; opt-in startup/hide behavior; OS registration/runtime coverage incomplete |
| Deep links | Planned |
| Calls, microphone/camera, screen share, downloads | Denied in checkpoint; origin consent/save UX required |
| Mumble | Researched; native protocol/audio milestone pending |
| TeamSpeak | Researched; saved-server/handoff milestone pending |
| Vencord | Not bundled/enabled; extension security/compatibility milestone pending |
| Update channels, signed network updates | Contract researched; verification core in installer; no client update manager |
| Installers and packaging | Installer repository owns native Setup/PKG, DEB/RPM/Arch/AppImage/Flatpak, CLI scripts and Linux GUI wrapper; preview build gates apply |
| Linux runtime, macOS | Native release build checks; macOS 14+ UUID data stores implemented; authenticated runtime not certified |
| CI | Frontend, Rust checks and native Windows/Linux/macOS builds; release builds verified for 0.1.0; development run status recorded separately |
| Stable-release acceptance | Not satisfied |
