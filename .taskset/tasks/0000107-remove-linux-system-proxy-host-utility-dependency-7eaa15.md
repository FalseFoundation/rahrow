---
id: 7eaa15
title: Remove Linux system-proxy host utility dependency
status: todo
priority: high
risk: high
createdAt: 2026-08-28 12:56 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - single-application
  - linux
  - system-proxy
  - p0-release-blocker
related:
  - b9f868
parent: 9395f1
directories:
  - apps/desktop
projects:
  - rahrow-desktop
  - rahrow-phase-04-native-runtime-and-capabilities
---

## Goal\n\nMake Linux system-proxy control part of the self-contained RahRow installation with no separately installed gsettings or desktop utility requirement.\n\n## Current bypass\n\nThe Tauri native integration invokes gsettings from PATH and reports the feature unsupported when that host command is absent. This makes an advertised RahRow capability depend on a package outside the application.\n\n## Scope\n\n- Replace the gsettings subprocess dependency with a native Linux desktop integration or an app-owned bundled helper.\n- Keep desktop-environment support explicit and fail closed on genuinely unsupported environments.\n- Preserve proxy state capture and restoration across connect, disconnect, crash recovery, and engine switches.\n- Do not add sudo, package-manager, PATH, or first-run executable download requirements.\n- Add clean-host and missing-host-tool tests for the installed artifact.\n\n## Acceptance criteria\n\n- Supported Linux desktops can enable, inspect, and restore system proxy without gsettings or another separately installed helper.\n- Every executable used by RahRow is either part of the OS contract or owned by the RahRow package.\n- Unsupported desktop environments are reported accurately and never leave partial proxy state.\n- Installed-layout tests pass with gsettings removed from PATH.\n- Documentation no longer instructs users to install gsettings for this capability.
