# RahRow

RahRow is the Tauri host for the shared product UI and selectable Xray
or sing-box engines.

## Advertising

Development builds use an embedded test advertisement by default so the gate
can be exercised without service credentials. Production advertising remains
disabled unless `VITE_RAHROW_ADS_ENABLED=true` and the
`VITE_RAHROW_AD_SPONSOR`, `VITE_RAHROW_AD_HEADLINE`, and
`VITE_RAHROW_AD_BODY` variables are set. This activates the provider-neutral
embedded sponsor adapter. Optional action copy and destination use
`VITE_RAHROW_AD_ACTION_LABEL` and `VITE_RAHROW_AD_ACTION_URL`.

## App icons

`pnpm icons:generate` regenerates the checked-in Tauri icon set from
`packages/static/src/images/rahrow-logo-white-filled.svg`. The source is the
official white RahRow mark on a static black background, which keeps the mark
legible across launchers that do not support appearance-specific icons.

## Bundled engine sidecars

`pnpm build` creates only the portable Vite application. From the repository
root, `pnpm bundle:desktop` builds that application, stages pinned Xray and
sing-box binaries from `engines/*/runtime.json` into `src-tauri/binaries/`,
validates the generated engine configs, then packages both with Tauri
`bundle.externalBin`. Turbo orders those steps. The stage command downloads
build inputs, verifies their SHA-256 checksums, and fails closed if either
artifact is unavailable.
Generated archives, extracted runtimes, and staged binaries are gitignored.

`pnpm dev` prepares both pinned runtimes and launches Tauri with explicit
runtime paths. Production app bundles resolve their adjacent sidecars without
environment setup or `PATH` lookup. Users select Xray or sing-box in Settings;
the selection applies to the next connection.

After extracting or installing a bundle, run
`pnpm bundle:verify -- --bundle <application-directory>`. The verifier executes
only bundle-local engine paths with an empty `PATH` and requires both pinned
engines, geo assets, licenses, third-party notices, and configured platform
helpers such as Wintun.

The current desktop builds do not claim VPN support until their native tunnel
provider is installed and registered. Selecting VPN mode therefore fails closed
with an actionable platform diagnostic before either engine starts. Proxy mode
remains an explicit, unprivileged fallback.

## Connection mode

VPN/TUN is the persisted product default. The engine adapters generate and
validate dual-stack TUN configurations, but the desktop host will not launch
them until the target build supplies its production OS tunnel provider. That
provider must own consent, the virtual interface, routes, DNS, upstream-loop
prevention, and teardown. A missing provider fails before engine launch instead
of falling back silently.

System proxy remains an explicit fallback: RahRow activates it only after the
selected engine is ready and restores it during disconnect. Windows bundles
also include the official signed Wintun DLL from the pinned Xray archive, but
Windows VPN support remains unavailable until the authenticated native service
and installer are implemented. Linux likewise requires its packaged systemd
service, polkit action, and narrowly scoped TUN/route privileges.
Production macOS distribution requires a signed Network Extension packet-tunnel
provider; the app and provider need Apple's Network Extension entitlement.
RahRow does not use AppleScript administrator elevation as a substitute because
that does not register a VPN configuration in System Settings.

## Platform capabilities

The desktop capability layer lives in `src/lib/platform-capabilities.ts`.

- Clipboard uses the webview `navigator.clipboard` API.
- Share uses `navigator.share` when the host webview exposes it.
- Notifications use the webview `Notification` API when permission is granted.
- QR encode returns a text handoff payload for UI rendering. QR decode returns `unsupported_capability`.
- Tray, autostart, and system proxy are implemented in `src-tauri` on macOS, Windows, and Linux. The Vite web shell does not load that host, so those commands are unavailable there.
- Linux system proxy uses GNOME `gsettings`. If `gsettings` is missing, the command returns `unsupported_capability` with that diagnostic.
