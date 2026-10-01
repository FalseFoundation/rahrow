---
id: 0000274-restore-a-resolvable-android-gradle-toolchain
title: Restore a resolvable Android Gradle toolchain
status: done
priority: urgent
risk: high
createdAt: 2026-09-13 23:54 UTC
updatedAt: 2026-09-14 00:29 UTC
labels:
  - android
  - tooling
  - build
  - verification
parent: 0000258-stop-android-crashes-when-starting-sing-box-tun
directories:
  - apps/mobile/android
projects:
  - rahrow-mobile
  - rahrow-phase-04-native-runtime-and-capabilities
---

## Outcome

Restore a reproducible Android verification path after the repository dependency updates.

## Completed

- Regenerated `capacitor.settings.gradle` so its project paths match Capacitor 8.5.1 and AdMob 8.1.0.
- Upgraded Android Gradle Plugin to 8.13.2 and Kotlin Gradle Plugin to 2.3.21, matching the Kotlin 2.3 metadata used by Play Services Ads 25.4.0.
- Confirmed the aggregate `testDebugUnitTest` task passes with AdMob enabled.
- Confirmed `:app:assembleDebug` and `:app:lintDebug` pass.
- Confirmed the APK bundles libbox, libgojni, and HEV libraries for every declared Android ABI.
- Confirmed Taskset doctor, mobile Vitest, TypeScript typecheck, and `git diff --check` pass.

## Environment note

Official Android coordinates remain configured in the repository. This local environment returned 404 for Google Maven paths, so verification used a temporary dependency mirror without changing repository repository declarations.

## Acceptance criteria

- [x] `apps/mobile/android/gradlew testDebugUnitTest` runs all configured Android tests.
- [x] The Android debug APK assembles from repository-pinned native runtime inputs.
- [x] Taskset doctor and relevant mobile checks pass.
