# Development

## Windows

Install Rust stable >=1.90 with the MSVC toolchain, Visual Studio Build Tools with Desktop
development with C++ and a Windows SDK, Microsoft WebView2 Evergreen Runtime, Git and
Node >=22.12. Use Node 24 LTS for CI parity.

```powershell
npm ci
npm run desktop:dev
```

Vite listens on 127.0.0.1:1420 with a fixed port. Node only builds/serves frontend assets
in development; it is not part of the distributed app. Browser-only `npm run dev` has no
native bridge and displays errors; it does not simulate successful native features.

## Linux

On Debian/Ubuntu install build-essential, curl, wget, file, libssl-dev, libwebkit2gtk-4.1-dev,
libayatana-appindicator3-dev, librsvg2-dev and patchelf. Install Rust and Node as above.
For Fedora/openSUSE use corresponding WebKitGTK 4.1 development packages. Arch uses
webkit2gtk-4.1 and the development toolchain. Package names differ by release; consult
[Tauri prerequisites](https://v2.tauri.app/start/prerequisites/). Linux is not locally tested.

## Checks

```powershell
npm run typecheck
npm run lint
npm test
npm run build
cargo fmt --manifest-path src-tauri/Cargo.toml --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

UI test native responses are mocked only in test files. Rust tests use temporary directories.
Never run tests against production profiles. Development identifier is
`org.syntrachat.desktop.dev`; only the release config selects `org.syntrachat.desktop`.
Settings use app_config_dir/settings.json; profiles use app_local_data_dir/profiles/UUID.

When a settings file is corrupt or has an unsupported version, the shell shows the error
and keeps the file unchanged. Quit, back it up, and repair valid version-1 JSON or rename
it to start fresh. Do not delete WebView profile directories while their engines run.
