---
id: TS-01M1FJ04G90RH5V8R1BDE590BG
title: Repair QR camera recognition on every native host
status: doing
priority: urgent
risk: high
createdAt: 2026-09-01 22:38 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - qr
  - camera
  - native
  - regression
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
dependsOn:
  - TS-01M1FJ04G4WZVWPS96D78PVSK9
parent: TS-01M1FHYT7403GRGB8AEVAGCA5S
directories:
  - packages/features/src/import
  - apps/mobile
  - apps/desktop
projects:
  - rahrow-mobile
  - rahrow-cross-platform-hardening
  - rahrow-phase-04-native-runtime-and-capabilities
---

## Capability seam

An injected QR scanner returns a decoded supported connection payload or a typed permission/unavailable/decode error; opening a visual camera preview alone is not success. Repair continuous frame decoding, lifecycle cleanup, duplicate suppression, orientation/background transitions, and supported-code validation. Desktop hosts must provide a real supported camera path or truthfully hide/fail closed.

## Implementation evidence

Android camera frames now copy the Y plane with rowStride and pixelStride awareness before a QR-only ZXing decoder runs with TRY_HARDER and inverted-image support. A JVM fixture proves a generated connection QR decodes and non-QR data fails closed. Desktop no longer advertises an unsupported scanner or exposes a dead QR action. Android Kotlin compilation, Android JVM tests, native source contracts, desktop capability tests, and desktop/mobile typechecks pass.

## Remaining acceptance evidence

Keep this task doing until known QR, denial, no-camera, lifecycle, and orientation cases are exercised on installed Android and iOS artifacts. A desktop camera path remains intentionally unavailable rather than falsely advertised.
