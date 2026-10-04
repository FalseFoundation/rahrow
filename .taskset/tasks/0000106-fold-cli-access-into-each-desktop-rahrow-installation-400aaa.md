---
id: 400aaa
title: Fold CLI access into each desktop RahRow installation
status: todo
priority: high
risk: high
createdAt: 2026-08-28 12:55 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - single-application
  - packaging
  - cli
  - p0-release-blocker
related:
  - 390a47
  - ea8d68
parent: 24c0bd
directories:
  - apps/cli
  - apps/desktop
  - .github/workflows
projects:
  - rahrow-release
  - rahrow-phase-07-production-and-distribution
---

## Goal\n\nShip GUI and CLI access as capabilities of the same RahRow installation on every desktop OS. The standalone Node CLI may remain a contributor and development target, but it must not be a required or separately advertised end-user product artifact.\n\n## Current bypass\n\nThe release workflow uploads apps/cli/dist and apps/cli/package.json as a separate rahrow-cli-development artifact. The CLI also resolves Xray and sing-box from its own user runtime directory or explicit filesystem paths instead of from the installed RahRow application layout.\n\n## Scope\n\n- Package the CLI entry point inside the macOS, Windows, and Linux RahRow installation.\n- Resolve all CLI engine and helper paths from the same app-owned bundled resources used by the GUI.\n- Use the same app-owned configuration and state contract where platform security permits.\n- Keep contributor-only standalone CLI builds clearly marked and excluded from product release assets.\n- Add installed-layout tests that run GUI and CLI capability without PATH tools, package-manager dependencies, external cores, or first-run executable downloads.\n- Make release checks fail when a desktop artifact omits its CLI entry point or bundled runtime closure.\n\n## Acceptance criteria\n\n- Each desktop OS has one RahRow installation containing GUI, CLI entry point, engines, helpers, and required assets.\n- A clean host can use the installed CLI without Node.js, Homebrew, another package manager, PATH-provided engines, or separately downloaded executables.\n- Product release workflows do not publish a standalone CLI as a required end-user artifact.\n- Contributor CLI workflows remain usable and are explicitly development-only.\n- Packaging and installed-layout tests prove the single-application distribution contract.
