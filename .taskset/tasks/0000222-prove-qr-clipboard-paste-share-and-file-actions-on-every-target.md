---
id: 0000222-prove-qr-clipboard-paste-share-and-file-actions-on-every-target
title: Prove QR, clipboard, paste, share, and file actions on every target
status: doing
priority: urgent
risk: high
createdAt: 2026-09-01 21:20 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - cross-platform-hardening
  - native-actions
  - qr
  - clipboard
  - share
  - file-save
  - permissions
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
dependsOn:
  - 0000221-define-one-executable-inventory-for-every-native-rahrow-action
related:
  - 0000021-implement-qr-share-and-clipboard-import-export-flows
  - 0000116-implement-native-qr-camera-preview-adapters-for-the-connection-drawer
  - 0000169-inject-and-capability-gate-qr-image-downloads
parent: 0000203-harden-reported-behavior-across-every-rahrow-platform
directories:
  - packages/features/src/import
  - packages/features/src/share
  - packages/core/src/platform
  - apps/desktop
  - apps/mobile
  - apps/cli
  - tests
projects:
  - rahrow-interfaces
  - rahrow-cross-platform-hardening
  - rahrow-phase-06-verification-and-release-gates
---

## Scope

Verify the complete user workflows for QR scan/camera lifecycle, QR encode, paste helper, clipboard read/write, copy feedback, system share, QR/file download or save, file picker/import, and safe external-link/email opening. Test actual platform adapters rather than only mocked shared components.

Every action must report supported, unavailable, permission denied, user canceled, malformed input, timeout, native failure, and success truthfully. A canceled share/save/camera permission flow is not an error or success. Paste helpers preserve focus/selection and validate through the normal import pipeline. Copy/share/download must not log or leak profile credentials; saved filenames and paths are sanitized.

Handle camera pause/resume and route/drawer close, clipboard privacy prompts, share-sheet lifecycle, scoped storage/document providers, safe-area overlays, offline state, large payload limits, and repeated rapid actions. Hide unavailable actions without removing an alternative path where one exists.

## Platform evidence

Exercise Android devices/API levels, iOS devices, macOS Intel/Apple Silicon, Windows, and supported Linux desktop environments. CLI uses stdin/stdout, clipboard only when explicitly capability-backed, files for import/export, and truthful unsupported results for camera/system-share-only actions.
