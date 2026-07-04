# Backend And Tooling

Backend technology choices plus shell and automation conventions.

## Backend Technology

- Prefer TypeScript for services and hosted adapters.
- Use NestJS when modules, dependency injection, guards, transport adapters, or
  service scale justify it; do not add NestJS to a small composition root by
  default.
- With NestJS, prefer `class-transformer` and `class-validator` at transport DTO
  boundaries.
- Prefer TypeORM when an object-relational mapper is appropriate.
- Use Rust for native executables or components with a concrete need for
  systems performance, memory control, portability, or concurrency.
- Prefer MariaDB for smaller hosted applications and PostgreSQL for larger or
  more advanced relational workloads.
- Keep database schemas, migrations, backup, and consistency behavior explicit.
- No server or database replaces `.rahrow/` Markdown as canonical RahRow
  state.

## Shell and Tooling

- Start Bash scripts with `set -euo pipefail`.
- Derive `repo_root` from the script location.
- Quote paths and variable expansions.
- Validate prerequisites before mutation.
- Make setup and generation idempotent.
- Use temporary directories and traps for cleanup.
- Print concise, prefixed, actionable errors.
- Keep automation with its owning package or a focused tooling directory when
  one is introduced.
- Do not add root scripts that duplicate package-manager or Turbo behavior.
