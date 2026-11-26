# SyntraChat

An independently authored multi-messenger workspace using **Tauri 2, Rust and strict
TypeScript/React**. Windows and Linux are the primary targets. No Electron runtime,
bundled Chromium or background HTTP server.

**0.2.0 development preview — not a stable release.** The Windows application builds and
has been smoke-tested. Accounts open as native child WebViews in the main window. Logged-in
messaging, persistent login isolation, Linux runtime behavior, voice, media,
notifications and installation/update lifecycle are not certified.

Implemented: validated service/custom HTTPS accounts, UUID profiles, embedded account tabs, lazy opening,
focus/reload/close, rename/zoom, removal with confirmation (retains session), atomic
metadata persistence, five themes, custom accent, account search, Ctrl+K quick switcher,
diagnostics and a real Quit action. Remote pages receive no privileged capabilities.
Media and downloads are denied. Cross-origin sign-in and popups are blocked.

The 0.2 development batch adds workspaces, folder groups, pinned accounts, custom PNG
account images, font/spacing/color controls, and validated theme import/export. Desktop
settings include a tray, optional close-to-tray, launch at login, a configurable global
show/hide shortcut and session restoration. These options default off. Mattermost and
Zulip accept your server's HTTPS URL; all service presets remain experimental.

Settings migrate from schema 1 to 2 when saved. Existing account IDs and session stores
are retained. Older 0.1 clients cannot read schema 2; back up settings before downgrading.
The published 0.1.0 installer remains pinned to its original source revision.

```powershell
npm ci
npm run desktop:dev
```

Requires Rust stable >=1.90, Node >=22.12 (24 LTS recommended), and the platform's Tauri
prerequisites. [Development](docs/DEVELOPMENT.md) · [Building](docs/BUILDING.md) ·
[Feature matrix](docs/FEATURE_MATRIX.md) · [Verification](docs/VERIFICATION.md) ·
[Reference audit](docs/YBOCHAT_FEATURE_AUDIT.md) · [Architecture](docs/ARCHITECTURE.md) ·
[Threat model](docs/THREAT_MODEL.md) · [Milestones](docs/MIGRATION_PLAN.md).

0.1.0 preview packages and PowerShell/shell installers are managed by the
[installer repository](https://github.com/SyntraChat/SyntraChat-Installer/releases).
The macOS package requires macOS 14+ and uses per-account WebKit data stores.

Exactly three primary repositories: this client,
[installer](https://github.com/SyntraChat/SyntraChat-Installer),
and [community](https://github.com/SyntraChat/.github). Each has independent Git history.
See [publishing](docs/PUBLISHING.md) for repository and push details.

The Ybochat checkout is a read-only functional reference, outside the product repositories.
No Electron code, credentials or session stores are imported. Service glyphs are adapted
from the reference's MIT-licensed catalog with attribution. MIT; upstream license
conflict and attribution evidence are recorded in [notices](THIRD_PARTY_NOTICES.md).
