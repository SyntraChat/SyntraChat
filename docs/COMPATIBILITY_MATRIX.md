# Compatibility matrix

Research date: 2026-11-23. URL probes are availability checks only (see SERVICE_PROBES.jsonl).
Every service still requires authenticated send/receive, uploads/downloads, restart,
notification and media tests using authorized test accounts. No real accounts were supplied.

| Service | Candidate entry URL | Current status |
| --- | --- | --- |
| Discord | https://discord.com/app | Registered; authenticated compatibility untested |
| Telegram K | https://web.telegram.org/k/ | Registered; authenticated compatibility untested |
| Telegram A | https://web.telegram.org/a/ | Registered; authenticated compatibility untested |
| WhatsApp | https://web.whatsapp.com/ | Registered; pairing/compatibility untested |
| Slack | https://app.slack.com/ | Registered; cross-origin workspace/SSO navigation restricted pending tests |
| Steam Chat | https://steamcommunity.com/chat/ | Registered; login redirects restricted pending tests |
| Cinny | https://app.cinny.in/ | Registered; homeserver compatibility untested |
| Element | https://app.element.io/ | Registered; SSO redirects restricted pending tests |
| Stoat | https://stoat.chat/app | Candidate from source; probe before enabling |
| Fluxer | https://web.fluxer.app | Candidate from source; probe before enabling |
| Yapper | https://www.yapper.website/ | Candidate from source; probe before enabling |
| Wire | https://app.wire.com/ | Registered; authenticated compatibility untested |
| Threema | https://web.threema.ch/ | Registered; pairing/compatibility untested |
| Vencord | https://discord.com/app | Not enabled; third-party GPL extension needs verified distribution and compatibility tests |
| Mumble | Native protocol | Separate voice milestone; no voice client shipped in checkpoint |
| TeamSpeak | ts3server protocol | Separate native handoff milestone; requires installed client |

| Capability | Windows / WebView2 | Linux / WebKitGTK | macOS / WKWebView |
| --- | --- | --- | --- |
| Persistent profiles | Separate data directories implemented; two-profile runtime test required | API supports separate data directories; runtime isolation test required | Gate opening until macOS 14+ datastore path tested |
| Microphone/camera | Denied in checkpoint | Denied in checkpoint | Denied in checkpoint |
| Screen share/system audio | Unavailable in checkpoint; native picker investigation required | PipeWire/portal and Wayland/X11 tests required | Untested |
| Downloads | Denied until save dialog and destination policy implemented | Same | Same |
| Clipboard/upload | Engine/user gesture behavior; not declared supported until tested | Same | Same |
| Popup/OAuth | Denied; only same-origin navigation allowed | Same | Same |
| Extensions | WebView2 APIs exist; Vencord not verified | WebKit extension ABI differs from Chromium | Chromium extensions unavailable |

Blocked cross-origin navigation is deliberately visible in documentation; users can open
the configured service in their system browser. Never relax to a wildcard to fix login.
