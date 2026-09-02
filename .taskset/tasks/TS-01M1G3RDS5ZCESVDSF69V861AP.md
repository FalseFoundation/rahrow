---
id: TS-01M1G3RDS5ZCESVDSF69V861AP
title: Use Persian Backup, Download Backup, and Import Backup copy
status: todo
priority: medium
risk: low
createdAt: 2026-09-02 03:49 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - backup-restore
  - localization
  - persian
  - copy
  - rtl
related:
  - TS-01M1FJ0P69C726J6PAZV26M3DZ
parent: TS-01M1FHYT7403GRGB8AEVAGCA5S
directories:
  - packages/features/src
  - packages/core/src/i18n
projects:
  - rahrow-uiux
  - rahrow-phase-02-light-ui-and-copy
---

Replace Persian پشتیبان terminology with the familiar بک‌آپ wording throughout visible Backup UI. Prefer دانلود بک‌آپ for export/download and واردکردن بک‌آپ for import instead of اکسپورت، ایمپورت، or پشتیبان phrasing. Audit headings, buttons, descriptions, confirmations, errors, toasts, accessibility names, and search metadata while keeping technical file-format identifiers unchanged.

Acceptance includes concise natural Persian, correct RTL punctuation and interpolation, English parity, and no stale visible translation keys.
