---
name: rahrow-writing-guidelines
description: Write, revise, or review RahRow product copy, interface text, marketing pages, metadata, release messaging, and platform descriptions. Use for public-facing RahRow prose; do not use for code comments, logs, or contributor-only technical documentation unless voice consistency is requested.
---

# RahRow writing guidelines

Create clear, calm, and accurate RahRow copy. Preserve the distinction between a VPN client and a VPN service. Never claim that an unreleased platform or capability is available.

## Source of truth

Read [references/rahrow-writing-guidelines.json](references/rahrow-writing-guidelines.json) before writing or reviewing RahRow copy. Apply the relevant rules, terminology, approved claims, and message templates from that file.

When repository facts conflict with an approved example, keep the tone but update the claim. Treat current implementation and release evidence as authoritative for availability.

## Workflow

1. Identify the surface, audience, and release state.
2. Select the matching content type and message pattern from the JSON reference.
3. Draft with active voice, direct address, present tense, and sentence-case headings.
4. Check platform, protocol, engine, privacy, bundling, and availability claims.
5. Run the reference checklist and report any unresolved factual assumptions.

For reviews, return concise `file:line` findings when files are supplied. For new copy, return ready-to-use text grouped by surface.
