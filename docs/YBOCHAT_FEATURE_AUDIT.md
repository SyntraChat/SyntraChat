# Ybochat reference audit

Inspected 2026-11-23 at commit `461d9895fdd1c40e3efcdfd14f056d4e42ae8c6b` of
[Anti-Depressants-Dev-Team/Ybochat](https://github.com/Anti-Depressants-Dev-Team/Ybochat).
The read-only checkout lives outside all three product repositories. No source or assets
are ported. Inspection is static; Ybochat was not run with real accounts.

| Source / behavior | Classification | SyntraChat mapping |
| --- | --- | --- |
| README, package.json: 14 web tabs, Windows NSIS, Linux deb/rpm/AppImage | Requires redesign | Independently authored Tauri 2 client and separate Rust installer |
| apps.js: catalog, labels, stable IDs, account partitions, zoom, mute, color | Fully reproducible | Rust validated registry and UUID account metadata; native profile directories |
| renderer.js: persistent WebViews, switching, pointer drag reorder, horizontal/vertical tabs, rename/context menus | Requires redesign | React workspace shell; native WebViews, never HTML iframes |
| settings.js/settings.html: enable/add/remove accounts, appearance, streamer/tray/startup options, debounced saves | Fully reproducible | Typed commands, validated versioned settings, atomic writes |
| themes.js: dark/midnight/light/slate, accent presets/custom, tab shape/size/names, contrast helpers | Fully reproducible | Original CSS tokens, reduced motion, keyboard focus |
| main.js/preload.js: lifecycle, single-instance, native chrome, settings windows, tray with Quit | Requires redesign | Tauri window APIs, single-instance plugin, native tray |
| main.js: autostart, start hidden, content protection | Platform-specific | OS-specific integration, explicit opt-in; no startup registration in development |
| main.js: Chrome 120 UA and disabled WebAuthentication | Requires compatibility testing | Keep actual engine identity and normal authentication; no restriction bypass |
| main.js: external http/https/mailto links; popup denial | Requires redesign | Origin allowlist, reject local/protocol URLs; explicit external browser action |
| main.js/share-picker.*: screen/window thumbnails, selection, cancellation, Windows loopback audio | Platform-specific | Engine getDisplayMedia + native consent; WebView2 and WebKitGTK require separate tests |
| server-tabs.js/server-preload.js: local-only IPC, address/port checks, encrypted saved passwords, connection ownership/pruning | Requires redesign | Rust domain validation, OS keyring, typed local-only commands |
| mumble/client.js/messages.js/protobuf.js/voice.js: TLS, capped framed protobuf, 1.4/1.5 audio, TCP voice tunnel, channel/user state, text, mute/deafen, ping/timeout | Requires redesign | Evaluate existing Rust protocol crates; async connection task, bounded channels, native Opus |
| mumble.js: server setup, certificate approval/pins, changed-cert UI, reconnect, channel tree, sanitized text, presence, speaking | Requires redesign | Separate voice milestone; CA verification plus explicit pin enrollment/change approval |
| mumble-audio.js/capture-worklet.js: 48 kHz mono, 20 ms WebCodecs Opus, VAD/PTT/continuous, jitter scheduling, meters | Requires redesign | Native audio callback + Opus worker; do not assume WebCodecs exists in WebKitGTK |
| teamspeak.js/teamspeak.html/server-tabs.js: saved server, nickname/channel/password, handler detection, ts3server launch | Platform-specific | Validated URL handed to installed TeamSpeak; no native voice engine claim |
| scripts/vencord-extension.js: CRX download/unzip/cache and Electron extension session | Requires compatibility testing | Optional separate integration; no extension download or script injection in milestone 1 |
| main.js/electron-updater: GitHub checks, download, quit/install | Requires redesign | Signed release metadata shared with custom installer; only one update mechanism |
| install.sh: package-manager selection, AppImage user install, desktop icon, uninstall | Requires redesign | Rust staging and signature verification; system packages via package managers |
| .github/workflows/build.yml: Windows/Linux build and publish on main/tags | Requires redesign | Gate artifacts on checks; no stable publishing from ordinary branch pushes |

## Security observations to avoid carrying forward

Settings are synchronously overwritten and loose renderer input is merged. Malformed
settings fall back to defaults without reporting recovery. The installer allows missing
checksum metadata/tools and authenticates no signed manifest. Vencord strips the CRX
header without verifying its signature. Certificate pin comparison is performed only
when CA validation fails, so a changed CA-valid certificate does not trigger the pin
change check. These are static observations, not a penetration test.

## Licensing

Root LICENSE explicitly grants MIT terms, copyright (c) 2026 Anti Depressants Dev Team.
README and package.json instead declare ISC; no ISC grant was found in this checkout.
Retain the MIT notice for any future substantial reuse and ask upstream to resolve the
metadata conflict before copying anything. SyntraChat is independently authored under
MIT. See THIRD_PARTY_NOTICES.md; upstream MIT text is retained there for traceability.
Vencord is a separate GPL-3.0 project and is neither bundled nor linked. Dependencies
and platform runtimes have their own licenses; generate a dependency notice inventory
before distributing binaries. This records the evidence, not a legal determination.

## Platform research

- [Tauri 2.12.7 WebviewWindowBuilder](https://docs.rs/tauri/2.12.7/tauri/webview/struct.WebviewWindowBuilder.html): native data directories on Windows/Linux; WK data-store identifier on macOS 14+; permission request hook.
- [Tauri capabilities](https://v2.tauri.app/security/capabilities/): grant only trusted local views; never opt remote origins into capabilities.
- [Mumble protocol crate](https://docs.rs/mumble-protocol/latest/mumble_protocol/) and [mum](https://github.com/mum-rs/mum): existing protocol/daemon options; protocol coverage, recent maintenance, certificate policy and licensing require a spike before selection. Compare mumble-rs and mumble-client-protocol as alternatives.
- [Official Vencord browser installation](https://docs.vencord.dev/installing/): Chromium extensions/userscripts exist; WebKit extensions are not Chromium extensions. Windows extension APIs alone do not prove Vencord compatibility. Integration remains unavailable pending verified packages, consent and tests.

No native TeamSpeak embedding equivalent is implemented. No parity, logged-in service
compatibility, account terms acceptance, media support, or performance improvement is inferred from a URL responding.
