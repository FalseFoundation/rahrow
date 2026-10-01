---
id: 0000130-design-secure-subscription-update-and-lan-proxy-sharing-settings
title: Design secure subscription update and LAN proxy sharing settings
status: todo
priority: medium
risk: high
createdAt: 2026-08-30 18:32 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - subscriptions
  - lan-sharing
  - native
parent: 0000122-harden-connection-operations-and-runtime-observability
directories:
  - packages/core
  - packages/features
  - apps/desktop
  - apps/mobile
projects:
  - rahrow
  - rahrow-phase-01-idea-and-research
---

## Purpose

Implement secure subscription-update policy and optional LAN proxy sharing without copying vendor-specific or privacy-hostile reference behavior.

## Reference UI inventory

Subscription Settings showed:

- Auto Update.
- Show Announcements.
- Send HWID, described as sending X-HWID with subscription requests.
- User-Agent selection, shown as Default.

Proxy Share Settings showed:

- Select Interface, shown as WiFi.
- LAN Sharing IP.
- Share SOCKS5 & HTTP Proxy.
- SOCKS Port, shown as 10808.

Advanced Settings showed:

- Proxy Share Settings.
- On Demand Settings.
- iCloud Backup.
- Combine WiFi + Cellular, marked paid/pro.
- Auto Ratio plus WiFi and Cellular ratio sliders.

## Subscription update requirements

- Versioned per-subscription update policy: manual/automatic, interval, WiFi-only/metered policy where platforms expose it, last attempt, last success, next run, retry/backoff, and disabled reason.
- Background scheduling must use native schedulers where required and report platform limitations honestly.
- Keep previous profiles on fetch/parse failure; replace atomically only after a successful validated parse.
- Respect subscription lock semantics and never modify a locked source URL silently.
- User-Agent choices must be documented compatibility presets plus validated custom value. Never spoof another product without an explicit compatibility reason.
- Do not send a stable hardware ID or X-HWID by default. Any future provider-required identifier needs a privacy/security review, per-subscription opt-in, a resettable random identifier rather than hardware identity, clear disclosure, and redacted diagnostics.
- Do not render untrusted provider announcements as HTML. If announcements are ever supported, sanitize content, constrain links, identify the provider source, allow dismissal, and keep them separate from trusted app notices.
- Redact query tokens and credentials from logs, toasts, analytics, crash reports, and screenshots.

## LAN sharing requirements

- Off by default and available only when native/network capabilities confirm support.
- Explicit interface/address selection; never bind all interfaces silently.
- Display the actual bound LAN IP and ports after start.
- Separate SOCKS5 and HTTP enablement/ports unless a shared port is technically guaranteed.
- Validate port range and conflicts; do not hard-code 10808 as a universal default.
- Require authentication or an explicit risk confirmation for unauthenticated LAN exposure.
- Apply firewall rules through native adapters where appropriate and remove them on stop/crash/uninstall.
- Show exposure warning, active-client count if available, and a persistent active indicator.
- Stop sharing when the selected interface disappears or network trust changes.
- Test IPv4/IPv6, WiFi/Ethernet/hotspot, sleep/resume, VPN reconnect, captive networks, and hostile LAN access.
- Hide the entire feature in unsupported modes/OSes.

## Advanced reference decisions

- On-demand connection rules require separate OS-native tasks and must not be a cosmetic toggle.
- iCloud Backup is Apple-only and should not enter shared UI until encrypted backup/restore, conflict resolution, schema migration, and non-Apple product strategy are approved.
- WiFi + Cellular bonding is not ordinary VPN routing. It requires native multipath support, engine compatibility, battery/data disclosure, and substantial testing; keep it out of scope until a dedicated approved architecture exists.
- Paid/pro labeling from the reference is not a RahRow requirement.

## Acceptance criteria

- Automatic updates are cancellable, observable, atomic, and retain old data on failure.
- Background scheduling behavior is tested on every supported OS.
- No hardware identifier is transmitted by default.
- User-Agent and announcement inputs are validated and covered by security tests.
- LAN listener cannot start without explicit interface/port/security choices.
- Firewall/listener cleanup is crash-safe and verified.
- UI shows only capability-backed settings and clearly indicates reconnect/restart requirements.
- Logs and diagnostics never expose subscription tokens, proxy passwords, or stable identifiers.


Screenshot-verification clarifications

- Default User-Agent is derived from a documented RahRow network-client policy, not the WebView/browser string. Custom values are trimmed, length/character validated, previewed, stored per subscription or globally according to an explicit selector, and redacted from diagnostics where necessary.
- Lock Subscription freezes source-defining fields such as URL and provider-controlled identity from accidental edits. It does not prevent explicit refresh, profile selection, export, or deletion unless a separate action says so. Unlock is explicit; refresh never silently changes the lock state.
- Advanced Settings uses the shared settings registry and nested-page shell. It contains only capability-backed entries.
- The reference Get Ratio action, Auto Ratio toggle, WiFi Ratio slider, Cellular Ratio slider, paid labels, and bonding copy belong entirely to the deferred multi-path bonding concept and must not appear until its separate architecture, OS entitlement, metering, battery, accounting, and failure semantics are approved.
- iCloud Backup remains deferred: do not show it until encrypted export format, secret-handling, schema migrations, conflict resolution, account/logout deletion, Android/desktop parity or platform labeling, and restore tests have an approved design.
- On-demand connection is owned by the dedicated native follow-up task linked from this program.
