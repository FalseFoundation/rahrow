# Storage And Snapshots

Storage, graph, and snapshot rules for canonical repository data.

## Storage and Graph Rules

- Parse frontmatter with a YAML parser and Markdown with a structured parser
  where structure matters. Do not parse entity files with ad hoc regular
  expressions.
- Normalize stored code references to repository-relative POSIX paths.
- Reject paths that escape repository ownership boundaries.
- Keep IDs immutable. Do not adopt sequential IDs without a documented
  branch-collision strategy.
- Store one canonical direction for inverse relationships unless the schema
  explicitly defines otherwise.
- Detect duplicate IDs, missing targets, invalid transitions, and cycles with
  actionable diagnostics.
- Preserve meaningful user-authored content during metadata edits.
- Never silently discard unknown or invalid data. Reject it or preserve it
  according to an explicit schema policy.
- Write through temporary files and atomic replacement where the platform
  permits it. A failed update must not leave a truncated entity.
- Make ordering deterministic where order has no domain meaning.

## Snapshot Policy

Git commits and branches are the normal history and rollback mechanism.

Snapshot capability is a safety mechanism for uncommitted state before
migrations, restores, imports, repairs, or bulk mutations:

- snapshots are user-invoked or created immediately before a destructive
  operation
- snapshots are immutable, timestamped, and content-addressable where practical
- snapshots contain canonical runtime/profile data and enough metadata to
  explain why they exist
- snapshots are non-authoritative and may be deleted without changing current
  project state
- restore is explicit and conflict-aware
- snapshots do not replace Git commits, reflogs, or normal backups

Snapshot restore should preview by default and require explicit apply before
mutating canonical artifacts.
