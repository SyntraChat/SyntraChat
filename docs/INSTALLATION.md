# Installation status

There are no published, signed stable installers. For local preview use the development
build in [BUILDING.md](BUILDING.md). Windows requires WebView2; Linux requires WebKitGTK
4.1 and native libraries. A single executable is not a verified portable distribution.

The installer repository currently provides signed-manifest/artifact verification only.
GUI, download/install/upgrade/repair/uninstall, shortcuts, elevation, package-manager
handoff, deb/rpm and AppImage validation remain planned. Never pipe a downloaded script
into a shell. Never replace a running binary. User data must survive an uninstall unless
the user explicitly confirms deletion.

Portable mode is not shipped. Moving a binary does not move its XDG/Windows app data or
make OS-bound browser credentials portable. OS credential-store behavior must be tested
before voice passwords can be remembered.
