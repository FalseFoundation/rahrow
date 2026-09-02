---
id: TS-01M1A48HJEP22S8VR2QYVGGFXQ
title: Implement native on-demand connection policies with platform gates
status: todo
priority: medium
risk: high
createdAt: 2026-08-30 20:02 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - native
  - on-demand
  - settings
dependsOn:
  - TS-01M19Z4CJE17HHTA5KX1Q916E3
  - TS-01M1A43H8YRCDGED2B907ZCM1P
parent: TS-01M19V6VYXDRMGVQ8XZKAXPR49
directories:
  - apps/desktop
  - apps/mobile
  - packages/core
  - packages/features
projects:
  - rahrow
  - rahrow-phase-05-integration-and-hardening
---

Purpose

Research, design, and implement on-demand VPN connection policies only on platforms where RahRow's native tunnel stack can enforce them reliably. This is the justified native follow-up behind the On Demand Settings row shown in the Advanced Settings reference. Hide the row everywhere else; do not ship a web-only imitation or paid/pro label.

Research gate

Before implementation, document current primary platform APIs, entitlements, background restrictions, review-policy constraints, and supported event triggers for:
- Apple Network Extension on-demand rules and saved VPN preferences on iOS/macOS.
- Android VpnService always-on/lockdown behavior, background execution limits, and network callbacks.
- Windows VPN/profile or service capabilities used by RahRow's desktop tunnel adapter.
- Linux NetworkManager/systemd integration only if RahRow owns a supported adapter.
Record which concepts are portable and which require platform-specific extensions.

Canonical policy

Create a versioned OnDemandPolicy with:
- enabled state and explicit user consent.
- ordered, stable-ID rules with match conditions and connect, disconnect, or ignore action.
- portable conditions only where verifiable: network type, trusted/untrusted Wi-Fi identity with privacy-safe storage, interface availability, and optional domain trigger when the OS API genuinely supports it.
- conflict resolution, first/last match semantics, default action, temporary pause, and manual override behavior.
- per-platform extension storage and capability/loss reporting.
- requested versus effective native state and last trigger/result for diagnostics.

Safety and lifecycle

- Never connect merely because a UI process rendered or because an ambiguous network name matched.
- Explain battery, metered-data, captive portal, and always-on implications before enabling.
- Treat Wi-Fi identifiers and network history as sensitive. Request only permissions required by the selected rule and redact identifiers from logs/exports.
- Define behavior for manual disconnect, app termination, reboot, sleep/wake, airplane mode, captive portals, subscription/profile deletion, expired credentials, engine failure, app upgrade, permission revocation, and reset.
- Apply policy transactionally: validate and persist, install native configuration, confirm effective state, and roll back both persistence and native state on failure.
- If the chosen profile becomes unavailable, disable or pause the policy with an actionable notification rather than selecting an arbitrary profile.

UX

- Advanced Settings row appears only with a supported native adapter and entitlement.
- Editor supports add/edit/remove/reorder/enable with clear summaries, validation, Save/Cancel, unsaved-change protection, and a visible selected profile.
- Show current effective state, permission requirements, and last trigger without exposing sensitive SSIDs.
- Use global Sonner feedback and the shared nested-page shell; no persistent root tab/connect bar.

Acceptance criteria

- An approved platform capability/entitlement matrix exists before UI exposure.
- Canonical and platform-extension persistence round-trips through migrations.
- Native tests cover each supported trigger/action, ordering/conflicts, manual overrides, reboot, process death, permission loss, network transitions, captive portal, engine failure, profile deletion, reset, and rollback.
- Unsupported OS/engine combinations do not render the setting.
- Diagnostics distinguish requested policy, installed native policy, last evaluated rule, and last error with privacy redaction.
- Accessibility covers keyboard/touch operation, focus, rule summaries, confirmations, loading, errors, and reduced motion.
- Store/release documentation discloses background VPN behavior and required permissions where applicable.
