# Persisted Data And Git Workflows

Persisted format, generated view, Git, and concurrency-sensitive workflow rules.

## Persisted Data and Git Workflows

Use temporary fixture repositories for tests that invoke Git. Configure test
identity locally inside the fixture; never depend on the developer's global Git
configuration.

For persisted format changes:

1. Add old-format fixtures.
2. Define read compatibility and write behavior.
3. Implement an explicit compatibility path when rewriting is required.
4. Verify compatibility behavior and rollback safety.
5. Preserve a recoverable backup or fail before mutation.
6. Document user-visible consequences.

For generated indexes and views:

1. Delete the derived state.
2. Rebuild it from canonical entities.
3. Verify equivalent observable output and stale-file removal.

For concurrency-sensitive writes, test stale reads, competing updates, and
partial failures. Do not imply database-style transaction guarantees that the
filesystem and Git do not provide.
