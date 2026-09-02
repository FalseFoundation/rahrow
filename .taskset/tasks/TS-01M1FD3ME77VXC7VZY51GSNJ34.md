---
id: TS-01M1FD3ME77VXC7VZY51GSNJ34
title: Complete About RahRow support, ownership, and open-source links
status: doing
priority: high
risk: medium
createdAt: 2026-09-01 21:13 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - cross-platform-hardening
  - about
  - open-source
  - support
  - external-links
  - settings
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
related:
  - TS-01M1A43H8YRCDGED2B907ZCM1P
parent: TS-01M1FCY8ZHNE0E843BHX893G1F
directories:
  - packages/features/src/settings
  - packages/features/src/app
  - packages/core/src/platform
  - apps/cli
  - apps/desktop
  - apps/mobile
  - docs
projects:
  - rahrow-uiux
  - rahrow-cross-platform-hardening
  - rahrow-phase-02-light-ui-and-copy
---

Extend the manifest/config-driven About experience with RahRow's Telegram channel, support email, RahRow GitHub repository, False Foundation GitHub organization, license/open-source notices, Buy us a coffee, https://false.foundation, and https://rahrow.false.foundation. Verify exact destinations and ownership before shipping; do not hard-code unverified handles or email addresses.

Use a coherent shared About layout with product identity, version/build, bundled engine versions/licenses, ownership statement (a False Foundation product), and grouped Support, Source & licenses, and Organization actions. Open external links through the safe platform browser, make email explicit, support copy where useful, and handle offline/unavailable targets. CLI exposes version, license, source, and support metadata in an appropriate command/help surface rather than visual cards.

Test manifest truth, URL allowlisting, accessibility, RTL, platform capability gates, and every packaged target.
