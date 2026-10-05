# @rahrow/features

## 0.1.0

### Minor Changes

- 85edaa4: Add canonical RahRow About metadata under the core product seam, capability-gated external and email navigation, desktop and mobile build metadata wiring, and a CLI `about` command that prints support, source, license, and product information without pretending to open links.
- 85edaa4: Unify RahRow around a dark connection-aware shell, meaningful icon-led empty
  states, shared safe-area headers and nested navigation, capability-driven
  Settings visibility, cardless diagnostics with bounded logs, and one QR, URL,
  or Manual connection-import drawer. Preserve subscription ownership when
  profiles are imported, refreshed, grouped, or removed.
- 85edaa4: Persist connection latency and viewport snapshots, and render large grouped
  connection collections through the app scroll surface with paced loading,
  dynamic virtualization, sticky provider headers, and bounded speed-test updates.
- 85edaa4: Add durable, provider-neutral advertising gates after three connection selections
  and successful VPN connections. Add a shared policy-safe drawer, native Google
  AdMob and consent integration for mobile, and an opt-in embedded sponsor provider
  for desktop. Development previews now include a safe test provider, and
  Diagnostics reports provider, policy progress, pending work, attempts, and the
  last completion result.
- 85edaa4: Observe the externally visible post-connect IP through a timeout-bounded, route-aware capability and present it on Home without exposing local addresses or profile endpoints.
- 0382c93: Add the shared engine, connection-mode, and platform capability resolver and generate Settings mode choices from it, so apps fail closed with specific runtime, adapter, build, architecture, provider, and permission reasons.
- 85edaa4: Hide clipboard, paste, share, and save actions when the active platform does not provide a truthful capability, and treat canceled native share sheets as neutral outcomes.
- 85edaa4: Add a paced, cancellable Connections cleanup flow that checks every saved
  connection and subscription source, reviews failures before deletion, protects
  locked subscriptions, and requires explicit irreversible confirmation.
- 85edaa4: Make sing-box over VPN/TUN the persisted default connection, generate native dual-stack
  TUN configurations for the selected desktop engine, keep system proxy as an
  explicit lifecycle-managed fallback, expose tunnel capability diagnostics,
  remove legacy settings migration, and rename shared process and native runtime
  boundaries from Xray-specific names to generic engine names. Desktop releases
  validate both modes with the bundled engines and include Wintun and third-party
  license materials where required. Desktop VPN mode fails closed before engine
  launch until a real platform tunnel provider is installed; administrator-script
  elevation is not treated as a production VPN facility.

### Patch Changes

- 85edaa4: Add sing-box configuration, process, registry, and selected-engine support alongside Xray; add an engine-neutral pinned runtime pipeline; bundle both verified sidecars in desktop releases; and make persisted engine selection drive CLI, desktop, mobile, diagnostics, and shared settings behavior.
- 85edaa4: Recover persisted Smart Connect schedules through one deduplicated host runner and expose truthful background lifecycle diagnostics.
- 85edaa4: Route QR image saving through an injected platform capability and hide the action when the host cannot save files.
- 85edaa4: Add a cancellable post-connect Cloudflare latency check and an automatic download estimate capped at 1 MiB, with separate latency and throughput reporting across VPN and proxy routes.
- 85edaa4: Keep displayed connection endpoints out of text selection while preserving
  explicit copy and export controls, and shorten failed-ping labels in English and
  Persian. Replace aggregate Diagnostics filler with complete, untruncated item
  descriptions and consistent copied status details. Centralize top-positioned
  toast layout below the app header or at the safe-area edge while drawers are
  open.
- 85edaa4: Use concise localized labels and tooltips for connection and subscription actions.
- 85edaa4: Wire desktop Home connect/status/latency through ConnectionController and the Xray sidecar adapter, default engine latency probing behind an injected platform adapter, and let Settings toggle only supported native capabilities.
- 85edaa4: Add a shared Pino logger and in-memory diagnostics log buffer so desktop and mobile can inspect application, engine, and secret-safe user-action events. Keep the Logs screen focused on the live table without advanced filters or table actions.
- 85edaa4: Route post-connect egress identity and Cloudflare readiness observations through bounded native SOCKS requests in proxy mode. Unsupported hosts now fail closed instead of silently observing the direct route.
- 85edaa4: Expose cancellation-safe Smart Connect progress and add shared Home and Connections controls with transparent selection, switching, recovery, and five-minute schedule status.
- 85edaa4: Keep completed ad views at least five minutes apart across restarts while retaining
  queued ad obligations for later presentation.
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
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [85edaa4]
- Updated dependencies [50a5cf6]
- Updated dependencies [85edaa4]
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
  - @rahrow/ui@0.1.0
  - @rahrow/ads@0.1.0
