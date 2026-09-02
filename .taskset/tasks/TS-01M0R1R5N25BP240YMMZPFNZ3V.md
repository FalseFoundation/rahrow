---
id: TS-01M0R1R5N25BP240YMMZPFNZ3V
title: Implement iOS Network Extension VPN
status: doing
priority: urgent
risk: high
createdAt: 2026-08-23 19:32 UTC
updatedAt: 2026-09-02 03:51 UTC
labels:
  - production-vpn
  - apple
dependsOn:
  - TS-01M12801K77WAFWMPP45EM4YXM
  - TS-01M11NT06C3NAK1A9B53E7A2QZ
parent: TS-01M0R1K0XW4W5R8WA2FH0QCPJS
directories:
  - apps/mobile
projects:
  - rahrow-mobile
  - rahrow-phase-04-native-runtime-and-capabilities
---

Development-preview implementation includes an iOS app plus embedded XrayPacketTunnel and SingBoxPacketTunnel Network Extension targets; concrete LibXray CGoInvoke and Libbox command-server/TUN adapters; dual-stack default routes and DNS enforcement; bounded lifecycle acknowledgement; validated and size-bounded engine configuration; cleanup on failure and stop; and Simulator fail-closed behavior. Xcode wiring embeds the extensions, app and packet-tunnel entitlements, pinned runtime frameworks for device builds, runtime source pins, and third-party notices. Device orchestration validates schema-v2 source, Go 1.26.7 toolchain, recipe, checksum, and XCFramework slice provenance before compilation, builds a locally signed RahRow.app, rejects external Mach-O dependencies, and installs through devicectl. The real Apple libXray XCFramework is built; sing-box and the merged checksum lock remain pending. The task remains doing until both pinned frameworks verify, a local Apple Development profile builds the device application, and the resulting tunnel is exercised on the connected iPhone. Production certificates, App Store credentials, notarization, legal approval, and public release packaging are separately tracked and do not block the development preview.
