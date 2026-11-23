# Release engineering contract

No release is published automatically in this checkpoint. CI uploads preview artifacts
only. Stable is blocked on all acceptance gates in MIGRATION_PLAN.md and FEATURE_MATRIX.md.
macOS builds are secondary and not enabled in CI yet.

Use one update authority: signed schema-1 release manifests consumed by the Rust installer
verification core. Do not simultaneously enable the stock Tauri updater. An update manager
and safe installer handoff must be implemented before any automatic update UI is exposed.
The current client does not check for or download updates.

The installer README defines the exact manifest and detached raw 64-byte Ed25519 signature.
Sign the exact manifest bytes; verify before parsing. Every artifact is SHA-256/size bound.
The application ID, channel, target and monotonic SemVer are checked. Schema 1 is a baseline;
anti-replay state, expiry, authenticated key rotation and release notes need design/tests
before network distribution. Never treat an adjacent checksum as authentication.

1. Generate a release Ed25519 key using an audited offline signing utility; document its
   version/format and roundtrip verification. Keep the private seed in protected offline
   storage or an approved CI secret, never Git or logs. No production key is generated here.
2. Build/test Windows and Linux artifacts, collect dependency licenses and SBOMs. Sign
   Windows executables where credentials exist. Notarize macOS when supported.
3. Name artifacts `SyntraChat-<version>-<target>.<ext>`. Generate SHA-256/size metadata and
   sign the exact bounded manifest. Test invalid signatures and wrong targets/channels.
4. Embed the trusted public key in the installer at compile time using
   SYNTRACHAT_RELEASE_PUBLIC_KEY_HEX. Build/test installer against the real manifest.
5. Publish prereleases to GitHub Releases; only promote stable after native integration,
   download verification, installation/rollback and service compatibility gates pass.
6. Verify uploaded bytes independently after downloading. Never publish keys in artifacts.

For rotation, ship authenticated new trust metadata signed by an already-trusted key before
retiring it. A key fetched from the same untrusted endpoint is not trusted. Schema-1 tooling
does not yet implement rotation, expiry, revocation or automatic restart/installation.
