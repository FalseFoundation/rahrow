---
id: "887575"
title: Use Persian Backup, Download Backup, and Import Backup copy
status: done
priority: medium
risk: low
createdAt: 2026-09-02 03:49 UTC
updatedAt: 2026-09-02 16:49 UTC
labels:
  - backup-restore
  - localization
  - persian
  - copy
  - rtl
related:
  - "821e06"
parent: bf02bf
directories:
  - packages/features/src
  - packages/core/src/i18n
projects:
  - rahrow-uiux
  - rahrow-phase-02-light-ui-and-copy
---

Replace Persian پشتیبان terminology with the familiar بک‌آپ wording throughout visible Backup UI. Prefer دانلود بک‌آپ for export/download and واردکردن بک‌آپ for import instead of اکسپورت، ایمپورت، or پشتیبان phrasing. Audit headings, buttons, descriptions, confirmations, errors, toasts, accessibility names, and search metadata while keeping technical file-format identifiers unchanged.

Acceptance includes concise natural Persian, correct RTL punctuation and interpolation, English parity, and no stale visible translation keys.
