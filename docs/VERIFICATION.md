# Verification record

## 0.2 development batch — 2026-11-26

- Frontend: 29 tests pass, including workspace filtering/removal confirmation,
  pin-aware native shortcut dispatch, theme customization/import rejection,
  explicit desktop Save, partial session restore, blocked navigation and local
  raster image conversion. TypeScript, ESLint and Prettier checks pass.
- Rust: 14 unit tests plus one capability regression test pass. Coverage includes
  schema 1 migration without eager overwrite, workspace removal retaining account
  and session IDs, invalid references/themes/chords, bounded PNG decoding and
  self-hosted Mattermost/Zulip URLs. Formatting and Clippy with warnings denied pass.
- Windows native preview: existing four accounts survived migration; created a
  labelled preview workspace and local Mattermost test entry with folder/pin;
  confirmed filtering, same-window public service loading and restoring open views
  and the active workspace/tab after restart. No credentials entered or messages sent.
- Native shortcuts initially failed when WebView2 consumed accelerator messages.
  Added a Windows controller accelerator handler for app chords; verified Ctrl+1,
  Ctrl+K, Ctrl+, and Ctrl+Q with remote content focused. Remote IPC remains disabled.
- Exported theme through the native Save As dialog to a test file and inspected its
  contents: theme/accent/customization only, no account or session metadata.
- Selected the existing app PNG through the native file picker, verified the
  converted preview, saved it and observed the custom icon in the rail and account row.
- GitHub CI for implementation commit `deb6af7`: frontend, dependency audit and native
  Windows/Linux/macOS formatting, Clippy, tests and executable builds all passed
  ([Client checks](https://github.com/SyntraChat/SyntraChat/actions/runs/45894049193)).
  The separate [CodeQL scan](https://github.com/SyntraChat/SyntraChat/actions/runs/45894048644)
  also passed. Cargo audit retains the six upstream warnings in DEPENDENCY_AUDIT.md.

OS login startup registration, global shortcut registration, all tray interactions,
authenticated service isolation, and
Linux/macOS desktop runtime remain unverified. The development profile retains clearly labelled test metadata;
the published 0.1.0 installer and source tag are unchanged.

## Account workflow bug hunt — 2026-11-25

The reported overlapping menus came from independent HTML details elements in each
account row. Rows now use the existing native menu, so no inline dropdown can stay open
over another row. Removed the duplicate dropdown markup and styles.

Additional fixes preserve saved zoom values (including 110%, 67% and values outside the
menu's preset steps) when renaming, replace an existing dialog when opening Ctrl+K,
reject overlapping commands synchronously, and ignore older snapshot responses. The
native action listener stays subscribed across refreshes and reads current account data.

- Frontend tests: 20 passed, including regressions for the issues above and account
  removal confirmation through native menu dispatch.
- TypeScript checking, ESLint, Prettier and production frontend build passed.
- Rust tests: nine unit tests and one capability regression test passed; no Rust source
  or capability changes were required for these fixes.
- Rebuilt and launched the Windows preview. Native smoke test opened/dismissed menus
  on both rows, selected Edit for the second account, replaced Edit with Quick switch,
  then dismissed it. Observed one dialog and no lingering HTML dropdowns.

This is a targeted code review and regression pass, not proof that the application has
no remaining bugs. Authenticated service behavior, Linux runtime and cross-DPI native
behavior remain outside this check. No credentials were entered or accounts deleted.

## Compact account controls — 2026-11-25

- TypeScript checking, ESLint and the production frontend build passed.
- Frontend tests: 13 passed, including menu action dispatch, layout selection, pointer
  reordering and bounded zoom steps.
- Rust tests: nine unit tests and one capability regression test passed. New checks
  cover older settings defaults, saved colors/layout, invalid permutations and both
  native content layouts. Rust formatting and Clippy with warnings denied passed.
- Built the Windows development executable with the embedded frontend.
- Native Windows smoke test: service icons rendered, the native account color submenu
  applied a blue tag, top tabs changed the layout, and the layout/tag restored after
  restart. Pointer dragging reordered two accounts without opening one accidentally.
  Opening Discord then rendered its login page inside the same window, aligned below
  the horizontal tabs. No login credentials were entered.

The saved development accounts remain available for review. Linux runtime, authenticated
session isolation and every native menu action remain unverified. Existing media and
download restrictions still apply. Static service glyphs adapted from the pinned Ybochat
source retain their MIT notice; no Electron renderer/runtime implementation was imported.

## Earlier checks — 2026-11-23

## Embedded account views

Accounts now use native child WebViews in a single application window. The stable Tauri
crate is pinned at 2.12.7 with its opt-in multi-WebView API. No profile paths were changed.

- Frontend typecheck, ESLint, production frontend build: passed.
- Frontend tests: eight passed, including active-account controls, returning to settings,
  and hiding/restoring remote content around local dialogs (native responses mocked in UI tests).
- Rust formatting, Clippy with warnings denied: passed.
- Rust tests: seven unit tests plus one capability regression test passed. Bounds tests
  reserve the rail/toolbar; capability test rejects window-wide grants to remote children.
- Windows executable built with embedded frontend: passed.
- Native Windows smoke test: opened Discord inside the main window; created a second
  development test account; opened/switched embedded tabs; observed one OS window;
  maximized the window and observed content resizing below the toolbar; opened the Add
  Account dialog over the hidden remote view and observed the account restored afterward.
  No authentication controls or real credentials were used.

The two labelled test accounts remain in the development profile. Authenticated cookie
isolation, Linux runtime, cross-DPI monitor changes and adversarial IPC tests remain
unverified. Existing media/download restrictions and dependency advisory notes still apply.

## Original foundation checkpoint

Host: Windows, x86_64 MSVC, rustc/cargo 1.99.1, Node 26.13.0, npm 11.20.0.
Tauri 2.12.7 / CLI 2.12.6. This record describes local checks, not remote CI results.

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: five component/security-boundary interaction tests plus one custom-accent
  contrast test passed. Native commands
  mocked only in tests; these do not certify real WebView behavior.
- axe structural accessibility: passed; color-contrast omitted because jsdom has no layout.
- `npm run build`: passed; production frontend bundled successfully.
- `cargo fmt --check`: passed.
- `cargo clippy --all-targets -- -D warnings`: passed.
- `cargo test`: six validation/persistence/profile-path tests and one capability/profile-identity regression test passed.
- `npm run tauri -- build --debug --no-bundle`: built a runnable Windows executable.
- npm dependency installation audit: zero known reported vulnerabilities at install time.
- Rust dependency audits completed: installer clean; client has six upstream warnings,
  including a Linux GLib soundness advisory. See DEPENDENCY_AUDIT.md for release risks.
- Separate installer: seven signature/integrity/metadata/path tests and Clippy passed.

Native Windows smoke test via Computer Use: launch embedded frontend, add a development
account labelled Native smoke test, observe persisted UUID metadata, open its native
account window, observe Discord's login page, close account window from the shell,
open Ctrl+K quick switcher, open appearance settings, close/restart app, observe saved
account metadata restored. No login, credentials, real messages or service actions used.
The test account is in the development profile only and is retained for review.
The rebuilt development executable was also started twice; only one matching process
remained, confirming the Windows single-instance gate in this local test.

Not verified: authenticated messaging, cookie/IndexedDB cross-account isolation,
production settings, Linux/macOS runtime, media, tray, download, update or install flows,
performance comparisons and remote workflows. Login page rendering is not service certification.
