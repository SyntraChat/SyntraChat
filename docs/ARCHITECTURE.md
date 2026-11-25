# Architecture

SyntraChat owns local metadata and native windows. Messaging sites own authentication
and messages inside OS WebViews. React never reads site DOM, cookies or credentials.
Node is build tooling only; there is no HTTP backend or embedded Chromium distribution.

Accounts are native child WebViews attached to one Window. The trusted React shell fills
the window; remote views occupy the area right of the 56px rail and below the 42px toolbar.
The optional horizontal layout reserves a full-width 42px tab strip below that toolbar.
Rust creates, switches, hides, resizes and closes these views. Local dialogs temporarily
hide remote content to avoid native views obscuring the dialog. Closing an account tab
preserves its profile. Windows/Linux use app-local `profiles/<uuid>` directories.
macOS account opening is gated until datastore isolation and minimum OS are tested.

| Subsystem | Interface / ownership |
| --- | --- |
| Core | Tauri lifecycle, main trusted shell, single-instance focus |
| Registry | Rust built-in definitions; HTTPS/origin validation for custom accounts |
| Accounts | UUIDs, labels, service URL/origin, zoom; Rust validates all input |
| Settings | Versioned serde schema; validate on load; tempfile + sync + atomic persist; fail visibly on corruption |
| Views | Lazy child-view create/focus/reload/close; active tab selection; native bounds/DPI updates; no remote capabilities |
| Workspaces | Planned references to account IDs; never duplicate storage |
| Notifications | Planned documented APIs only; no scraping or badge fabrication |
| Voice | Planned async native protocol/audio tasks; no credentials in frontend state |
| Updates | Planned signed manifest verification shared by contract with installer |
| Diagnostics | Version, OS, engine family and actual open view count; unknown metrics stay unknown |

Typed application commands require both ACL permission and the `main` WebView caller label.
Capabilities target `webviews: ["main"]`, with no window-wide grant that could include
remote children. The caller is a Webview, not a WebviewWindow wrapper.
Native account menus emit actions only to the main WebView. Its event permissions allow
listening/unlistening, with no event-emission grant. Reordering requires a complete,
duplicate-free permutation of saved account UUIDs. Optional color and layout fields
default safely when older settings are loaded; their values pass Rust validation.
There is no filesystem, shell, arbitrary eval, HTTP proxy, or arbitrary-window creation
command. Main cannot navigate to remote content. Remote pages have no capabilities,
even when they navigate or create subframes. IPC accepts account IDs, not disk paths.

Avoid SQLite until metadata query complexity warrants it. React local state suffices
for the checkpoint; add a store only when shared subscriptions justify one. No polling.
Advanced tray, credentials, notification, audio and updater plugins are introduced only
with tested user-facing behavior. Development uses `org.syntrachat.desktop.dev`; release
build configuration explicitly overrides it to `org.syntrachat.desktop`.

Tauri 2.12.7 is pinned exactly because its multi-WebView API currently requires the
`unstable` Cargo feature. The application remains on the stable Tauri release and OS
WebView engines; upgrading Tauri requires reviewing API/behavior changes and native tests.
