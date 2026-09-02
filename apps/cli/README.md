# @rahrow/cli

RahRow CLI is a private Node.js TypeScript workspace for command-line access to
shared core and engine capabilities.

JSON is written to stdout. Diagnostics, skipped import entries, and errors are
written to stderr.

## Commands

- `profiles` — list or remove stored profiles
- `import` — import profiles from text, `--file`, or `--stdin`
- `export <id>` — serialize a stored profile
- `connect [id] --mode proxy` — explicitly start the local-proxy fallback
- `disconnect` — stop the active connection
- `restart [id]` — restart the selected connection
- `status` — print connection and engine status
- `test [id]` — run a latency probe for a profile
- `subscription add <id> <url> [--name <name>]` — store a subscription URL
- `subscription` / `subscription list` — list stored subscription sources
- `subscription remove <id>` — remove a stored subscription
- `subscription parse` — parse a pasted subscription body, file, or stdin
- `subscription refresh <id>` — fetch a stored subscription URL and import
  profiles

VPN/TUN remains the product default, but a terminal process cannot register an
OS VPN by itself. Therefore CLI `connect` fails closed unless `--mode proxy` was
passed or proxy mode was previously persisted. It never silently substitutes a
local proxy for the default VPN mode.

`connect` uses the persisted `engineId` (`xray` by default). Set
`RAHROW_XRAY_BINARY` or `RAHROW_SING_BOX_BINARY` to the selected engine's
explicit executable path. The CLI does not search `PATH`.

The CLI workspace is a contributor interface, not a standalone user artifact.
Release automation does not publish it separately. Desktop installations must
eventually expose this interface from the same installed layout and reuse the
bundle-local engines; until that wiring is complete the CLI remains
development-only.

`subscription refresh` fetches the stored URL. HTTP errors fail the command.
Malformed profile lines are skipped and reported on stderr without failing the
whole subscription.
