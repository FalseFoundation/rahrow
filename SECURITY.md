# Security Policy

RahRow is pre-alpha and does not yet publish supported release lines. Security
fixes target the latest development branch.

## Reporting a Vulnerability

Do not open a public issue for a vulnerability.

Use the repository host's private vulnerability-reporting feature when
available. Otherwise, contact the project owner privately with:

- the affected command, package, or file format
- reproduction steps
- expected and actual behavior
- potential impact
- any known workaround

Relevant issues include path traversal, unsafe symlink handling, command
injection, unintended file overwrite or deletion, secret exposure, malicious
Markdown or YAML handling, and authorization failures in future hosted
interfaces.

Maintainers will confirm receipt when possible, investigate the report, and
coordinate disclosure after a fix or mitigation is available.
