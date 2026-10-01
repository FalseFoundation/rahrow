---
id: 0000218-verify-the-reported-hardening-program-on-installed-artifacts
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
  - 0000204-eliminate-route-loading-stalls-and-standardize-screen-skeletons
  - 0000205-make-every-sonner-toast-top-aware-of-headers-and-drawers
  - 0000206-remove-locale-direction-startup-and-navigation-races
  - 0000207-give-icon-only-actions-consistent-tooltip-and-focus-semantics
  - 0000208-publish-and-enforce-the-engine-mode-platform-capability-matrix
  - 0000209-keep-android-vpn-connected-state-truthful-until-native-teardown-complete
  - 0000210-implement-an-atomic-active-connection-reconfiguration-state-machine
  - 0000211-separate-vpn-system-proxy-and-lan-proxy-sharing-settings
  - 0000212-shorten-failed-latency-labels-in-every-locale
  - 0000213-remove-aggregate-runtime-limit-filler-from-diagnostics
  - 0000214-complete-about-rahrow-support-ownership-and-open-source-links
  - 0000215-open-connection-item-actions-by-researched-long-press-and-context-menu
  - 0000216-prevent-selection-of-connection-profile-urls
  - 0000217-persist-settings-without-remounting-pages-or-losing-scroll
  - 0000175-expose-capability-gated-tun-and-system-proxy-connection-modes
  - 0000141-implement-android-xray-tun-file-descriptor-adapter
  - 0000142-codify-and-verify-xray-native-tun-support
  - 0000130-design-secure-subscription-update-and-lan-proxy-sharing-settings
  - 0000128-implement-portable-routing-policy-editor-with-native-capability-gates
  - 0000134-unify-settings-information-architecture-reset-safety-and-about-metadata
  - 0000102-add-vpn-leak-lifecycle-and-engine-switch-release-gates
  - 0000074-implement-ios-network-extension-vpn
  - 0000098-implement-macos-registered-network-extension-vpn
  - 0000099-replace-android-vpn-skeleton-with-native-engine-providers
  - 0000100-implement-windows-wintun-vpn-service-and-installer
  - 0000101-implement-linux-tun-service-and-package-authorization
  - 0000219-make-lock-state-an-invariant-for-cleanup-and-destructive-connection-acti
  - 0000220-make-locked-connections-unmistakable-without-hiding-their-identity
  - 0000221-define-one-executable-inventory-for-every-native-rahrow-action
  - 0000222-prove-qr-clipboard-paste-share-and-file-actions-on-every-target
  - 0000223-prove-privileged-native-lifecycle-actions-and-cleanup-on-every-os
parent: 0000203-harden-reported-behavior-across-every-rahrow-platform
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
