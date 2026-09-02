---
id: TS-01M0QTS2G3ZSREDZSWX4R14EE8
title: Package and release RahRow
status: blocked
priority: high
risk: high
createdAt: 2026-08-23 17:30 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - prod-grade
  - packaging
  - p0-release-blocker
  - blocked-signing
dependsOn:
  - TS-01M0QTRVSM2FDZM4GYZFM50715
  - TS-01M11NT06C3NAK1A9B53E7A2QZ
  - TS-01M0R1R5N25BP240YMMZPFNZ3V
  - TS-01M1280255E25TTEKC7PC00J1M
  - TS-01M12802Q8B03PA8BWSQZYEBWR
  - TS-01M12803437GM2X0PSW3VF8SXE
  - TS-01M12803GWY4K1H9QSHSRH0H5Y
  - TS-01M12803X3B8JRVJF8BZ86EZN8
  - TS-01M1471P5EFEX3CHQH4VGFFQ4H
  - TS-01M1473M3G60VX4G76YE4ASKGD
related:
  - TS-01M0R1K7CHDJFFAGECXS1V6ND2
  - TS-01M0R1ANJXZV14BYG8SPA1T90P
parent: TS-01M0QTNQ6P1VF8S21D8EVXRJ1T
directories:
  - apps/desktop
  - apps/mobile
  - apps/cli
projects:
  - rahrow-release
  - rahrow-phase-07-production-and-distribution
---

The CLI, mobile web, desktop web, and a local unsigned macOS app bundle build successfully; the macOS bundle contains Xray, sing-box, geo assets, licenses, and notices. Completion requires one self-contained application artifact for each target OS and release channel. Desktop CLI behavior must ship inside and be managed by the same desktop installation; a standalone CLI build may exist for contributors but must not be a second required production download. Each artifact must embed all advertised engines and OS providers, verify its installed layout, require no separate runtime or package installation, perform no first-run executable download, and own update and removal of nested services or extensions. Production publishing remains blocked on unified packaging, signing/notarization, Apple entitlements, registered Windows/Linux/macOS providers, immutable runtime checksums, and installed device or VM lifecycle evidence.
