# Building

Install [prerequisites](DEVELOPMENT.md), then:

```powershell
npm ci
npm run tauri -- build --debug --no-bundle
```

This embeds the frontend and produces `src-tauri/target/debug/syntrachat.exe` on Windows
or `src-tauri/target/debug/syntrachat` on Linux, using the development identifier.

```powershell
npm run desktop:build
```

This produces an optimized executable in `src-tauri/target/release`, using production
identity and storage. It is still preview code; do not distribute it as stable. No stock
NSIS installer is generated; custom packaging is a separate repository/milestone.

Icons are independently authored in public/icon.svg. Regenerate with
`npm run tauri -- icon public/icon.svg`. Lockfiles must be committed. CI builds Windows
and Ubuntu, but results are not claimed until a remote workflow actually runs.
