# Task File Conventions

Canonical RahRow entity metadata and Markdown file rules.

## RahRow Entity Files

Use YAML frontmatter for machine metadata and Markdown for human context:

```markdown
---
id: TS-01J00000000000000000000000
title: Add task validation
status: doing
priority: high
order: 10
createdAt: 2026-06-12
updatedAt: 2026-06-12 09:30 UTC
labels:
  - core
dependsOn: []
files:
  - packages/core/src/tasks/validateTask.ts
---

# Context

Describe why the work exists.

# Acceptance Criteria

- [ ] Invalid statuses produce an actionable diagnostic.
```

Rules:

- Require `id`, `title`, `status`, `createdAt`, and `updatedAt`.
- Read and serialize one strict versionless task shape. Reject versioned task
  frontmatter instead of silently migrating or repairing it.
- Accept people, planning, canonical relationship, path, and project metadata
  only through the shared strict schema.
- Use `todo`, `doing`, `blocked`, `done`, and `canceled` for task status.
- Use `low`, `medium`, `high`, and `urgent` for task priority.
- Priority is the sole measure of task importance. Do not add a second,
  overlapping importance field.
- `order` is the sole user-controlled sequence field. It is an optional finite
  nonnegative number. Lower values sort first, missing values sort after
  ordered tasks, and duplicate values fall back to task ID ordering.
- Repository configuration may select and order the active values from that
  vocabulary. Defaults and task creation must respect the configured list.
- Define one canonical representation for each field.
- Use repository-relative POSIX paths in persisted metadata.
- Serialize new timestamps as `YYYY-MM-DD` or `YYYY-MM-DD HH:mm UTC`. Continue
  reading the documented legacy ISO 8601 UTC form until a compatibility change
  explicitly removes it.
- Keep IDs immutable and compare them exactly.
- Format task IDs as `TS-` followed by a 26-character uppercase ULID.
- Preserve user-authored body text and meaningful list order.
- Use stable key ordering and one final newline in generated output.
- Omit absent optional fields consistently; do not alternate between missing,
  empty, and `null` without schema meaning.
- Validate enum values, dates, paths, IDs, and relationship targets centrally.
- Validate normalized CLI arguments and public core inputs with Zod schemas.
  Keep `parseArgs` limited to tokenization and use `superRefine` for
  cross-option rules.
- Do not infer `updatedAt` or lifecycle timestamps differently in each client.
- Do not write derived inverse relationships into files unless the schema makes
  them independently authoritative.
- Keep `dependsOn`, `related`, `duplicates`, and `parent` canonical. Derive
  `blockedBy`, `blocks`, `children`, and `subtasks`.
- Treat schema additions, removals, defaults, and coercions as compatibility
  decisions.
- Reject unknown fields, duplicate list values, self-dependencies,
  non-normalized paths, and an `updatedAt` value earlier than `createdAt`.
- Never silently repair a file during a read. `doctor` may propose or perform
  explicit fixes with user-visible output.

Keep schemas and static contracts in `@rahrow/contracts`. Keep parsing
orchestration, defaults, transitions, validation policy, and migrations in
`@rahrow/core`. Keep generic YAML/Markdown mechanics in `@rahrow/utils` only
when they are not RahRow-specific.

Put generic date, time, and mathematical operations in `@rahrow/utils` when
they have no task-domain policy. Prefer names such as `parseDate` over
task-specific wrappers such as `parseTaskDate`.
