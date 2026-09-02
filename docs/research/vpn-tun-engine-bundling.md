# Production VPN/TUN and engine bundling research

Research date: 2026-08-27

## Decision summary

RahRow should treat VPN/TUN and system proxy as different platform capabilities.
VPN/TUN is the default and must capture IP traffic through a real virtual network
interface. System proxy is an explicit fallback because it is generally an HTTP
proxy, is application-dependent, and does not cover UDP or ICMP. This distinction
is stated directly in the sing-box client manual: system proxy has incomplete TCP
coverage and leaks UDP and ICMP, while a virtual interface is the way an L4 proxy
acts as a VPN on Android and iOS ([sing-box client manual](https://sing-box.sagernet.org/manual/proxy/client/)).

The production implementation should be platform-specific at the native edge:

| Platform | OS tunnel ownership | Engine integration | Release contents |
| --- | --- | --- | --- |
| Android | `VpnService` creates the TUN and grants a file descriptor | Engine-specific service processes consume the OS-provided descriptor and protect engine sockets from the VPN | APK/AAB with both native engines for every supported ABI |
| iOS | `NEPacketTunnelProvider` creates and owns the packet tunnel | Engine-specific provider extensions isolate the native Go engines and consume the system interface | Signed app with embedded, signed packet-tunnel extensions and native frameworks |
| macOS | `NEPacketTunnelProvider`; use a system extension for direct Developer ID distribution | Engine-specific providers isolate the native engines; the Tauri process only manages `NETunnelProviderManager` | Signed/notarized `.app`/installer with separately signed system extensions and native frameworks |
| Windows | A real layer-3 adapter, using the engine's TUN support and Wintun | An installed, authenticated service owns the selected pinned sidecar, adapter, routes, and DNS | Installer containing both sidecars, service, and the official signed Wintun component required by the selected build |
| Linux | `/dev/net/tun`, routes, DNS, and policy rules | A narrowly privileged service owns the selected pinned sidecar and transactional network state | Architecture-specific package plus a systemd service and polkit authorization policy; package formats must preserve the privilege model |

Windows and Linux engines can remain isolated sidecar processes behind an installed
service. Apple engines cannot be ordinary executable sidecars: the OS VPN component
must host a native library and pass it the system tunnel. The safest Android and
Apple design is one provider/service process per engine, so independently built Go
runtimes, globals, crashes, and lifecycle state cannot collide. The containing app
exposes one engine-neutral API and selects exactly one provider. A combined Xray and
sing-box Go artifact is an optional later optimization only if one build invocation,
license review, repeated switching, lifecycle, and global-state tests prove it safe.

The current macOS `osascript`/`nohup` elevation experiment must be removed, not
repaired. It is useful only as a throwaway CLI diagnostic and is not a releasable
VPN architecture. The supported Apple path is a Network Extension configuration
and provider, which produces the system VPN authorization and visible VPN state
that users expect from a VPN client.

## What the engines provide

### sing-box

sing-box has a first-class `tun` inbound. Its client documentation describes the
data path as IP packets entering a TUN, being converted from L3 to L4 by the system,
gVisor, or mixed stack, then entering the sing-box router and a selected outbound
([client virtual-interface design](https://sing-box.sagernet.org/manual/proxy/client/),
[TUN configuration](https://sing-box.sagernet.org/configuration/inbound/tun/)). The
TUN configuration provides interface addresses, MTU, automatic routes, strict
routing, DNS handling, route exclusions, and platform-specific options. The
documented desktop TUN implementation is available on Linux, Windows, and macOS.

Important production settings and constraints are:

- `auto_route` installs the default route to the TUN. The engine must also use
  `route.auto_detect_interface`, `route.default_interface`, or an outbound-bound
  interface to prevent its own upstream traffic from looping back into the tunnel
  ([TUN `auto_route`](https://sing-box.sagernet.org/configuration/inbound/tun/#auto_route)).
- `strict_route` rejects traffic not handled by the tunnel. On Windows it also
  addresses multihomed DNS leakage, although the documentation warns that it can
  interfere with some applications
  ([TUN `strict_route`](https://sing-box.sagernet.org/configuration/inbound/tun/#strict_route)).
- On Linux, `auto_redirect` with `auto_route` is the recommended path; it uses
  nftables, improves performance, and avoids conflicts with Docker bridge networks
  ([TUN `auto_redirect`](https://sing-box.sagernet.org/configuration/inbound/tun/#auto_redirect)).
- The `system`, `gvisor`, and `mixed` stacks perform the L3-to-L4 conversion.
  gVisor availability depends on the `with_gvisor` build tag
  ([TUN stack](https://sing-box.sagernet.org/configuration/inbound/tun/#stack),
  [build tags](https://sing-box.sagernet.org/installation/build-from-source/#build-tags)).
- The Android and Apple graphical clients provide the platform-specific TUN
  implementation rather than expecting the command-line binary to create a mobile
  interface ([Android client](https://sing-box.sagernet.org/clients/android/),
  [Apple client](https://sing-box.sagernet.org/clients/apple/)). In libbox, the
  application implements `PlatformInterface.OpenTun`, and libbox duplicates and
  uses the returned file descriptor
  ([libbox platform contract](https://github.com/SagerNet/sing-box/blob/testing/experimental/libbox/platform.go),
  [libbox service adapter](https://github.com/SagerNet/sing-box/blob/testing/experimental/libbox/service.go)).

sing-box configuration is JSON with top-level DNS, inbound, outbound, route, and
service sections; `sing-box check` validates a configuration before launch
([configuration overview](https://sing-box.sagernet.org/configuration/)). RahRow
must generate and validate current-format configuration rather than expose raw JSON
as its domain model.

The protocol manuals confirm that protocol support is separate from tunnel
capture. A Shadowsocks client is an outbound; the current manual recommends AEAD
2022 over TCP with multiplexing, and warns that sending UDP without multiplexing is
passively detectable
([Shadowsocks manual](https://sing-box.sagernet.org/manual/proxy-protocol/shadowsocks/)).
Trojan is likewise configured as a TLS outbound with a server, port, password, TLS
server name, and optional multiplexing
([Trojan manual](https://sing-box.sagernet.org/manual/proxy-protocol/trojan/)). A
proxy server is primarily an inbound for its protocol; this is not part of the
client-side VPN registration path
([server manual](https://sing-box.sagernet.org/manual/proxy/server/)).

Build flags are part of the shipped capability matrix. QUIC/Hysteria, uTLS,
gVisor, WireGuard, and other features are conditional tags. Official guidance says
downstream packagers should use the repository's default tag lists and linker flags
unless they deliberately own a different feature set
([build-from-source guidance](https://sing-box.sagernet.org/installation/build-from-source/)).
RahRow therefore needs a pinned build manifest recording revision, Go toolchain,
tags, linker flags, target, checksum, and license materials for every artifact.

### Xray

Current Xray has a native TUN inbound. The official TUN documentation says Xray
can create a TUN directly on Windows, Linux, macOS, and FreeBSD. On Android and iOS
it cannot run standalone: the app must provide the descriptor from `VpnService` or
Network Extension through `XRAY_TUN_FD` / the `xray.tun.fd` config environment
setting ([Xray TUN configuration](https://github.com/XTLS/Xray-docs-next/blob/main/docs/en/config/inbounds/tun.md),
[Xray TUN implementation notes](https://github.com/XTLS/Xray-core/blob/main/proxy/tun/README.md)).

For desktop, the current TUN configuration can assign interface gateways, add
system routes with `autoSystemRoutingTable`, and bind Xray's own traffic away from
the TUN with `autoOutboundsInterface`. Without routes the interface captures
nothing; without outbound binding a default route can create an immediate loop
([Xray TUN fields and usage notes](https://github.com/XTLS/Xray-docs-next/blob/main/docs/en/config/inbounds/tun.md)).
On Windows, Xray's implementation uses Wintun and requires the architecture-correct
`wintun.dll` beside `xray.exe`. On macOS it creates a `utun` and can add/remove
routes, but its `dns` TUN field does not set macOS system DNS
([Xray platform TUN notes](https://github.com/XTLS/Xray-core/blob/main/proxy/tun/README.md)).

Xray's ordinary configuration remains an inbound/outbound/routing model. The
official configuration index identifies built-in DNS, inbound arrays, outbound
arrays, and routing rules, while the command-line documentation provides `xray run
-test` for validating a config without launching it
([configuration index](https://xtls.github.io/en/config/),
[command line](https://xtls.github.io/en/document/command)). Xray remains valuable
as an independent engine because it explicitly provides VLESS, XTLS Vision, and
REALITY ([Project X overview](https://xtls.github.io/en/)).

For mobile and in-process native use, the XTLS project publishes libXray. It builds
an Android AAR and Apple XCFramework and exposes validation and engine lifecycle
through a small JSON API. Runtime TUN descriptors are placed in the Xray config's
root `env` object before `runXray`
([libXray integration documentation](https://github.com/XTLS/libXray)). This is a
better starting point than launching an Android executable from app-private storage
or inventing a Swift/Kotlin process wrapper.

### Protocol and profile implications

Tunnel capture and proxy protocols are separate axes. TUN decides which device
packets enter RahRow; the selected outbound decides how those packets reach the
server. “V2Ray” is an ecosystem/configuration family, not one wire protocol. RahRow
must model concrete outbounds, transports, security, and import formats separately.

| Requested capability | Engine-backed production path | Release implication |
| --- | --- | --- |
| Shadowsocks | Both engines; sing-box documents AEAD 2022 plus `aes-128-gcm`, `aes-192-gcm`, `aes-256-gcm`, `chacha20-ietf-poly1305`, and `xchacha20-ietf-poly1305` | Normalize spelling at import; do not silently downgrade an unsupported cipher. Legacy stream ciphers may be import-only with an explicit warning ([sing-box Shadowsocks](https://sing-box.sagernet.org/configuration/outbound/shadowsocks/)). |
| VMess, VLESS, Trojan | Both engines | One canonical RahRow profile with engine-specific compilation and cross-engine capability validation ([sing-box outbounds](https://sing-box.sagernet.org/configuration/outbound/), [Xray outbounds](https://xtls.github.io/en/config/outbounds/)). |
| REALITY and VLESS Vision | Xray is the reference implementation; current sing-box also exposes Reality/uTLS fields | Preserve engine-specific semantics. Do not promise that switching engines is lossless; disable switching when the destination engine cannot represent the profile ([Xray transport security](https://xtls.github.io/en/config/transport.html), [sing-box TLS](https://sing-box.sagernet.org/configuration/shared/tls/)). |
| Hysteria/Hysteria2 | sing-box has distinct Hysteria and Hysteria2 outbounds; current Xray's Hysteria outbound requires version 2 | Capability-gate by pinned engine version and build tags; QUIC support is included in sing-box's official default tags ([sing-box outbounds](https://sing-box.sagernet.org/configuration/outbound/), [Xray Hysteria](https://xtls.github.io/en/config/outbounds/hysteria.html), [sing-box build tags](https://sing-box.sagernet.org/installation/build-from-source/)). |
| SSH | sing-box has a native SSH outbound | Prefer sing-box; treat host-key verification as mandatory product UI/state rather than accepting every host key by default ([sing-box SSH](https://sing-box.sagernet.org/configuration/outbound/ssh/)). |
| uTLS | sing-box conditional build capability; Xray has its own TLS fingerprinting behavior | Record the build tag in the artifact manifest and test fingerprints per engine. “uTLS supported” cannot be inferred merely from accepting a JSON field ([sing-box TLS](https://sing-box.sagernet.org/configuration/shared/tls/), [sing-box build tags](https://sing-box.sagernet.org/installation/build-from-source/)). |
| V2Ray/Xray subscription links | RahRow importer, not a tunnel engine | Parse into a versioned canonical profile, retain unsupported-field diagnostics, and test every URI/schema variant. Never send subscriptions to a remote conversion service. |
| Raw V2Ray/Xray JSON | Xray-only advanced profile | Store as an explicitly engine-bound profile, validate with the exact bundled Xray version, redact secrets from logs, and block engine switching unless conversion is proven lossless. |
| Ping Tunnel | Neither engine documents it as an outbound | A separate, pinned ICMP transport/plugin is required. It needs its own privilege, server, license, packaging, health, and threat-model work; it is not delivered by merely adding TUN. ptunnel-ng, for example, tunnels TCP over ICMP and normally requires privilege ([ptunnel-ng project](https://github.com/utoni/ptunnel-ng)). |
| DNSTT | Neither engine documents it as an outbound | Treat it as a separate local transport feeding a proxy endpoint. The reference project is a userspace TCP-over-DNS tunnel and explicitly does not provide TUN, SOCKS, or HTTP by itself ([dnstt project](https://www.bamsoftware.com/software/dnstt/), [dnstt source mirror](https://github.com/tladesignz/dnstt)). |

Engine switching must be a controlled reconnect, never an in-place mutation of a
live tunnel: validate the target-engine config first, stop the current provider or
service and wait for route/DNS cleanup, then start the new engine against a newly
established tunnel. Profiles must declare `supportedEngines` and explain exactly
which field prevents a switch. “Auto” may choose a compatible engine, but it must
not weaken security or drop fields to make a profile fit.

## What the operating systems require

### Android

`VpnService.prepare()` is the OS consent boundary. Android requires user action the
first time, permits only one prepared/active VPN, shows a system-managed notification
and VPN dialog, and restores networking when the tunnel descriptor is closed. The
service must require `android.permission.BIND_VPN_SERVICE`, publish the
`android.net.VpnService` intent action, and promote itself to a foreground service
on modern Android ([Android `VpnService`](https://developer.android.com/reference/android/net/VpnService)).

`VpnService.Builder.establish()` returns the packet file descriptor: reading yields
outgoing IP packets and writing injects incoming IP packets. RahRow must pass that
descriptor to the selected native engine and close it on stop
([Android `VpnService.Builder`](https://developer.android.com/reference/android/net/VpnService.Builder)).
The engine's upstream sockets must call `VpnService.protect(fd)` or they will be
routed back into the VPN and loop. Xray's libXray has an Android controller and DNS
resolver specifically for protected sockets
([Android socket protection](https://developer.android.com/reference/android/net/VpnService#protect(int)),
[libXray Android integration](https://github.com/XTLS/libXray#controller)).

An Android implementation that only creates a descriptor but does not continuously
hand packets to an engine is a VPN-shaped skeleton, not a functioning VPN.

For dual-engine isolation, declare Xray- and sing-box-backed `VpnService`
components in separate Android processes. The app still has one VPN consent grant,
and Android still permits only one active VPN interface. Switching must close the
current descriptor and stop its service process before the replacement calls
`establish()`. This design follows the same one-Go-runtime-per-process boundary as
Apple providers while retaining Android's native consent, foreground-service,
revocation, and always-on lifecycle.

### iOS and macOS

Apple's supported custom VPN facility is a packet-tunnel provider. A subclass of
`NEPacketTunnelProvider` receives a virtual network interface through `packetFlow`,
sets IP routes, DNS, proxy, and MTU with `setTunnelNetworkSettings`, and reads and
injects packets through that flow. The provider must be an extension with the
`com.apple.networkextension.packet-tunnel` extension point and must be embedded in
the containing app
([`NEPacketTunnelProvider`](https://developer.apple.com/documentation/networkextension/nepackettunnelprovider)).

Both the app and provider require the Network Extension entitlement. App Store and
development builds use `packet-tunnel-provider`; a macOS provider directly
distributed with Developer ID uses the `packet-tunnel-provider-systemextension`
value and a provisioning profile
([Network Extension entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.networking.networkextension)).
Apple's deployment matrix says iOS packet tunnels are app extensions. macOS app
extensions are App-Store-only, while a system extension is supported for direct
distribution on macOS 10.15 and later
([TN3134](https://developer.apple.com/documentation/technotes/tn3134-network-extension-provider-deployment)).

Consequently, a Tauri process or bundled command-line sidecar cannot by itself make
RahRow appear as an Apple VPN. The Tauri shell must manage a
`NETunnelProviderManager` configuration, while the signed provider process owns the
tunnel and engine. The distributable remains one `.app`/installer even though it
contains a separately signed extension and native framework.

#### Why `osascript` elevation is the wrong macOS product architecture

The current failure, `nohup: can't detach from console: Inappropriate ioctl for
device`, is a defect in the experimental detached-shell launch. Fixing that launch
would still leave the wrong trust and lifecycle model:

- Apple documents `do shell script ... with administrator privileges` as executing
  shell text as an administrator. Its authorization grace period applies only to
  that script; it is not VPN authorization, does not create a Network Extension
  preference, and does not make the connection visible to the OS as a managed VPN
  ([AppleScript command reference](https://developer.apple.com/library/archive/documentation/AppleScript/Conceptual/AppleScriptLangGuide/reference/ASLR_cmds.html)).
- The expected VPN setup dialog and persisted configuration come from saving and
  enabling a `NETunnelProviderManager` configuration. That manager controls a custom
  protocol whose client runs in the packet-tunnel provider
  ([`NETunnelProviderManager`](https://developer.apple.com/documentation/networkextension/netunnelprovidermanager)).
- Elevating an arbitrary generated command grants the whole engine and shell a root
  execution context. Apple says a privileged helper must treat the calling app as
  untrusted, expose only narrow decisions, and avoid being a puppet that executes
  whatever the app asks
  ([Designing Secure Helpers and Daemons](https://developer.apple.com/library/archive/documentation/Security/Conceptual/SecureCodingGuide/DesigningSecureHelpers/DesigningSecureHelpers.html)).
- If RahRow ever needs privileged macOS work unrelated to Network Extension, the
  supported general mechanism is a registered, bundled helper managed by Service
  Management, with launch-daemon approval in System Settings—not a fresh AppleScript
  shell for every connection
  ([Service Management](https://developer.apple.com/documentation/ServiceManagement),
  [`SMAppService.register`](https://developer.apple.com/documentation/servicemanagement/smappservice/register%28%29)).

The Apple implementation boundary should therefore be:

1. A small signed Swift bridge in the containing app loads or creates one RahRow
   `NETunnelProviderManager` record, sets a `NETunnelProviderProtocol` whose
   `providerBundleIdentifier` identifies the bundled provider, saves it to Network
   Extension preferences, and starts/stops the `NETunnelProviderSession`. Saving the
   manager is the OS configuration/consent boundary; starting the connection then
   launches the selected provider
   ([`saveToPreferences`](https://developer.apple.com/documentation/networkextension/nevpnmanager/savetopreferences%28completionhandler%3A%29),
   [`startVPNTunnel`](https://developer.apple.com/documentation/networkextension/nevpnconnection/startvpntunnel%28%29),
   [`providerBundleIdentifier`](https://developer.apple.com/documentation/networkextension/netunnelproviderprotocol/providerbundleidentifier)).
2. A signed `NEPacketTunnelProvider` calls `setTunnelNetworkSettings`, owns
   `packetFlow`, handles sleep/wake and network changes, and reports status through
   Network Extension APIs. `includeAllNetworks` is enabled when RahRow claims a
   full-tunnel/kill-switch posture, subject to Apple's documented system-traffic
   exceptions
   ([routing VPN traffic](https://developer.apple.com/documentation/networkextension/routing-your-vpn-network-traffic)).
3. The selected engine runs inside its engine-specific provider from one Go native
   artifact per process.
   libbox receives the OS tunnel through its `PlatformInterface.OpenTun` contract;
   Xray receives the provider's TUN descriptor through `XRAY_TUN_FD`
   ([libbox platform contract](https://github.com/SagerNet/sing-box/blob/testing/experimental/libbox/platform.go),
   [Xray TUN integration](https://github.com/XTLS/Xray-core/blob/main/proxy/tun/README.md)).
4. Provider and containing app are signed with matching App Groups/keychain groups
   where needed. App Store builds use an app extension; direct Developer ID macOS
   builds use a packet-tunnel system extension, per Apple's deployment matrix
   ([TN3134](https://developer.apple.com/documentation/technotes/tn3134-network-extension-provider-deployment),
   [Network Extension entitlement](https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.developer.networking.networkextension)).

Until those targets, entitlements, profiles, native artifacts, and lifecycle tests
exist, macOS and iOS VPN mode must report `unavailable` and offer proxy mode only as
an explicit user choice. It must not silently run an elevated CLI and label the
result an OS VPN.

TunnelVision also affects the secure default. sing-box documents that DHCP option
121 can install higher-priority routes than a VPN. On Apple platforms it recommends
`includeAllNetworks`; that selection forces the gVisor stack rather than system or
mixed stacks. Its Linux auto-route rules are documented as unaffected, Android does
not process option 121, and the cited sing-box page states there is no Windows
solution there yet
([TunnelVision status](https://sing-box.sagernet.org/manual/misc/tunnelvision/)).
RahRow should expose this as a platform security capability and test for leaks; it
must not claim a kill switch on Windows solely because `strict_route` is set.

### Windows

Wintun is an official WireGuard project providing a layer-3 Windows adapter for
userspace packet processing. Its supported distribution model is the official,
signed, architecture-specific `wintun.dll` placed beside the application; its API
creates an adapter, starts a session, and sends/receives IP packets
([Wintun integration and API](https://git.zx2c4.com/wintun/about/)). The official
site explicitly permits redistribution of its signed prebuilt binaries under the
license included in the download and warns that those are the supported binaries
to distribute ([Wintun download](https://www.wintun.net/)).

RahRow should not implement a third TUN data plane. Package the component already
required by the selected engine, run the chosen engine with full IPv4/IPv6 routes,
strict DNS routing, and outbound-interface exclusion, and use a privileged installer
for any driver/setup operation that Windows requires. Adapter creation, route
ownership, graceful shutdown, crash recovery, and upgrade cleanup require real
Windows integration tests.

Wintun's own adapter-creation code elevates to the SYSTEM security context before
creating or deleting an adapter
([Wintun `WintunCreateAdapter`](https://git.zx2c4.com/wintun/tree/api/adapter.c?h=0.14.1)).
The production inference is that RahRow's ordinary desktop UI must not own this
privilege. A signed per-machine installer should register an authenticated Windows
service. That service accepts only a narrow typed contract (selected bundled engine,
validated configuration identifier, start/stop/status), validates the caller and
artifact paths, owns the child process and adapter cleanup, and never accepts shell
text or an arbitrary executable path. Microsoft's service guidance says to grant the
service account the minimum permissions its operations require
([service logon account guidance](https://learn.microsoft.com/en-us/windows/win32/ad/guidelines-for-selecting-a-service-logon-account)).
WireGuard for Windows provides a useful first-party reference design: its UI talks
to a manager/tunnel service, the tunnel service owns Wintun, and it drops privileges
it no longer needs
([WireGuard for Windows attack surface](https://git.zx2c4.com/wireguard-windows/tree/attacksurface.md)).

The Windows UWP VPN plug-in platform is another official route for third-party VPN
protocols, but it is an app-container plug-in model
([Microsoft VPN connection types](https://learn.microsoft.com/en-us/windows/security/operating-system-security/network-security/vpn/vpn-connection-type)).
It does not replace Wintun for the existing Tauri/sidecar architecture without a
separate Windows-native product integration.

### Linux

Linux TUN is `/dev/net/tun`. A userspace process opens it and uses `TUNSETIFF` to
create an interface; reads/writes exchange IP packets for TUN or Ethernet frames for
TAP. Closing the file descriptor removes a non-persistent interface and its routes.
Creating or attaching interfaces requires `CAP_NET_ADMIN` unless ownership has been
preconfigured ([Linux kernel TUN/TAP documentation](https://docs.kernel.org/networking/tuntap.html)).

RahRow therefore needs an installed, narrowly privileged native component on Linux.
Do not run the whole UI as root. The helper should own only interface/routing/DNS
operations or launch the pinned engine with the minimum capabilities, authenticate
the unprivileged caller, accept a small typed request, and always restore state.
Use a packaged systemd unit to bound the service capabilities and filesystem access,
and a named polkit action for desktop authorization. polkit's documented model is a
privileged mechanism receiving requests from an untrusted subject and asking the
system authorization authority to approve or reject each action; this is a better
boundary than invoking `sudo` or `pkexec` with generated shell text
([polkit architecture](https://polkit.pages.freedesktop.org/polkit/polkit.8.html),
[`systemd.exec` capability controls](https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html#Capabilities)).
`.deb`, `.rpm`, and other package-specific installers need explicit post-install,
upgrade, and uninstall handling. AppImage/portable packaging cannot be called
production VPN support unless its privilege bootstrap is also solved.

## Bundling and process architecture

### Windows and Linux desktop

Bundle both pinned engine executables as sidecars. Only the selected engine starts,
and only one engine owns a connection. Each sidecar gets engine-specific generated
configuration containing a real TUN inbound for VPN mode or a local mixed/SOCKS/HTTP
inbound for explicit proxy mode. The app must validate config before changing OS
network state, start the engine, confirm readiness, then expose `connected`. Stop
must be graceful, followed by deterministic route, DNS, adapter, and proxy cleanup.

Use per-target release manifests, not `PATH` lookup or first-run executable
downloads. Each manifest must pin version/revision, source URL, build options,
architectures, SHA-256, license, and expected runtime dependencies. Release CI must
build or fetch into the package, verify checksums, inspect the final artifact, and
run a smoke test from the installed layout.

This sidecar model does not apply to Apple VPN mode. macOS uses the signed provider
architecture above. The containing `.app` still bundles the provider and engine
framework, so it remains a single user-facing application artifact even though code
signing and runtime isolation create multiple nested executables.

### Mobile and Apple desktop provider

The engine runs inside the native VPN process. Independently built Go mobile
libraries must not simply be linked side by side. libXray explicitly warns that
every cgo/gomobile artifact embeds a Go runtime and that loading multiple
independently built Go runtimes in one process can fail to link/load or crash; if
several Go packages are required, they must be compiled in one Go build, or run in
separate OS processes ([libXray build warning](https://github.com/XTLS/libXray#build)).
libbox is itself produced with `gomobile bind`
([official libbox build source](https://github.com/SagerNet/sing-box/blob/testing/cmd/internal/build_libbox/main.go)).
It therefore follows that separately produced `libbox.aar` plus `libXray.aar`, or
separate XCFrameworks, are not a safe dual-engine design in one provider process.

Recommended order:

1. Build engine-specific provider artifacts: a libXray-backed provider and a
   libbox-backed provider. Give both the same narrow host contract: `validate`,
   `start(config, tunHandle)`, `stop`, `status`, diagnostics, and protected-dialer
   hooks where the platform requires them.
2. On Apple, package engine-specific Packet Tunnel targets and select the target via
   `NETunnelProviderProtocol.providerBundleIdentifier`. On Android, declare
   engine-specific `VpnService` components in separate processes. Only one provider
   may own the OS tunnel at a time.
3. Prove Android ABIs and Apple device/simulator builds, repeated engine switching,
   process suspension, memory pressure, descriptor ownership, permission revocation,
   and complete teardown before replacement.
4. Consider a combined Go build only if separate providers cannot meet a verified
   platform or distribution requirement. Never load two independently built Go
   runtimes into one process.
5. Package every framework/AAR and its symbols, notices, checksums, and corresponding
   source metadata inside the release pipeline; do not download executable code on
   first launch.

## Licensing and distribution gates

This section is an engineering risk inventory, not legal advice.

- sing-box is distributed under GPL-3.0-or-later and its repository license also
  contains an additional restriction on derivative works using its name or implying
  association ([sing-box repository and license](https://github.com/SagerNet/sing-box)).
  Static libbox integration makes GPL compliance a release-design concern, including
  complete corresponding source, notices, reproducible build inputs, and store terms.
  Obtain qualified review before Apple App Store or Google Play publication.
- Xray-core is MPL-2.0
  ([Xray-core repository](https://github.com/XTLS/Xray-core),
  [Project X license](https://xtls.github.io/en/)). libXray's wrapper is MIT, but
  using it does not remove Xray-core's MPL obligations
  ([libXray repository](https://github.com/XTLS/libXray)).
- Wintun source is GPL-2.0, while the official signed prebuilt download has a
  separate permissive redistribution license in its archive. Ship the unmodified
  official binary, its included license, and its verified checksum; do not rename or
  redistribute an unofficial driver build
  ([Wintun licensing and distribution](https://git.zx2c4.com/wintun/about/)).
- Every release needs `THIRD_PARTY_NOTICES`, an SBOM, exact source pins, build scripts,
  checksums, and corresponding-source publication appropriate to each license.

License compliance is a hard release gate. If RahRow's chosen application license
or store channel cannot satisfy the selected engine's terms, the engineering team
must change the distribution model or engine integration before claiming a
production release.

## Release-blocking work register

RahRow must not describe itself, any platform, engine, or protocol as production
ready until the corresponding block below is closed with installed-artifact tests.
These are independently trackable release blockers, not optional polish:

1. **Engine-neutral contract:** versioned canonical profiles, capability discovery,
   exact engine pins/build flags/checksums, deterministic validation, exclusive
   ownership, switch-as-reconnect, structured errors, crash recovery, and secret
   redaction.
2. **Apple VPN provider:** Xcode/Tauri project integration; iOS packet-tunnel app
   extension; macOS packet-tunnel system extension for Developer ID distribution
   (and app-extension variant if App Store distribution is retained); app/provider
   entitlements, App Groups, provisioning, signing, notarization, manager/session
   bridge, engine-specific providers/frameworks, device tests, and deletion of the
   AppleScript elevation path.
3. **Android VPN provider:** production foreground `VpnService`, manifest/service
   permission, consent/revocation flow, OS-provided TUN descriptor ownership,
   protected upstream sockets/DNS, per-ABI native engines in separate service
   processes, always-on behavior, network handoff, process-death cleanup, and
   Play-ready packaging tests.
4. **Windows service:** signed installer, bundled official Wintun per architecture,
   authenticated least-privilege service IPC, selected-engine child supervision,
   route/DNS transaction and rollback, upgrade/uninstall cleanup, UAC/install tests,
   and installed-layout smoke/leak tests.
5. **Linux service:** packaged systemd service and polkit action, authenticated IPC,
   minimal capability bounding, NetworkManager/systemd-resolved integration where
   present, nftables/ip-route transaction and rollback, distro package lifecycle,
   and installed-layout tests. Portable/AppImage support remains unavailable until
   it has an honest privilege bootstrap.
6. **Core protocol profiles:** complete create/edit/import/export and conformance
   fixtures for Shadowsocks (including every advertised AEAD), VMess, VLESS,
   Trojan, REALITY, Vision, Hysteria/Hysteria2, SSH, and uTLS. Each profile declares
   engine/version compatibility and tests TCP, UDP, IPv4, IPv6, DNS, and reconnect.
7. **Import surfaces:** local-only subscription fetch/parser with authentication and
   TLS policy, `vmess://`/`vless://`/`trojan://`/`ss://` fixtures, Xray subscription
   formats, engine-bound raw Xray JSON validation, unsupported-field diagnostics,
   update rollback, and secure credential storage.
8. **External transports:** separate feasibility, threat model, licensing, server
   compatibility, mobile integration, privilege, package, and end-to-end tasks for
   Ping Tunnel and DNSTT. Neither is covered by bundling Xray or sing-box.
9. **Distribution compliance:** qualified GPL/MPL/Wintun review, final license and
   store-channel decision, corresponding-source process, third-party notices, SBOM,
   reproducible manifests, symbols, code signing, notarization, and release artifact
   inspection for every OS/architecture.
10. **Security and reliability gates:** DNS/IPv6 leak tests, TunnelVision posture,
    kill-switch truthfulness, captive portal behavior, sleep/wake, Wi-Fi/cellular
    handoff, engine/provider/UI crashes, reboot, concurrent-connect exclusion,
    uninstall cleanup, and telemetry/privacy review on physical devices or real VMs.

## Required production tests

The feature is not complete when an interface merely exists. Release gates should
include, on physical devices or real VMs for every target architecture:

- First-connect OS consent and visible OS VPN/adapter state.
- IPv4 and IPv6 TCP and UDP traversal through each engine.
- DNS resolution through the tunnel with leak tests before, during, and after
  connection.
- Engine upstream exclusion/protection so default routing cannot recurse.
- Disconnect, app crash, engine crash, device sleep/wake, network handoff, and
  reboot cleanup.
- Switching Xray to sing-box and back only after the current owner is fully stopped.
- Revoked Android permission, revoked/invalid Apple entitlement or profile, failed
  Windows driver activation, and missing Linux capability all fail closed.
- Proxy fallback is selected explicitly, restores the exact prior OS proxy state,
  and is never reported as VPN.
- Installed-artifact inspection proves both engines and all required native
  components are present with the expected checksums and no `PATH`/network fetch is
  used.
- TunnelVision/DHCP route-conflict tests where the platform provides a mitigation;
  unsupported guarantees are stated truthfully in diagnostics and release notes.

## RahRow implementation recommendation

1. Keep one engine-neutral connection orchestrator, but give each platform a real
   `VpnTunnelProvider`. A successful engine process is not sufficient for a
   successful VPN connection.
2. Generate distinct current-version engine configurations; remove persisted-data
   migration and compatibility branches rather than carrying old settings or old
   config fields forward.
3. Implement Windows and Linux TUN with both sidecars behind their installed native
   services. Do not add a generic “desktop elevation” abstraction: their privilege,
   route, DNS, IPC, installer, and cleanup models are platform-specific.
4. Replace the Android descriptor-only skeleton with engine-specific foreground
   `VpnService` processes, protected sockets, and packaged native libraries.
5. Add iOS and macOS packet-tunnel targets, entitlements, provisioning, signing,
   engine-specific provider frameworks, and manager bridge; remove the macOS
   AppleScript launcher.
   Treat unsigned local development builds as incapable of production VPN rather
   than silently using proxy mode.
6. Make release packaging a matrix over OS, architecture, engine, native component,
   checksum, and entitlement. A platform is supported only after its installed
   artifact passes the production tests above.

## User-provided documentation reviewed

- [sing-box TunnelVision](https://sing-box.sagernet.org/manual/misc/tunnelvision/)
- [sing-box proxy server](https://sing-box.sagernet.org/manual/proxy/server/)
- [sing-box proxy client, including system proxy and virtual interface](https://sing-box.sagernet.org/manual/proxy/client/#system-proxy)
- [sing-box Shadowsocks](https://sing-box.sagernet.org/manual/proxy-protocol/shadowsocks/)
- [sing-box Trojan](https://sing-box.sagernet.org/manual/proxy-protocol/trojan/)
- [sing-box configuration](https://sing-box.sagernet.org/configuration/)
- [Project X overview](https://xtls.github.io/en/)
- [Xray configuration index](https://xtls.github.io/en/config/)
