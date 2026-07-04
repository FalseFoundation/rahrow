# RahRow Website

`@rahrow/www` contains the RahRow public documentation website and blog.

The canonical documentation source is the repository root `docs/` directory.
The app exposes that directory through the `content` symlink and renders it
with Nextra's standard content-directory loader. Top-level usage docs and
`docs/maintainers/` share that source tree but use separate route layouts and
navigation. Chronological release and project posts are canonical in the
app-local `posts/` directory. Do not copy documentation into the application or
posts into `docs/`.

Current contents:

- a Next.js App Router scaffold under `src/app/`
- Nextra with the stock docs and blog themes
- one catch-all route for top-level usage docs
- a dedicated `/maintainers` route for `docs/maintainers/` Markdown
- `/posts` routes backed by app-local Markdown in `posts/`
- app-local Next.js configuration

The root pnpm overrides keep Nextra on Zod 4.3.6 until its layout schemas are
compatible with Zod 4.4.x. `@rahrow/contracts` continues to use its own current
Zod version. Development and production builds use Next's webpack mode because
Turbopack does not reliably discover new files through the external
documentation content symlink.

Next.js and the React compiler are dependencies of this app only. Shared
TypeScript presets remain in `@rahrow/tooling`; framework runtime
configuration stays here until another app needs the same stable settings.

Keep blog posts in plain Markdown unless a post needs an interactive component.
Every post requires `title`, `description`, and `date` frontmatter and must be
registered in `src/blog/posts.ts` so static export can enumerate its route.

See
[`docs/maintainers/architecture/decisions/0001-documentation-platform.md`](../../docs/maintainers/architecture/decisions/0001-documentation-platform.md).
