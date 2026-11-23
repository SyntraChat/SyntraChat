# Dependency audit — 2026-11-23

Ran cargo-audit 0.23.0 against the fetched RustSec advisory database (1,563 advisories).
Client lockfile scan: 478 locked crates, exit 0, six upstream warnings. No advisory
ignore list or suppression was added. A zero exit code does not make these warnings safe.

| Dependency | Advisory | Finding / disposition |
| --- | --- | --- |
| glib 0.18.5 | [RUSTSEC-2024-0429](https://rustsec.org/advisories/RUSTSEC-2024-0429) | VariantStrIter iterator soundness issue, patched in >=0.20.0. Tauri's GTK3/WebKitGTK stack currently depends on the 0.18 family; an arbitrary cross-version override is not a supported fix. Linux stable release requires upstream resolution or a reviewed mitigation. |
| proc-macro-error 1.0.4 | [RUSTSEC-2024-0370](https://rustsec.org/advisories/RUSTSEC-2024-0370) | Unmaintained transitive macro dependency; track upstream replacement. |
| chrono 0.4.45 | [RUSTSEC-2026-0543](https://rustsec.org/advisories/RUSTSEC-2026-0543) | Unmaintained lockfile entry; cargo tree --target all -i chrono showed no active dependency path in this feature configuration. |
| zbus_names 4.3.5 | [RUSTSEC-2026-0371](https://rustsec.org/advisories/RUSTSEC-2026-0371) | Unmaintained; Linux single-instance plugin dependency chain. |
| zvariant 5.15.1 | [RUSTSEC-2026-0370](https://rustsec.org/advisories/RUSTSEC-2026-0370) | Unmaintained; same chain. |
| zvariant_derive 5.15.1 | [RUSTSEC-2026-0372](https://rustsec.org/advisories/RUSTSEC-2026-0372) | Unmaintained; same chain. |

`cargo tree --target all` traced GLib through gtk/webkit2gtk → wry/tao/muda → Tauri.
SyntraChat does not directly call the affected iterator, but that is not proof of
unreachability inside the native stack. Do not declare Linux production-ready.

Installer lockfile scan: 36 locked crates, exit 0, no warnings or vulnerabilities reported.
Frontend npm install audit: 0 reported vulnerabilities. Rerun scans before releases;
results are point-in-time evidence and do not replace testing or dependency maintenance.
