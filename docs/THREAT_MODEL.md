# Threat model

Protect account session stores, local configuration, OS privileges, voice secrets and
release authenticity. Treat service pages, custom sites, links, downloaded files and
release hosting as untrusted. A compromised OS account can read/alter local app data;
SyntraChat cannot isolate against an administrator or a compromised WebView engine.

| Boundary / threat | Checkpoint control | Remaining validation |
| --- | --- | --- |
| Remote site calls native commands | No remote capability entries or window-wide grants; only main WebView label is trusted; caller-label checks; custom app command ACL | Runtime adversarial IPC/subframe tests |
| Service navigates into trusted shell | Exact-origin HTTPS navigation allowlist; main disallows remote navigation | Engine redirects, tauri protocol and new-window tests |
| Cross-account cookie/storage leak | OS data directory per backend UUID; no frontend-chosen paths | Two-profile cookie/IndexedDB and restart tests per OS |
| Malicious custom URL | Rust HTTPS/no-userinfo validation, URL parser, max length | DNS changes/private network access are ordinary website behavior; no native HTTP proxy |
| Arbitrary shell/filesystem calls | No shell/filesystem plugin or generic path command | Full capability audit before adding native integrations |
| Capture, geolocation, clipboard, notifications, downloads | Permission hook denies requests; download handler denies; no script injection | Runtime consent behavior, OS-engine-specific paths |
| Corrupt or incompatible config | Strict serde schema, duplicate-ID/range checks; fail visibly without reset; atomic tempfile replacement | Recovery/backup UX and future migrations |
| Secrets in diagnostics | No URL/token logging, no telemetry; metadata only | Redaction tests when logging/voice expands |
| Malicious update/artifact | Installer Ed25519 exact-byte verify before parse, schema/target/channel/version/path/hash/size validation | No network update/install path yet; expiry/key rotation/anti-replay state required |
| Accidental data deletion | Remove dialog retains profiles; no recursive-delete native command | Confirmed engine-shutdown-safe deletion workflow |

Profile data contains service secrets managed by the OS engine, not by React or settings
JSON. Do not export it. OS keyring-backed voice credential storage is not implemented;
no password entry or save controls are exposed. Cross-origin SSO is blocked rather than
silently enlarging navigation privileges. No executable remote configuration is supported.

The CSP restricts the local shell. It is not a replacement for third-party sites' own CSP,
engine sandboxing, or network policies. No user-agent spoofing or CAPTCHA/login bypass.
