# Validation Workflow

Validation command order, root checks, and handling unrelated failures.

## Validation

Start narrow:

```bash
pnpm --filter <package-name> test
pnpm --filter <package-name> build
```

Then run relevant root checks:

```bash
pnpm lint
pnpm test
pnpm build
git diff --check
```

Use `pnpm format` only when formatting changes are intended, then inspect the
diff. Biome is authoritative; do not introduce ESLint or Prettier to solve a
local issue.

When a root check fails because of pre-existing scaffold state:

1. Confirm the failure is unrelated to the current change.
2. Run the narrowest check that validates the changed owner.
3. Report the exact blocker.
4. Fix it only when it belongs to the request or prevents reliable validation.

Never claim an unrun or failed check passed.
