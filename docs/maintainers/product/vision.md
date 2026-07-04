---
title: Product Vision
description: Maintainer-facing product direction for RahRow.
---

# Product Vision

## Origin

RahRow exists to deliver a trustworthy, cross-platform V2Ray client platform
with strong privacy posture and maintainable architecture.

## Vision

RahRow aims to become a modern, cross-platform network client platform for
V2Ray-compatible ecosystems.

## Mission

Provide consistent runtime behavior, profile workflows, diagnostics, and user
experience across desktop, mobile, web, and server-assisted surfaces.

## Product Goals

- Deliver reliable runtime orchestration across supported platforms.
- Offer clear profile import, validation, and switching workflows.
- Keep protocol/runtime integration modular and testable.
- Provide actionable diagnostics for connectivity and routing issues.
- Preserve user privacy with secure defaults and minimal telemetry.

## Principles

### Offline first

Critical client workflows should remain usable even with limited connectivity.

### Privacy first

Privacy and security concerns are first-order product requirements.

### Cross-platform consistency

Core behavior should stay consistent while respecting platform constraints.

### Modular architecture

Protocol adapters and app interfaces should evolve independently with stable
contracts.

### Developer velocity

The monorepo should enable safe iteration through strong package boundaries,
focused tests, and deterministic tooling.

## Near-Term Scope

Current milestones prioritize:

- runtime adapter contracts and integration harnesses
- profile and subscription data models
- diagnostics and health surfaces
- foundational desktop/mobile/web experience baselines
- reliability and compatibility testing for protocol backends

Scaffold packages and apps will continue maturing toward production readiness in
incremental, compatibility-aware steps.
