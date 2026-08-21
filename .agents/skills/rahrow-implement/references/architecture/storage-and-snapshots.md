# Storage And Snapshots

Local profile/settings storage and snapshot rules.

## Storage Rules

- Persist normalized profiles and settings through explicit ports.
- Validate all persisted reads with Zod.
- Reject path traversal, malformed JSON, invalid protocol values, invalid ports,
  duplicate IDs, and unknown required fields with actionable diagnostics.
- Keep IDs immutable.
- Never silently discard unknown or invalid data. Reject it or preserve it
  according to an explicit schema policy.
- Write through temporary files and atomic replacement where the platform
  permits it. A failed update must not leave truncated profile data.
- Make ordering deterministic where order has no domain meaning.
- Keep platform-specific filesystem paths outside core contracts.

## Snapshot Policy

Snapshot capability is optional safety behavior for local profile/settings data
before destructive imports, migrations, repairs, or bulk mutations:

- snapshots are user-invoked or created immediately before a destructive
  operation
- snapshots are immutable, timestamped, and content-addressable where practical
- snapshots contain canonical profile/settings data and enough metadata to
  explain why they exist
- snapshots are non-authoritative and may be deleted without changing current
  state
- restore is explicit and conflict-aware

Snapshot restore should preview by default and require explicit apply before
mutating canonical artifacts.
