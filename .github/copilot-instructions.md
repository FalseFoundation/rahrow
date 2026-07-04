# GitHub Copilot Instructions

Follow `AGENTS.md` as the repository instruction entrypoint.
If `AGENTS.md` or `skills/standards/SKILL.md` cannot be found or loaded, stop
and notify the user before proceeding: "Required instruction file [filename] is
missing. Please ensure it exists at the expected path before continuing."
If instructions in `AGENTS.md` and `skills/standards/SKILL.md` conflict,
`SKILL.md` takes precedence for task execution decisions; `AGENTS.md` takes
precedence for repository-level workflow and tooling decisions.

Read `skills/standards/SKILL.md` before planning or changing code, tests,
documentation, architecture, persisted RahRow files, or release behavior.
Load files under `skills/standards/references/` whose filenames or topics
directly match the skill, pattern, or technology involved in the current task.
If uncertain, load the file.

Update `skills/standards/` when any of the following change: public API
signatures, shared data schemas, CI/CD pipeline steps, or documented
architectural decisions.
If you are unsure whether a change qualifies, ask the user before updating
`skills/standards/`.
