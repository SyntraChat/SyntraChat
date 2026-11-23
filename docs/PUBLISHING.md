# Repository publishing

GitHub connector confirmed the existing public repositories SyntraChat/.github,
SyntraChat/SyntraChat-Desktop-Tauri and SyntraChat/SyntraChat-Installer with admin/push
permissions. No repositories were created by this task. Local `gh auth status` reports
an invalid token; connector authentication does not repair CLI authentication.
Git's existing credential manager successfully published the community repository;
CLI authentication is not a prerequisite for pushing when Git already has credentials.

Each folder is an independent Git repository. The read-only reference checkout is not
a fourth primary repository and must not be published as SyntraChat source.

After authenticating Git for publishing, publish community workflows first:

```powershell
gh auth login --hostname github.com
gh auth setup-git
git -C D:\SyntraChat\.github push -u origin main
git -C D:\SyntraChat\SyntraChat-Desktop-Tauri push -u origin main
git -C D:\SyntraChat\SyntraChat-Installer push -u origin main
```

To align the existing desktop remote's name with the requested `SyntraChat`, preserving
the same history (do not create an extra repository):

```powershell
gh api --method PATCH repos/SyntraChat/SyntraChat-Desktop-Tauri -f name=SyntraChat
git -C D:\SyntraChat\SyntraChat-Desktop-Tauri remote set-url origin https://github.com/SyntraChat/SyntraChat.git
```

Update organization links after a confirmed rename. Pin shared workflow references to
the reviewed community commit before production releases. Enable branch protection,
private vulnerability reporting and required CI checks; no signing secrets are configured.
