# HEV SOCKS5 tunnel as RahRow's default TUN adapter

Research date: 2026-09-02

> Pin update: implementation uses upstream `2.17.1` at
> `9a06bc6e7989da54e3d32ff701ef7a7ce4995d3a`, the newest verified tag available
> during implementation. The compatibility analysis below was performed against
> 2.17.0; 2.17.1 must pass the same native acceptance gates before shipping.

## Recommendation

RahRow should integrate `hev-socks5-tunnel` as a **TUN adapter**, not present it as
a protocol engine. HEV accepts IP packets from a TUN interface and forwards their
TCP and UDP flows to a SOCKS5 server. It does not implement VLESS, VMess, Trojan,
Shadowsocks, Hysteria, REALITY, or other RahRow profile protocols itself. Xray or
sing-box must continue to compile the selected profile and expose a loopback SOCKS5
inbound; HEV then supplies VPN-mode packet capture in front of that inbound
([upstream README](https://github.com/heiher/hev-socks5-tunnel/blob/main/README.md)).

The product default should therefore be expressed as
`tunBackend = "hev-socks5-tunnel"`, not `engine = "hev-socks5-tunnel"`:

- use HEV by default for VPN mode on Android and Linux after the native artifacts,
  socket-loop prevention, transactional route/DNS ownership, and lifecycle tests
  described below are complete;
- enable it on Windows after its Wintun packaging, service privilege, route and DNS
  rollback path passes native integration tests;
- keep it experimental on iOS and macOS until RahRow has a signed Network Extension
  provider and validates the upstream Apple integration technique through review and
  device testing;
- do not use it in proxy mode, because no TUN-to-SOCKS conversion is needed there;
- do not select it when the chosen engine cannot expose a compatible SOCKS5 endpoint
  with the traffic families the profile and connection require.

It is not responsible to make HEV the unconditional default merely because upstream
lists all six operating systems. Platform support means the C project can be built
there; it does not supply RahRow's OS VPN consent, route and DNS transaction,
upstream-loop exclusion, signed extension/service, installer, or recovery behavior.

The version evaluated here is upstream release **2.17.0**, commit `d1178b5`, released
2026-08-05. That release changed the Android `Start` and `Stop` methods to return
success booleans, added `IsRunning`, improved startup/shutdown synchronization, and
fixed memory and out-of-bounds defects. RahRow should pin the full commit and source
archive checksum rather than track `main` or `latest`
([2.17.0 release](https://github.com/heiher/hev-socks5-tunnel/releases/tag/2.17.0)).

## What HEV provides

Upstream describes dual-stack IPv4/IPv6, TCP forwarding, UDP forwarding using
full-cone NAT with standard UDP or UDP-over-TCP modes, optional local ICMP echo
replies, and Linux, Android, FreeBSD, macOS, iOS and Windows support. Its documented
configuration contains the TUN name, MTU and addresses; SOCKS5 address, port,
credentials, UDP mode, socket mark and TCP Fast Open; optional mapped DNS; resource
limits; timeouts; logs; and lifecycle scripts
([features and configuration](https://github.com/heiher/hev-socks5-tunnel/blob/main/README.md#features),
[configuration source](https://github.com/heiher/hev-socks5-tunnel/blob/main/src/hev-config.c)).

For RahRow, the safe initial configuration is a generated in-memory YAML document
pointing only to the selected engine's loopback SOCKS5 listener. Use standard SOCKS5
UDP (`udp: udp`) only when that local inbound supports UDP association. HEV's
UDP-over-TCP mode is an extension that requires a compatible server and must not be
silently enabled for an ordinary Xray or sing-box SOCKS inbound. Keep local ICMP
reply off unless the UI explicitly describes that pings are answered locally rather
than by the destination.

The public C interface offers blocking start from a file or string, a global quit
operation, and global packet/byte statistics. When given a nonnegative TUN file
descriptor, HEV switches it to nonblocking mode and uses it without closing it;
otherwise it creates and configures a platform TUN itself. The host therefore owns
and closes an Android or Apple-provided descriptor after HEV has stopped
([C API](https://github.com/heiher/hev-socks5-tunnel/blob/main/src/hev-main.h),
[external-descriptor handling](https://github.com/heiher/hev-socks5-tunnel/blob/main/src/hev-socks5-tunnel.c#L2332-L2471)).

The implementation and configuration are process-global rather than instance based.
There is no session handle passed to `quit` or `stats`, and the Android JNI binding
enforces one worker with static state. RahRow must run at most one HEV session per
process, serialize start/stop, wait for stop completion before replacing its config,
and isolate it from another native engine runtime when a platform process boundary
is available
([C lifecycle](https://github.com/heiher/hev-socks5-tunnel/blob/main/src/hev-main.c),
[Android JNI lifecycle](https://github.com/heiher/hev-socks5-tunnel/blob/main/src/hev-jni.c)).

`Start` or a running worker is not proof that the entire VPN is usable. RahRow must
also verify the local SOCKS listener before HEV starts, confirm the native VPN route
is active, and perform a routed egress probe afterward. A zero or failed start must
close the pending TUN and restore every route, DNS and proxy mutation. Configuration,
profile, engine or mode changes require an orderly HEV stop and a newly initialized
session; HEV exposes no live reconfiguration API.

## Build and artifact model

The upstream build supports a standalone executable, static library and shared
library. Android uses NDK `ndk-build`; Apple uses `build-apple.sh` to create a static
`HevSocks5Tunnel.xcframework`; Windows uses MSYS2
([build instructions](https://github.com/heiher/hev-socks5-tunnel/blob/main/README.md#how-to-build),
[Makefile](https://github.com/heiher/hev-socks5-tunnel/blob/main/Makefile),
[Android build](https://github.com/heiher/hev-socks5-tunnel/blob/main/Android.mk),
[Apple build script](https://github.com/heiher/hev-socks5-tunnel/blob/main/build-apple.sh)).

The current CI matrix builds:

- Android `armeabi-v7a`, `arm64-v8a`, `x86` and `x86_64`, with Android platform 29,
  Clang, release optimization and flexible/16 KiB page-size support;
- iOS device `arm64` and simulator `arm64`/`x86_64`, with iOS 15 as the deployment
  target in the Apple build script;
- macOS `arm64` and `x86_64` in the XCFramework (minimum 10.14), while standalone
  release binaries use minimum 11.0 for arm64 and 10.6 for x86_64;
- a 64-bit Windows MSYS2 package with HEV, `wintun.dll` and `msys-2.0.dll`;
- Linux musl executables for 27 architecture variants, including arm, x86,
  LoongArch, MIPS, PowerPC, RISC-V, s390x, SuperH, m68k, MicroBlaze and OpenRISC.

These are build claims, not RahRow's supported-device matrix. RahRow should ship only
architectures exercised by its own CI and installers. In particular, the upstream
release workflow attaches Android **executables**, desktop executables and the
Windows ZIP, but its Apple XCFramework job does not run for release publication and
the workflow does not publish Android shared libraries. Mobile integration therefore
requires RahRow to build pinned source itself, or consume a separately audited and
checksummed wrapper artifact; downloading the release executables is insufficient
([upstream build workflow](https://github.com/heiher/hev-socks5-tunnel/blob/main/.github/workflows/build.yaml),
[Android application targets](https://github.com/heiher/hev-socks5-tunnel/blob/main/Application.mk)).

Every RahRow artifact record should pin the HEV commit and source SHA-256, all four
submodule commits (`hev-task-system`, YAML, lwIP and `hev-socks5-core`), NDK/Xcode/
compiler versions, target, flags and final binary hash. Build from the source archive
with its submodule contents, not GitHub's automatically generated archive, unless the
missing submodules are independently pinned and fetched
([upstream submodules](https://github.com/heiher/hev-socks5-tunnel/blob/main/.gitmodules)).

## Platform compatibility

| Platform | Technical integration | Required OS ownership and permissions | Default readiness |
| --- | --- | --- | --- |
| Android | Build `libhev-socks5-tunnel.so` for RahRow ABIs, load through a RahRow-owned JNI class, and pass the descriptor returned by `VpnService.Builder.establish()` | VPN consent, declared `BIND_VPN_SERVICE`, foreground service, descriptor lifecycle, and protection/binding of the local protocol engine's upstream sockets so they cannot re-enter the VPN | **Yes after native tests**; API 29+ with the unmodified upstream build |
| iOS | Link the pinned static XCFramework inside a packet-tunnel extension and run one HEV instance against the extension's TUN | Network Extension entitlement, embedded signed provider, network settings, route/DNS policy, memory limits and a validated way to obtain the utun descriptor | **Experimental**, not a default yet |
| macOS | Prefer the same signed packet-tunnel provider model; a privileged standalone binary can create a utun but is not RahRow's production app architecture | Network Extension entitlement and signed extension for the product path; standalone mode additionally needs privilege and transactional routes/DNS | **Experimental** until the extension ships |
| Linux | Run the pinned executable behind RahRow's narrow privileged service, or pass a service-owned TUN descriptor to a linked library | `/dev/net/tun`, `CAP_NET_ADMIN`, route/rule/DNS ownership, reverse-path-filter handling, upstream bypass, crash recovery | **Yes after service integration tests** |
| Windows | Run the pinned win64 bundle behind RahRow's service; HEV creates the Wintun adapter and RahRow applies/restores routes and DNS | Elevated service, signed/approved Wintun distribution, architecture-correct DLL/runtime, upstream bypass and transactional cleanup | **Conditional** until installer and rollback tests pass |
| CLI | On Linux/macOS/Windows, supervise the same desktop sidecar only when invoked through the platform privilege/service boundary | Same TUN, route, DNS and upstream-bypass requirements as the host OS; a terminal process alone is not automatically authorized | **Opt-in**, never silently elevate |

### Android

Android's `VpnService` creates a virtual interface and returns a file descriptor;
reads deliver outgoing IP packets and writes inject incoming packets. The system
requires initial user consent, permits only one active VPN, restores networking when
the descriptor closes, and requires modern VPN services to promote themselves to
the foreground. Its `protect` API is specifically required when a tunnel's own
upstream traffic would otherwise loop back into the VPN
([Android `VpnService`](https://developer.android.com/reference/android/net/VpnService),
[`VpnService.Builder`](https://developer.android.com/reference/android/net/VpnService.Builder)).

HEV is a good fit for this descriptor model. However, HEV opens sockets to the local
SOCKS listener; the Xray/sing-box process opens the real remote sockets. RahRow must
protect or bind the **protocol engine's** upstream sockets/network, not merely the
loopback HEV connection. The host should duplicate the descriptor if ownership is
ambiguous, start the local SOCKS engine first, start HEV second, and close the host
descriptor only after HEV joins. `onRevoke`, notification stop, power-off, crash and
engine-switch paths must all converge on the same teardown transaction.

The upstream JNI API accepts only a config path even though the C API accepts a
string. RahRow should own a narrow JNI wrapper around `main_from_str` to avoid leaving
generated sensitive configuration on disk, and expose start completion, stop/join,
running state and statistics without adopting upstream's default Java package name.

### iOS and macOS

Apple's supported product architecture is an `NEPacketTunnelProvider` app extension.
It receives packet access through `packetFlow`, applies address, DNS, route and MTU
settings with `setTunnelNetworkSettings`, and requires the Network Extension
entitlement and an embedded provider target
([Apple `NEPacketTunnelProvider`](https://developer.apple.com/documentation/networkextension/nepackettunnelprovider),
[packet-tunnel overview](https://developer.apple.com/documentation/networkextension/packet-tunnel-provider)).

Upstream builds an XCFramework for iOS, simulators, macOS and tvOS, but the C API
still consumes a numeric TUN descriptor. The Apple API documentation exposes
`NEPacketTunnelFlow`, not a public `fileDescriptor` property. The wrapper linked by
upstream's README works around this by scanning process descriptors with
`getpeername` and selecting the `com.apple.net.utun_control` peer before calling HEV
([upstream-linked Tun2SocksKit](https://github.com/EbrahimTahernejad/Tun2SocksKit),
[descriptor discovery](https://github.com/EbrahimTahernejad/Tun2SocksKit/blob/main/Sources/Tun2SocksKit/Tunnel.swift#L33-L61),
[Apple `packetFlow`](https://developer.apple.com/documentation/networkextension/nepackettunnelprovider/packetflow)).

That is evidence of practical integration, but it is not an Apple-documented
descriptor contract. RahRow should not make HEV the Apple default until a signed
prototype passes App Store/static review checks, repeated connect/sleep/wake/network-
change tests and real-device memory/load tests. Do not hard-code file descriptor 4.
If a reviewable, stable descriptor bridge cannot be established, use an engine API
that integrates through the documented packet-flow boundary instead.

HEV's own README recommends smaller task stacks, TCP buffers and bounded session
counts on low-memory systems such as iOS. RahRow must tune and soak-test those values;
desktop defaults should not be copied into a packet-tunnel extension
([upstream low-memory guidance](https://github.com/heiher/hev-socks5-tunnel/blob/main/README.md#low-memory-usage)).

### Linux

The Linux kernel requires opening `/dev/net/tun` and issuing `TUNSETIFF`; creating or
attaching to a device not owned by the caller requires `CAP_NET_ADMIN`
([Linux TUN/TAP documentation](https://kernel.org/doc/html/latest/networking/tuntap.html)).
Upstream's documented full-tunnel recipe also disables reverse-path filtering,
marks the SOCKS connection for an upstream bypass, and installs separate IPv4 and
IPv6 policy rules/routes. RahRow must implement those changes as one journaled
transaction with idempotent recovery rather than invoking the README commands from
the UI process
([HEV Linux routing recipe](https://github.com/heiher/hev-socks5-tunnel/blob/main/README.md#linux)).

Use a narrowly privileged service that accepts validated, structured requests. It
should allocate the TUN, supervise HEV and the selected protocol engine, own route
and DNS state, detect child exit, and restore only state it created. Prefer
capabilities/service policy over running the entire desktop app as root.

### Windows

Upstream added Windows in 2.13 and uses its Wintun wrapper to create an adapter,
configure addresses and exchange packets. Its release ZIP includes the HEV
executable, `wintun.dll` and `msys-2.0.dll`; the documented routing commands still
have to exclude the SOCKS server and replace IPv4/IPv6 defaults
([Windows tunnel implementation](https://github.com/heiher/hev-socks5-tunnel/blob/main/src/hev-tunnel-windows.c),
[build workflow](https://github.com/heiher/hev-socks5-tunnel/blob/main/.github/workflows/build.yaml#L169-L210),
[Windows routing recipe](https://github.com/heiher/hev-socks5-tunnel/blob/main/README.md#windows)).

RahRow should place this behind its authenticated Windows service. Before defaulting
to HEV, test clean install/uninstall, adapter reuse, suspend/resume, network change,
IPv4/IPv6, DNS, engine crash, app crash, power-off and failed partial startup. The
exact Wintun DLL must be reviewed and distributed under its own upstream terms; the
HEV MIT license does not relicense Wintun.

### CLI

HEV can back `rahrow connect --mode vpn` on Linux, macOS and Windows, but the CLI
must use the same installed service/Network Extension boundary as the graphical app.
It should never prompt through an improvised shell command, run the whole Node
process as administrator, or claim VPN success after only spawning HEV. Android and
iOS are not general CLI deployment targets: their VPN interfaces belong to
`VpnService` and Network Extension app components.

## Compatibility rules with RahRow engines and modes

HEV is usable only when all of these predicates hold:

1. connection mode is VPN;
2. the OS TUN capability and required authorization are available;
3. the selected protocol engine can expose a loopback SOCKS5 inbound;
4. that inbound supports every required traffic family, particularly UDP;
5. the engine's real upstream sockets are excluded from the captured route;
6. only one HEV instance owns the process-global runtime;
7. the platform can restore route, DNS, adapter and descriptor state on every exit.

Consequences:

- HEV can front Xray or sing-box; it does not make an Xray-only profile work in
  sing-box or the reverse.
- Proxy mode continues to connect applications to the selected engine's proxy
  listener and must not start HEV.
- A profile/engine/mode change while connected is a full reinitialization: validate
  the new engine config and SOCKS capability, stop HEV, stop the prior engine,
  restore the prior OS transaction, then start the new engine, TUN and HEV.
- If UDP is required but the local SOCKS inbound does not support it, the combination
  is incompatible. RahRow must block it with a precise diagnostic, not silently
  provide TCP-only VPN service.
- HEV's mapped DNS is optional packet translation, not OS DNS ownership. RahRow must
  still configure and restore platform DNS and test for leakage.
- Kill-switch claims require OS-level fail-closed routes/firewall behavior. HEV
  exiting by itself does not establish a kill switch.

## Licensing and supply-chain obligations

The top-level project is MIT licensed. Distribution must retain its copyright and
permission notice in copies or substantial portions
([HEV license](https://github.com/heiher/hev-socks5-tunnel/blob/main/LICENSE)).
That permissive license makes HEV substantially easier to combine with RahRow than a
copyleft-linked tunnel library, but it covers only the HEV material to which it
applies. RahRow must separately inventory and retain the licenses/notices for the
four pinned submodules, generated wrapper code, MSYS runtime and Wintun. This report
is engineering guidance, not legal advice.

Do not fetch unsigned `latest` artifacts at application runtime. Native code must be
compiled or downloaded in CI from immutable revisions, checksum verified, included
in RahRow's SBOM and third-party notices, scanned, signed with the RahRow release,
and exercised by architecture-specific smoke tests. The 2.17.0 fixes reinforce the
need for a prompt, reviewed update policy rather than an unpinned dependency.

## Implementation and rollout plan

1. Add a provider-neutral `TunBackend` capability separate from `EngineId`, with
   `hev-socks5-tunnel` as one backend and a compatibility predicate over OS, mode,
   engine SOCKS/UDP support and installed artifact.
2. Pin HEV 2.17.0 (`d1178b5`) and every submodule; add reproducible Android `.so`,
   Apple XCFramework and desktop sidecar builds, checksums, SBOM and notices.
3. Implement the engine-local SOCKS lifecycle contract: reserve a loopback port,
   validate config, start the selected protocol engine, wait for readiness, then
   start HEV. Never expose the listener on a non-loopback address.
4. Implement Android first using the existing `VpnService` owner, a RahRow JNI
   wrapper around the string API, protected engine upstream sockets, foreground
   lifecycle, joined shutdown and traffic statistics.
5. Implement Linux behind the privileged service with journaled IPv4/IPv6 routes,
   rules, reverse-path-filter and DNS restoration.
6. Implement Windows behind the service with pinned Wintun/MSYS artifacts and full
   adapter, route and DNS rollback tests.
7. Prototype Apple inside the signed packet-tunnel provider. Review the utun
   descriptor discovery boundary and keep the backend experimental until device,
   memory, App Store/static review and lifecycle gates pass.
8. Make HEV the default **TUN backend** only per platform after its gate passes.
   Keep Xray/sing-box as the user-visible engine and preserve an automatic fallback
   to an engine-native TUN backend only when it is explicitly validated and the UI
   reports the fallback.
9. Run end-to-end matrices for Xray and sing-box, TCP and UDP, IPv4-only, IPv6-only
   and dual-stack, reconnect and engine switching, sleep/resume, network changes,
   always-on/background behavior, crash recovery, DNS leakage and kill-switch
   behavior on every shipped OS/architecture.

## Acceptance boundary

HEV is ready to become a platform default only when RahRow can demonstrate all of
the following on that platform: a pinned verified artifact; correct native consent
and privilege; healthy local SOCKS handoff; TCP, UDP, DNS, IPv4 and IPv6 behavior;
upstream-loop exclusion; truthful readiness; serialized lifecycle; clean mode and
engine switching; crash/power-off recovery; and exact restoration of OS networking
state. Unit tests or a successful native build alone do not satisfy this boundary.
