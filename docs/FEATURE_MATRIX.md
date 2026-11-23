# Feature status

| Feature | Checkpoint status |
| --- | --- |
| Tauri/Rust executable, React shell | Windows build and native launch verified |
| Account creation/metadata restart | Windows native smoke test and unit/component tests |
| Custom HTTPS service, rename, zoom, remove confirmation | Implemented; component/backend validation tests; all native flows not yet manually covered |
| Embedded account tabs, focus/reload/close, resize | Implemented using native child WebViews; existing profiles retained |
| Separate persistent profile directories | Implemented Windows/Linux; directory separation unit-tested; runtime cookie/login isolation not yet verified |
| Service registry | 13 experimental web entries; Steam verified by GET after misleading HEAD response; Vencord/voice tracked separately |
| Dark/light/OLED/midnight/system and accent | Implemented; persistence unit tests; full visual/theme native test pending |
| Ctrl+K, account search, keyboard dialog escape | Implemented; interaction tests and native Ctrl+K smoke test |
| Diagnostics, actual loaded view count, Quit | Implemented; engine version/memory/startup unknown |
| Versioned settings, atomic saving | Implemented; invalid/corrupt/future schemas rejected without overwriting; no legacy migration/import |
| Reorder, multiple workspaces, pinning/layout options | Planned |
| Session-data deletion option and backup/restore | Planned; account removal currently retains session |
| Mute, unread badges, notifications, DND | Unavailable; no fabricated indicators |
| Tray, autostart, deep links, global/configurable shortcuts | Planned; OS-native chrome is present |
| Calls, microphone/camera, screen share, downloads | Denied in checkpoint; origin consent/save UX required |
| Mumble | Researched; native protocol/audio milestone pending |
| TeamSpeak | Researched; saved-server/handoff milestone pending |
| Vencord | Not bundled/enabled; extension security/compatibility milestone pending |
| Update channels, signed network updates | Contract researched; verification core in installer; no client update manager |
| Rust installer/uninstaller | Independent verification CLI/library implemented; install lifecycle/GUI not implemented |
| Linux runtime, macOS, portable mode | Not verified; macOS account opening explicitly gated |
| CI | Workflows prepared locally; remote run not yet verified |
| Stable-release acceptance | Not satisfied |
