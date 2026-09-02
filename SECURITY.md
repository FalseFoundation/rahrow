# Security Policy

RahRow does not publish supported release lines. There are no signed installers. Fixes target the latest `main` branch.

## Reporting a vulnerability

Do not open a public issue.

Use the GitHub private vulnerability report for [FalseFoundation/rahrow](https://github.com/FalseFoundation/rahrow) when available. Otherwise contact the repository owner privately with:

- the affected command, package, or file format
- reproduction steps
- expected and actual behavior
- potential impact
- any known workaround

Relevant issues include path traversal, command injection, untrusted URL or subscription parsing, persisted JSON that fails open, secret leakage, and anything that starts a local proxy without an explicit user action.

Maintainers will confirm receipt when possible, investigate, and coordinate disclosure after a fix or mitigation exists.
