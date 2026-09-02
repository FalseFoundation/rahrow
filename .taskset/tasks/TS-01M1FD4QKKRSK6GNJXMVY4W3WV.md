---
id: TS-01M1FD4QKKRSK6GNJXMVY4W3WV
title: Verify the reported hardening program on installed artifacts
status: todo
priority: urgent
risk: high
createdAt: 2026-09-01 21:14 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - cross-platform-hardening
  - validation
  - installed-artifacts
  - release-gate
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
dependsOn:
  - TS-01M1FD3EMM5HCWEJ5NR97A7JBP
  - TS-01M1FD3FBF9EAMB9AWAX0DGA3Q
  - TS-01M1FD3FXPV890ZCFR1SKK8YZV
  - TS-01M1FD3GGXZENPMMD5XRFY9EKA
  - TS-01M1FD3H6DAB5NX2FSW1RKP2J7
  - TS-01M1FD3HVTCWG4G0V3Q3MEBE0M
  - TS-01M1FD3JD0BT06B61D728V1H37
  - TS-01M1FD3JWFFV89RPX8R97KTFR3
  - TS-01M1FD3KCN016Z9HZHK5PJA6G6
  - TS-01M1FD3KXEF02QQHDC8QPMV3CF
  - TS-01M1FD3ME77VXC7VZY51GSNJ34
  - TS-01M1FD3N0VH0WRYVNQNGJ65NR6
  - TS-01M1FD3NFESQA6T9DPY0RC4S6Y
  - TS-01M1FD3NZ72RNAGDVDW27XN9RD
  - TS-01M1AP3WDCN9VWPAVCHXB76CS6
  - TS-01M1AK591TGX2R6M7WFWEKGK5K
  - TS-01M1AK5GVR8HKWXESSFRA8H6N9
  - TS-01M19Z4CJE17HHTA5KX1Q916E3
  - TS-01M19Z4C235WSDN3CRTEVGJ3BK
  - TS-01M1A43H8YRCDGED2B907ZCM1P
  - TS-01M12803X3B8JRVJF8BZ86EZN8
  - TS-01M0R1R5N25BP240YMMZPFNZ3V
  - TS-01M1280255E25TTEKC7PC00J1M
  - TS-01M12802Q8B03PA8BWSQZYEBWR
  - TS-01M12803437GM2X0PSW3VF8SXE
  - TS-01M12803GWY4K1H9QSHSRH0H5Y
  - TS-01M1FDH8ENAXVJ17E5EVK8XC3J
  - TS-01M1FDH8XXQYW1TJZREZM757SY
  - TS-01M1FDH9DPSSPXR9EG2B7XJ4X2
  - TS-01M1FDH9YGMR3Y8FPWP4SYTWRD
  - TS-01M1FDHAGZB5NBVT96PYFZ4999
parent: TS-01M1FCY8ZHNE0E843BHX893G1F
directories:
  - tests
  - packages
  - apps
  - engines
  - .github/workflows
projects:
  - rahrow-testing
  - rahrow-cross-platform-hardening
  - rahrow-phase-06-verification-and-release-gates
---

## Objective

Run the final installed-artifact and shared-interface verification for every report in this hardening program.

## Required matrix

- Android: supported API levels, representative ABIs, real VpnService state, Xray and sing-box.
- iOS: signed device Network Extension behavior, both bundled engines where supported.
- macOS: supported CPU architectures and Network Extension/system-proxy cleanup.
- Windows: supported architectures, Wintun/service/system-proxy lifecycle.
- Linux: supported packages/desktops, TUN authorization/system-proxy lifecycle.
- CLI: every bundled engine, proxy commands, capability/status/settings semantics, and VPN control only where the installed desktop application truthfully exposes it.

Test every advertised engine × mode × platform cell and verify unsupported cells are hidden or fail closed. Exercise cold/warm navigation, all screen loading states, toasts with/without drawers, EN/FA direction, icon actions, long press/context menus, URL selection, settings scroll continuity, concise latency copy, Diagnostics, About, VPN disconnect, and active profile/mode/engine reconfiguration.

## Evidence and gates

Use unit/integration tests plus real installed devices/VMs for native state. Confirm external OS VPN/proxy/route/DNS/process state rather than trusting only RahRow UI/status stores. Include crash, force-stop, revoke, sleep/resume, reboot, upgrade, uninstall, offline, slow I/O, RTL, 200% zoom, keyboard, VoiceOver, and TalkBack where applicable.

Run focused package/native suites, cross-interface tests, desktop/mobile/CLI builds, release artifact checks, pnpm check, pnpm exec taskset doctor, pnpm exec taskset generate, and git diff --check. Record signed-hardware or credential blockers as explicit evidence gaps; do not mark complete from mocks or placeholder providers.


## Added lock and native-action coverage

Also verify that cleanup/purge never removes a locked aggregate or descendant, revalidates locks at commit time, and reports skipped-locked counts before and after the operation. Confirm lock indicators and action availability remain consistent across rows, groups, drawers, long press/context menus, accessibility APIs, and CLI output.

Execute the native-action inventory end to end: QR camera/encode, clipboard read/write and paste helpers, copy, system share, save/download/file import, safe links, permissions/cancellation, autostart/tray/notifications where supported, engine lifecycle, VPN/TUN, system proxy, LAN sharing, and cleanup. Verify real adapters and OS state on every advertised platform; mocked capabilities are insufficient for completion.
