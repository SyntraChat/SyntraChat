# Repository publishing

GitHub confirmed the public repositories SyntraChat/.github, SyntraChat/SyntraChat,
and SyntraChat/SyntraChat-Installer. They already existed empty; this task did not create
an organization or a fourth repository. The desktop remote was renamed from
SyntraChat-Desktop-Tauri to SyntraChat through GitHub's API, preserving repository identity
and history. Its local folder remains D:\SyntraChat\SyntraChat-Desktop-Tauri.

Git's existing credential manager successfully published all three checkpoints. Local
`gh auth status` reports an invalid token, but Git uses separate working credentials.
No credentials were printed or committed.

Each folder is an independent Git repository. The read-only reference checkout is not
a fourth primary repository and must not be published as SyntraChat source.

Exact commands for publishing future commits:

```powershell
git -C D:\SyntraChat\.github push origin main
git -C D:\SyntraChat\SyntraChat-Desktop-Tauri push origin main
git -C D:\SyntraChat\SyntraChat-Installer push origin main
```

On another machine without Git credentials:

```powershell
gh auth login --hostname github.com
gh auth setup-git
```

Shared workflows and Actions are pinned to published, verified commits. Enable branch
protection, private vulnerability reporting and required CI checks before release.
No signing secrets or stable publishing jobs are configured. Check actual remote run
results; a successful push does not prove CI passed.
