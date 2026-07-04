---
title: Technology Preferences
description: Preferred frontend, backend, language, and database choices for RahRow.
---

# Technology Preferences

These are defaults for new RahRow implementation work. They guide choices
when requirements do not demand a different tool; they are not a requirement
to install every library in every package.

## Frontend

Use TypeScript and React for web interfaces. Prefer the TanStack ecosystem for
headless application behavior:

- TanStack Query for server-state fetching, caching, and mutations
- TanStack Form for complex validated forms
- TanStack Table for data grids and tabular state
- TanStack Hotkeys for keyboard command handling
- TanStack Pacer for debouncing, throttling, queuing, and rate control
- TanStack Virtual for large virtualized lists and grids
- TanStack DB when a client-side reactive data layer is justified
- TanStack Devtools and library-specific devtools during development

Adopt these tools by demonstrated feature need. Do not add speculative
dependencies to scaffolds or force TanStack abstractions around simple local
state.

## Backend

Prefer TypeScript for services and hosted adapters.

- Start with a small framework-independent composition root where practical.
- Use NestJS when dependency injection, modules, guards, transport adapters, or
  a larger service boundary justify the framework.
- In NestJS applications, prefer `class-transformer` and `class-validator` for
  transport DTO transformation and validation.
- Prefer TypeORM when a relational object mapper is appropriate.
- Keep RahRow domain rules in `@rahrow/core`; server frameworks own transport,
  authentication, persistence adapters, and process lifecycle.

Use Rust for components where systems-level performance, memory control,
portability, concurrency, or a standalone native executable provides a clear
advantage. Keep language boundaries explicit and narrow.

## Databases

- Prefer MariaDB for smaller conventional hosted applications.
- Prefer PostgreSQL for larger systems, advanced relational workloads, and
  features that benefit from its ecosystem.
- Do not introduce a database as an authority for canonical RahRow entities;
  `.rahrow/` Markdown remains the product source of truth.
- Document schema ownership, migrations, backup, and consistency behavior
  before adding a database-backed adapter.
