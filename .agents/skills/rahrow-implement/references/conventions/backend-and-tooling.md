# Backend And Tooling

Backend technology choices plus shell and automation conventions.

## Backend And Native Technology

- RahRow has no initial backend requirement. Do not add a server, NestJS,
  database, object storage, cache, queue, or remote API without a concrete
  product requirement.
- Prefer TypeScript for domain behavior, orchestration, validation, parsing,
  serialization, and app-facing contracts.
- Use Rust, Kotlin, or Swift only for platform-native capabilities that require
  native access, such as Tauri integration, sidecar process lifecycle, Android
  VPN APIs, or iOS Network Extension APIs.
- Do not reimplement the TypeScript domain model in native code.
- Use local persistence for profiles and settings. Validate persisted data with
  Zod at read boundaries and document migration behavior before changing a
  persisted format.

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
