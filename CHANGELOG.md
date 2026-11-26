# Changelog

## Unreleased

### 0.2.0 development batch

- Added workspaces, folder groups, pinned accounts and validated custom account images.
- Added font, size, spacing, corner and color controls, contrast validation, theme
  import and native Save As theme export.
- Added tray Show/Quit, opt-in close-to-tray, launch at login, configurable global
  show/hide shortcut, session restoration and native application shortcuts.
- Added native loading and blocked-origin states, plus Mattermost and Zulip server presets.
- Migrated settings schema 1 to 2 while preserving account IDs and profile stores.

## 0.1.0 — foundation preview

- Replaced the app and favicon artwork with the supplied chat.png, including generated
  Windows, Linux and macOS icon formats.
- Fixed overlapping account-row menus by sharing the native tab menu. Preserved every
  saved zoom value in Edit, prevented stacked quick-switch dialogs and concurrent
  commands, and kept delayed snapshots from overwriting newer workspace state.
- Added service icons, native account menus, color tags, zoom actions and drag-to-reorder
  tabs. Added a saved choice of the compact sidebar or a horizontal tab strip.
- Embedded accounts in the main window with native child WebViews, rail switching,
  resizing, reload/close controls and dialog visibility handling. Narrowed IPC grants
  from window scope to the trusted shell WebView only; retained account profile paths.
- Simplified the interface to one slim service rail, a compact toolbar and account rows;
  moved secondary actions into an account menu and removed the dashboard cards/banners.
- Audited Ybochat at a recorded source revision and documented license discrepancies.
- Added independently authored Rust/Tauri client and strict React frontend.
- Added validated accounts, native windows, profile directories, atomic settings, themes,
  quick switcher, diagnostics, tests and Windows/Linux build workflows.
- Explicitly gated unverified service, media, voice, installer and update capabilities.

0.1.0 packages were published from a pinned source revision in the installer repository.
No stable version has been released.
