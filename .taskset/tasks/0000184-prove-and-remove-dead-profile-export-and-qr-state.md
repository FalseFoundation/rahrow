---
id: 0000184-prove-and-remove-dead-profile-export-and-qr-state
title: Prove and remove dead profile export and QR state
status: done
priority: medium
risk: medium
createdAt: 2026-08-31 01:22 UTC
updatedAt: 2026-08-31 01:42 UTC
labels:
  - cleanup
  - profiles
parent: 0000151-decompose-the-connection-library-without-behavior-drift
directories:
  - packages/features/src/profiles
projects:
  - rahrow-uiux
---

Trace ProfileManagement/useProfileManagement exportText, exportTitle, qrDataUrl, exportSelected, prepareExport, encodeQr and qrPreview usage after ShareDrawer adoption. Remove only states/actions proven unreachable at public seams; retain import scanning and runtime QR preview behavior. Add focused characterization tests before deletion.
