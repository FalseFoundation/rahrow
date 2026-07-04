---
title: Documentation
description: How user Markdown becomes the RahRow documentation website.
---

# Documentation

The root `docs/` directory is canonical for user-facing guidance and maintainer
guidance. Top-level pages are for users. Repository maintenance material belongs
under `docs/maintainers/`.

## Recommended Website Stack

Use Next.js App Router, Nextra, `nextra-theme-docs`, and
`nextra-theme-blog` in `apps/www`.

Why:

- `apps/www` owns the public documentation renderer
- the repository already has a Next.js TypeScript preset
- Nextra supplies Markdown routing, documentation navigation, blog layout, and
  search
- Markdown remains the source rather than a CMS database

## Content Rules

- Use `.md` unless the page needs an interactive component.
- Add `title` and `description` frontmatter.
- Keep conceptual pages separate from current command reference.
- Mark future behavior as planned.
- Link to source files with repository-relative paths.
- Keep generated API reference separate from hand-authored concepts.
- Keep architecture, ADRs, development workflows, and technology preferences
  under `docs/maintainers/`, not in top-level usage navigation.
- Keep chronological release and project posts under `apps/www/posts/`.
- Require `title`, `description`, and `date` frontmatter for blog posts.
- Register each post in `apps/www/src/blog/posts.ts` so the static build can
  enumerate `/posts/[slug]`.

## Integration

`apps/www/content` is a repository-relative symlink to `../../docs`. Nextra's
standard content-directory loader renders that source without copying it or
maintaining a second source tree. The top-level usage docs route filters
`docs/maintainers/` out of its primary navigation, and the dedicated
`/maintainers` route renders the same canonical maintainer Markdown with its own
page map.

Usage docs, maintainer docs, and blog pages use separate route layouts and
receive their own MDX component sets. Do not merge docs and blog themes in the
global `mdx-components.tsx`; their wrapper components own different page
contracts. Blog Markdown is loaded from `apps/www/posts/` through the app-local
post registry.

Run the Next.js development and production builds in webpack mode. Turbopack
does not reliably discover newly added Markdown through the external content
symlink.

Keep stable public site metadata such as `docsRepositoryBase` in the owning app
configuration. Do not add a root `.env` for a non-secret constant. Use an
app-local environment variable and checked-in `.env.example` only when a value
genuinely differs by deployment.

The website may generate `.next/`, search data, and build output. These are
derived and ignored. Root `docs/` Markdown remains authoritative for
documentation, and `apps/www/posts/` Markdown remains authoritative for blog
posts.

See [ADR 0001](../architecture/decisions/0001-documentation-platform.md).
