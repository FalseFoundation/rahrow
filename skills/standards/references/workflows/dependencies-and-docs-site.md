# Dependencies And Docs Site

Dependency management, website workflow, publishing pages, and backend dependency choices.

## Dependency Management

Add dependencies to the package that imports them:

```bash
pnpm --filter <package-name> add <runtime-package>
pnpm --filter <package-name> add --save-dev <tooling-package>
pnpm --filter <package-name> add @rahrow/core@workspace:*
```

Rules:

- Do not add a root dependency to make a child package compile.
- Do not rely on root hoisting, transitive dependencies, or another package's
  `node_modules`.
- Keep browser and React dependencies out of core, types, and domain-light
  utilities.
- Prefer one parser, validator, and serialization stack for the canonical file
  format.
- Review license, runtime support, ESM compatibility, maintenance, and bundle
  impact before adding foundational dependencies.
- Keep lockfile changes scoped to the dependency operation.

Frontend packages should follow the TanStack preference in
`docs/maintainers/technology.md`, but only install Query, Form, Table, Hotkeys,
Pacer, Virtual, DB, or their devtools when the owning feature uses them.

`@rahrow/www` uses Next.js webpack mode for development and production because
Turbopack does not reliably discover new files through the external `docs/`
content symlink.

The website renders canonical documentation from the `apps/www/content`
symlink and canonical blog posts from `apps/www/posts/`. Top-level usage docs
and `docs/maintainers/` use separate route layouts and page maps; keep
maintainer material out of the primary usage-docs navigation. Add each post to
`apps/www/src/blog/posts.ts` so `/posts/[slug]` remains statically enumerable.
Docs and blog routes use separate Nextra theme wrappers.

`.github/workflows/publish-pages.yml` builds `@rahrow/www` as a static export
and deploys `apps/www/out` to GitHub Pages on pushes to `main` or manual
dispatch. The workflow supplies the Pages base path through `STATIC_EXPORT` so
project sites work below the repository subpath; `/` represents a root site.
Local development and server builds keep their normal Next.js configuration.

For backend work, prefer TypeScript first. Add NestJS,
`class-transformer`, `class-validator`, and TypeORM only in the owning server
application when its architecture needs them. Use Rust for a clearly bounded
systems-level component, not as an incidental second implementation of core
domain behavior. Choose MariaDB for smaller hosted applications and PostgreSQL
for larger or more advanced relational workloads.
