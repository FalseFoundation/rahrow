---
id: 0000142-codify-and-verify-xray-native-tun-support
title: Codify and verify Xray native TUN support
status: done
priority: high
risk: medium
createdAt: 2026-08-31 00:23 UTC
updatedAt: 2026-09-14 00:48 UTC
labels:
  - vpn
  - architecture
  - xray
  - documentation
  - testing
related:
  - 0000141-implement-android-xray-tun-file-descriptor-adapter
parent: 0000096-make-vpn-tun-the-default-and-generalize-engine-runtime-naming
files:
  - .agents/skills/rahrow-implement/SKILL.md
  - packages/engine/src/xray/xray-engine.ts
directories:
  - .agents/skills/rahrow-implement
  - packages/engine
  - docs
projects:
  - rahrow-production
  - rahrow-phase-06-verification-and-release-gates
---

Make Xray native TUN behavior an explicit RahRow architecture contract instead of relying on incidental implementation knowledge. Update the RahRow implementation skill and relevant architecture documentation to state that Xray supports a native protocol tun inbound, desktop system-routing options, and mobile TUN file-descriptor injection through xray.tun.fd. Add regression tests for XrayConfigBuilder TUN output and platform capability gates. Document that unsupported native adapters must fail closed and that Android must retain its temporary sing-box-only capability filter until the dedicated Xray adapter passes packaged-runtime and device tests. Acceptance requires the skill, docs, code tests, and capability matrix to agree for desktop, Android, iOS, and macOS.
