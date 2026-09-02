---
id: TS-01M1AP3WTK6MGE5ZNTJ4RVVYCA
title: Show full diagnostic details with per-item copy actions
status: done
priority: high
risk: medium
createdAt: 2026-08-31 01:14 UTC
updatedAt: 2026-08-31 02:53 UTC
labels:
  - diagnostics
  - clipboard
  - accessibility
  - responsive
related:
  - TS-01M19V6CZNHSE4WP5S1ZDAV4D6
  - TS-01M1AMF9R3Y393R4TQZ4CSY7CK
parent: TS-01M1AM68XJ5G8CNBTBZ84C12EM
files:
  - packages/features/src/diagnostics/Diagnostics.tsx
  - packages/features/src/diagnostics/Diagnostics.module.css
  - packages/features/src/diagnostics/Diagnostics.test.tsx
  - packages/features/src/app/runtime.tsx
  - packages/core/src/platform/capabilities.ts
directories:
  - packages/features/src/diagnostics
  - packages/features/src/app
  - packages/core/src/platform
projects:
  - rahrow-uiux
---

## Purpose

Make every Diagnostics item useful for troubleshooting: its description/detail must be fully readable and each item must offer a copy action for the exact diagnostic content.

## Presentation contract

- Remove line clamps, truncation, fixed single-line layouts, and overflow clipping from engine errors and capability details.
- Preserve line breaks and allow long paths, URLs, identifiers, and unbroken native error text to wrap without creating horizontal page overflow.
- Keep status badges and copy actions reachable when descriptions span multiple lines or at narrow widths and high zoom.
- Provide a copy button on the engine item and every capability item using the shared Copy icon.
- Give each button a specific accessible name such as Copy VPN diagnostic details; icon-only controls require title or tooltip behavior consistent with shared primitives.

## Copy payload and behavior

- Define a deterministic plain-text payload containing item name, status, support/enabled state where applicable, and the full detail or fallback text.
- Copy the same complete text that the item communicates; do not copy truncated visual text or hidden credentials.
- Use the injected Clipboard capability. Do not call navigator.clipboard directly from packages/features.
- Hide the copy action when clipboard write is unsupported. Report success with a concise toast or live-region message and failures with actionable feedback.
- Review the payload for secrets. Values classified as credentials, tokens, or private keys must be redacted at the diagnostics producer boundary before render and copy.

## Acceptance criteria

- Tests cover multiline details, very long unbroken strings, missing details, native errors, unsupported clipboard, copy success, copy failure, and redaction.
- At 320 CSS pixels, 200 percent zoom, and RTL, every detail remains readable with no horizontal viewport overflow.
- Copy actions are keyboard operable, have unique accessible names, and do not change the selected/focused diagnostic item.
- Desktop and mobile consume the same shared Diagnostics implementation and capability injection.
