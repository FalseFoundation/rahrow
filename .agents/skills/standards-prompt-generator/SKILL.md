---
name: standards-prompt-generator
description: 'Convert a raw user prompt into a structured JSON prompt that carries the reasoned interpretation of the request plus every applicable rule from the standards skill (core architecture thinking order, authority order, mandatory/domain-conditional skills, non-negotiable architecture rules, execute/verify/finish checklists) so a downstream agent, subagent, or session cannot drift out of repo architecture. Use when the user asks to "generate a standards prompt", "wrap this prompt with standards rules", "make a rule-safe prompt", "produce a JSON prompt for another agent", "hand this off without losing the rules", or needs a portable, architecture-guarded task spec.'
argument-hint: '<raw prompt text to reason about and wrap>'
---

# Standards Prompt Generator

Wrap raw prompt in JSON. JSON hold reasoned intent plus applicable `standards`
rules, while delegating domain-specific implementation rules to the specialized
skills (`turborepo`, `shadcn`, `vercel-composition-patterns`,
`vercel-react-best-practices`, `tdd`).

## When to Use

- User want task spec that travel with its architecture guardrails attached (multi-agent handoff, subagent dispatch, later session).
- User explicit ask for "standards-compliant prompt" or "JSON prompt" wrapping some request.
- Not for normal in-session work — there, load `standards` skill directly and act. This generator exist for cases where the *reasoning artifact itself* is the deliverable.

## Procedure

1. Store input prompt verbatim in `originalPrompt`. Do not paraphrase or drop meaning.
2. Read `.agents/skills/netpilot-standards/SKILL.md` fresh at generation time — never hardcode stale copy of its rules; that file is single source of truth and can change.
3. Apply standards' "Start With Judgment": derive intent, constraints, related changes, one concrete completion condition. Inspect worktree (`git status --short --branch`, manifests, nearby code) when needed to ground `taskDomain`.
4. Detect touched surfaces (`apps/`, `extensions/`, `packages/`, `server/`, `vendors/`). Load matching use-case files only for domains actually touched (`use-cases/netpilot.md`, `principles-applied.md`, `conventions.md`, `workflows.md`, `release.md`).
5. Set `mandatorySkills` — always `standards`, `caveman`, `codebase-memory`, `turborepo`. Set `domainConditionalSkills` only when the task enters those domains: `shadcn`, `vercel-composition-patterns`, `vercel-react-best-practices`, `tdd`.
6. Pull the non-negotiable rules from standards' "Preserve Core Architecture" that are relevant to the touched paths — full meaning kept, not compressed into ambiguity.
7. Fill `executionPlan` from standards' "Execute Safely", "Verify by Risk", "Finish the Whole Change" sections, and avoid re-encoding detailed domain playbooks that already belong to the specialized skills.
8. If judgment cannot resolve a consequential decision from repo facts alone, list it in `openQuestions`. Do not silently guess a consequential, unrecoverable choice.
9. Emit ONLY the JSON object below as the deliverable. A short caveman-compressed sentence may precede it in chat, but never compress inside JSON string values — a downstream agent must parse them precisely and completely.

## JSON Schema

```json
{
  "originalPrompt": "string — verbatim input prompt",
  "reasonedInput": {
    "intent": "string",
    "constraints": ["string"],
    "relatedChanges": ["string"],
    "completionCondition": "string",
    "openQuestions": ["string — empty array if none"]
  },
  "taskDomain": {
    "touchedPaths": ["apps/...", "extensions/...", "packages/...", "server/...", "vendors/..."],
    "touchesUI": false,
    "touchesBackend": false,
    "owningModules": ["string — bounded module/crate names actually touched"]
  },
  "mandatorySkills": ["standards", "caveman", "codebase-memory", "turborepo"],
  "domainConditionalSkills": ["string — e.g. shadcn, vercel-composition-patterns, vercel-react-best-practices, tdd"],
  "referencesLoaded": {
    "core": ["principles.md", "conventions.md", "workflows.md", "release.md"],
    "useCases": ["netpilot.md", "principles-applied.md", "conventions.md", "workflows.md", "release.md"]
  },
  "authorityOrder": [
    "current user constraints and the actual task",
    "executable manifests and tooling (package.json, pnpm-workspace.yaml, turbo.json, biome.json, pyproject.toml, Cargo manifests, scripts)",
    "current implementation and tests",
    "current first-party documentation",
    "git history and .archives for rationale only"
  ],
  "architectureThinkingOrder": [
    "reusability and composability first",
    "SOLID and clean code",
    "separation of concerns",
    "composition over inheritance",
    "domain-driven design",
    "modular monolith",
    "feature-based architecture"
  ],
  "nonNegotiables": ["string — one per applicable rule from standards' Preserve Core Architecture section, kept relevant to touchedPaths"],
  "executionPlan": {
    "beforeEditing": ["run git status --short --branch", "identify user-owned modifications", "search existing contracts/helpers/hooks/components/scripts/tests via codebase-memory search before writing new", "determine ownership: owned source vs generated vs symlink vs overlay vs vendor input"],
    "whileEditing": ["keep change scoped to owning layer plus required dependents", "use workspace:* protocol for internal deps", "declare every imported package in the importing package's own manifest", "never point language-server path config at a neighboring package's src/ or node_modules/", "never hand-edit generated dist/out/target/.turbo/vendor artifacts", "add or update smallest tests proving the behavior"],
    "verifyByRisk": ["focused unit/script test", "owning package/crate test", "formatting/lint and type/build checks", "cross-boundary integration tests", "product E2E or vendor-source compilation when behavior requires it"],
    "finishChecklist": ["review git diff --check and final scoped diff", "confirm architecture and source-of-truth rules still hold", "add Changeset if versioned package behavior changed", "summarize behavior/boundaries/checks actually run, caveman-compressed"]
  },
  "outputContract": {
    "communicationStyle": "caveman",
    "changesetRequired": "true | false | unknown",
    "summaryRequirement": "string — what the executing agent must report back on completion"
  }
}
```

## Example

Input: `"add a settings gear icon to the NetPilot panel header"`

```json
{
  "originalPrompt": "add a settings gear icon to the NetPilot panel header",
  "reasonedInput": {
    "intent": "Add a settings entry point to the NetPilot panel's header chrome.",
    "constraints": ["must use VS Code contribution points, not a hand-built WebView control", "must not duplicate existing panel-header actions"],
    "relatedChanges": ["extension package.json contributes.menus/view/title entry", "command handler wiring", "possible contracts update if settings screen needs new bridge call"],
    "completionCondition": "Gear icon appears in panel title bar via contributes.menus, wired to existing or new settings command, verified in Extension Development Host.",
    "openQuestions": []
  },
  "taskDomain": {
    "touchedPaths": ["extensions/netpilot"],
    "touchesUI": true,
    "touchesBackend": false,
    "owningModules": ["netpilot VS Code extension host"]
  },
  "mandatorySkills": ["standards", "caveman", "codebase-memory", "turborepo"],
  "domainConditionalSkills": ["shadcn", "vercel-composition-patterns", "vercel-react-best-practices"],
  "referencesLoaded": {
    "core": ["principles.md", "conventions.md"],
    "useCases": ["netpilot.md", "conventions.md"]
  },
  "authorityOrder": ["current user constraints and the actual task", "executable manifests and tooling", "current implementation and tests", "current first-party documentation", "git history and .archives for rationale only"],
  "architectureThinkingOrder": ["reusability and composability first", "SOLID and clean code", "separation of concerns", "composition over inheritance", "domain-driven design", "modular monolith", "feature-based architecture"],
  "nonNegotiables": [
    "build panel/view chrome from the VS Code extension host's own contribution points before adding an equivalent control inside a WebView screen",
    "keep product-facing UI behind its typed bridge; UI does not call the backend directly",
    "keep the VS Code client gateway as the single owner of VS Code APIs, WebView hosting, and transport lifecycle"
  ],
  "executionPlan": {
    "beforeEditing": ["run git status --short --branch", "search existing panel-header contributions before adding a new one"],
    "whileEditing": ["wire command through extension's existing command registration pattern", "keep contracts changes in the shared contracts package if bridge surface grows"],
    "verifyByRisk": ["extension unit test for command registration", "manual verification in Extension Development Host"],
    "finishChecklist": ["confirm no ad hoc WebView control duplicates the new contribution", "add Changeset if extension package version-tracked behavior changed"]
  },
  "outputContract": {
    "communicationStyle": "caveman",
    "changesetRequired": "unknown",
    "summaryRequirement": "report which contribution point was used and where the command handler lives"
  }
}
```

## Keep In Sync

Schema field names mirror `standards/SKILL.md` section headings (Start With Judgment, Establish Authority, Core Architecture and Design Thinking, Domain-Conditional Skills, Preserve Core Architecture, Execute Safely, Verify by Risk, Finish the Whole Change). When that skill renames, adds, or removes a section, update this schema and procedure in the same change — per standards' own "Update This Skill" rule.
