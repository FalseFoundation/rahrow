# @rahrow/engine

## 0.1.0

### Minor Changes

- 85edaa4: Add sing-box configuration, process, registry, and selected-engine support alongside Xray; add an engine-neutral pinned runtime pipeline; bundle both verified sidecars in desktop releases; and make persisted engine selection drive CLI, desktop, mobile, diagnostics, and shared settings behavior.
- 85edaa4: Add validated Shadowsocks SIP002 profiles with modern cipher support, Xray and sing-box compilers, and an engine-neutral platform VPN tunnel provider contract.
- 85edaa4: Add canonical Hysteria, Hysteria2, and host-key-pinned SSH profiles, credential-free IPC-safe imported profile IDs, plus a shared secure subscription policy with credential-redacted diagnostics and atomic subscription profile replacement.

### Patch Changes

- 85edaa4: Add Zod-backed settings parsing in core, expose injectable Xray latency diagnostics through the engine package, and publish direct source-file subpaths without barrel or compatibility entrypoints.
- 85edaa4: Fetch the pinned Xray runtime for desktop `pnpm dev` and keep native start diagnostics instead of replacing them with a generic failure.
- 85edaa4: Wire desktop Home connect/status/latency through ConnectionController and the Xray sidecar adapter, default engine latency probing behind an injected platform adapter, and let Settings toggle only supported native capabilities.
- 85edaa4: Honor an explicit per-connection engine selection so recovery can restore the engine that owned the previous connection.
- 85edaa4: Add a shared Pino logger and in-memory diagnostics log buffer so desktop and mobile can inspect application, engine, and secret-safe user-action events. Keep the Logs screen focused on the live table without advanced filters or table actions.
- 85edaa4: Make sing-box over VPN/TUN the persisted default connection, generate native dual-stack
  TUN configurations for the selected desktop engine, keep system proxy as an
  explicit lifecycle-managed fallback, expose tunnel capability diagnostics,
  remove legacy settings migration, and rename shared process and native runtime
  boundaries from Xray-specific names to generic engine names. Desktop releases
  validate both modes with the bundled engines and include Wintun and third-party
  license materials where required. Desktop VPN mode fails closed before engine
  launch until a real platform tunnel provider is installed; administrator-script
  elevation is not treated as a production VPN facility.
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [50a5cf6]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [0382c93]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
  - @rahrow/core@0.1.0
