# Verification record — 2026-11-23

Host: Windows, x86_64 MSVC, rustc/cargo 1.99.1, Node 26.13.0, npm 11.20.0.
Tauri 2.12.7 / CLI 2.12.6. This record describes local checks, not remote CI results.

- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm test`: five component/security-boundary interaction tests passed. Native commands
  mocked only in tests; these do not certify real WebView behavior.
- axe structural accessibility: passed; color-contrast omitted because jsdom has no layout.
- `npm run build`: passed; production frontend bundled successfully.
- `cargo fmt --check`: passed.
- `cargo clippy --all-targets -- -D warnings`: passed.
- `cargo test`: six validation/persistence/profile-path tests and one capability/profile-identity regression test passed.
- `npm run tauri -- build --debug --no-bundle`: built a runnable Windows executable.
- npm dependency installation audit: zero known reported vulnerabilities at install time.
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
