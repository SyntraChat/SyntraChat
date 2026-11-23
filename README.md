# SyntraChat

An independently authored multi-messenger workspace using **Tauri 2, Rust and strict
TypeScript/React**. Windows and Linux are the primary targets. No Electron runtime,
bundled Chromium or background HTTP server.

**0.1.0 foundation preview — not a stable release.** The Windows application builds and
has been smoke-tested. Accounts open as native child WebViews in the main window. Logged-in
messaging, persistent login isolation, Linux runtime behavior, voice, media, tray,
notifications and installation/update lifecycle are not certified.

Implemented: validated service/custom HTTPS accounts, UUID profiles, embedded account tabs, lazy opening,
focus/reload/close, rename/zoom, removal with confirmation (retains session), atomic
metadata persistence, five themes, custom accent, account search, Ctrl+K quick switcher,
diagnostics and a real Quit action. Remote pages receive no privileged capabilities.
Media and downloads are denied. Cross-origin sign-in and popups are blocked.

```powershell
npm ci
npm run desktop:dev
```

Requires Rust stable >=1.90, Node >=22.12 (24 LTS recommended), and the platform's Tauri
prerequisites. [Development](docs/DEVELOPMENT.md) · [Building](docs/BUILDING.md) ·
[Feature matrix](docs/FEATURE_MATRIX.md) · [Verification](docs/VERIFICATION.md) ·
[Reference audit](docs/YBOCHAT_FEATURE_AUDIT.md) · [Architecture](docs/ARCHITECTURE.md) ·
[Threat model](docs/THREAT_MODEL.md) · [Milestones](docs/MIGRATION_PLAN.md).

Exactly three primary repositories: this client,
[installer](https://github.com/SyntraChat/SyntraChat-Installer),
and [community](https://github.com/SyntraChat/.github). Each has independent Git history.
See [publishing](docs/PUBLISHING.md) for repository and push details.

The Ybochat checkout is a read-only functional reference, outside the product repositories.
No Electron code, assets, credentials or session stores are imported. MIT; upstream license
conflict and attribution evidence are recorded in [notices](THIRD_PARTY_NOTICES.md).
