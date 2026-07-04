# Tests And Documentation

Testing and documentation conventions.

## Tests and Documentation

- Use Vitest as the default TypeScript unit and integration test runner.
- Use explicit imports from `vitest`; do not enable test globals repository-wide.
- Prefer test-first development for domain rules, parser behavior, lifecycle
  transitions, graph invariants, migrations, and bug regressions.
- Do not force test-first ceremony for documentation, formatting, generated
  configuration, or short-lived exploratory work.
- Add regression coverage for bug fixes.
- Test behavior and boundary contracts, not implementation trivia.
- Use temporary directories for filesystem tests.
- Use fixture repositories for Git, monorepo discovery, and path-impact tests.
- Cover CRLF/LF, Unicode, empty bodies, malformed YAML, duplicate IDs, broken
  links, cycles, and interrupted writes where relevant.
- Verify parse/serialize round trips without losing Markdown.
- Keep unit tests deterministic and independent of user Git configuration,
  network services, wall-clock time, and the actual repository.
- Mark integration prerequisites explicitly.
- Use current paths and package names in documentation.
- Keep user documentation in `docs/`; `apps/www` renders it.
- Keep chronological release and project posts in `apps/www/posts/`; require
  `title`, `description`, and `date` frontmatter and register each route in the
  website's post registry.
- Keep contributor, architecture, ADR, testing, and technology documentation
  in `docs/maintainers/`.
- Render maintainer documentation through the website's dedicated
  `/maintainers` route and keep it out of the primary usage-docs navigation.
- Keep a concise `README.md` in each package and app describing ownership,
  dependencies, and current contents.
- Keep the root `README.md` focused on installing, configuring, and using
  RahRow. Keep detailed repository work under `docs/maintainers/`; root
  community files may provide short discovery links to that canonical guidance.
- Write user docs for newcomers first through short examples and plain
  language, then provide precise contracts and edge cases for advanced users.
  Simplicity must not come from hiding important constraints.
- Prefer `.md` for content. Use `.mdx` only when interactive React content is
  required.
- Include `title` and `description` frontmatter on pages rendered by the docs
  site.
- Keep product plans distinct from executable specifications.
- Update docs when commands, persisted formats, or public package contracts
  change.
- Update `skills/standards/` in the same change when these repository standards
  or workflows change.
- When a workspace task finishes, update its canonical RahRow task through the
  CLI when supported, then update affected user docs, maintainer docs, tests,
  and standards before declaring the work complete.
