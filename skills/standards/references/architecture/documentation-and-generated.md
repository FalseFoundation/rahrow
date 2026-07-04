# Documentation And Generated Sources

Documentation architecture, interface boundaries, integrations, and generated sources.

## Documentation Architecture

`docs/` is the canonical source for documentation. Its top-level pages contain
user-facing product guidance. `docs/maintainers/` owns product direction,
architecture, ADRs, engineering workflows, and technology policy. Keep the
maintainer section visibly separate from the primary usage flow.

`apps/www/` renders `docs/` through Nextra. Its `content` symlink points to the
root `docs/` directory so the app does not maintain a copied documentation
tree. Top-level usage docs and `docs/maintainers/` use separate route layouts
and page maps so their navigation stays audience-specific. Chronological
release and project posts are a separate website-owned content type stored
canonically in `apps/www/posts/`.

Use plain Markdown by default. Use MDX only when a page needs an interactive
component. Keep frontmatter compatible with the documentation renderer.

Recommended website stack:

- Next.js App Router because the repository already carries a Next.js shared
  configuration and `apps/www` also owns marketing pages
- Nextra with the stock docs and blog themes
- Nextra's standard content-directory catch-all route
- route-isolated docs and blog layouts with separate MDX component sets
- self-hosted search initially; no CMS or remote content database

Register blog posts in the app-local post registry so static export can
enumerate `/posts/[slug]`. Keep blog posts in plain Markdown by default with
`title`, `description`, and `date` frontmatter. Do not merge docs and blog theme
wrappers in the global MDX component map.

Keep architectural decisions under
`docs/maintainers/architecture/decisions/`.
Update user docs, maintainer docs, tests, and this standards skill together
when their contracts change.

## Interfaces and Integrations

- CLI commands are scriptable: stable exit codes, useful stdout, diagnostics on
  stderr, and structured output when supported.
- MCP tools expose the same validated operations as CLI and other clients. MCP
  must not bypass filesystem, graph, or lifecycle rules.
- TUI, Kanban, extension, and Office are projections over core state, not
  independent stores.
- Office needs an explicit repository, branch, authentication, refresh, and
  write-concurrency model before it performs remote mutations.
- Integration packages use explicit import, export, or synchronization
  contracts. Conflicts and ownership direction must be visible.
- GitHub, Jira, Linear, ClickUp, and Notion are integrations, not implicit
  authorities.

## Generated Sources

Treat these as generated or ephemeral unless an owning tool says otherwise:

- `node_modules/`
- `dist/`, `build/`, `out/`, `.next/`
- `.turbo/`, coverage, logs, and `*.tsbuildinfo`
- `.rahrow/cache/`
- `.rahrow/generated/`
- `.rahrow/snapshots/`
- Nextra and Next.js generated website output

Change the source or generator, then regenerate. Never make a manual output edit
the final implementation.
