# Milestones and acceptance gates

This is a rewrite with independent history. Never import Electron sessions or tokens.

1. **Research:** commit source audit, API evidence, license record and compatibility plan.
2. **Foundation/core checkpoint:** build React/Tauri; add/rename/remove accounts, persistent
   metadata, themes, palette, isolated native account windows, strict navigation/IPC.
   Gate: formatting, Clippy, Rust tests, TypeScript, lint, frontend tests/build, Windows launch.
3. **Embedded workspace:** native child WebViews, groups/workspace references, reorder,
   live zoom/mute/navigation and loading errors. Gate real profile cookie/storage isolation,
   restart/login persistence and OAuth tests on Windows and Linux independently.
4. **Native integrations:** tray/Quit/close behavior, autostart opt-in, notifications,
   download chooser and origin-aware media consent. Gate separate Wayland/X11 testing.
5. **Voice:** evaluate Rust Mumble crates, implement verified TLS/pins and bounded control
   protocol first, then native Opus/audio/PTT/reconnect. Gate local test server and two-client
   audio integration. TeamSpeak server management/handoff gets independent handler tests.
6. **Performance:** active/background/suspended state, explicit per-account consent and call
   safety. Gate measured benchmarks; no automatic suspension without reliable call state.
7. **Installer:** verification core, signed manifests, staged per-user install with rollback,
   repair/uninstall ownership checks, then GUI and Windows shortcuts; native Linux packages.
8. **Release:** signing keys outside Git, coordinated client/installer release, channel and
   rollback protection, update UX. Gate tamper tests and downloadable artifact verification.
9. **Quality/stable:** all requested acceptance criteria and authenticated service tests pass;
   documentation reflects evidence. Unsupported Vencord/media capabilities remain explicit.

Current scope: checkpoint 1–2 and installer verification foundation. Later milestones are
tracked requirements, not implemented features. No stable release is authorized by a green
compile alone. See FEATURE_MATRIX.md and VERIFICATION.md for actual evidence.

Progress within milestone 3: native child WebViews, account switching, same-window
navigation to local settings, toolbar reload/close and resizing are implemented. Multiple
workspace grouping, reorder, authenticated isolation/SSO and Linux runtime tests remain.
