# Architecture

SyntraChat owns local metadata and native windows. Messaging sites own authentication
and messages inside OS WebViews. React never reads site DOM, cookies or credentials.
Node is build tooling only; there is no HTTP backend or embedded Chromium distribution.

The first functional checkpoint intentionally uses separate native account windows.
It establishes profile isolation and the command boundary before an embedded multi-view
workspace is introduced. The shell clearly labels this behavior. Closing an account
window preserves its profile. Windows/Linux use app-local `profiles/<uuid>` directories.
macOS account opening is gated until datastore isolation and minimum OS are tested.

| Subsystem | Interface / ownership |
| --- | --- |
| Core | Tauri lifecycle, main trusted shell, single-instance focus |
| Registry | Rust built-in definitions; HTTPS/origin validation for custom accounts |
| Accounts | UUIDs, labels, service URL/origin, zoom; Rust validates all input |
| Settings | Versioned serde schema; validate on load; tempfile + sync + atomic persist; fail visibly on corruption |
| Views | Lazy create/focus/reload/close; no remote capabilities; navigation and popup policies |
| Workspaces | Planned references to account IDs; never duplicate storage |
| Notifications | Planned documented APIs only; no scraping or badge fabrication |
| Voice | Planned async native protocol/audio tasks; no credentials in frontend state |
| Updates | Planned signed manifest verification shared by contract with installer |
| Diagnostics | Version, OS, engine family and actual open view count; unknown metrics stay unknown |

Typed application commands require both ACL permission and the `main` caller label.
There is no filesystem, shell, arbitrary eval, HTTP proxy, or arbitrary-window creation
command. Main cannot navigate to remote content. Remote pages have no capabilities,
even when they navigate or create subframes. IPC accepts account IDs, not disk paths.

Avoid SQLite until metadata query complexity warrants it. React local state suffices
for the checkpoint; add a store only when shared subscriptions justify one. No polling.
Advanced tray, credentials, notification, audio and updater plugins are introduced only
with tested user-facing behavior. Development uses `org.syntrachat.desktop.dev`; release
build configuration explicitly overrides it to `org.syntrachat.desktop`.
