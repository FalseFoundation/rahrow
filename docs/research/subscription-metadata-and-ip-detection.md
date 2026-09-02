# Subscription metadata and IP detection

Research date: 2026-08-30

## Decision summary

RahRow can show quota and expiry data when a subscription provider supplies it,
but there is no universal V2Ray/Xray subscription-account standard. The main
cross-client convention is the de-facto `Subscription-Userinfo` HTTP response
header. It carries byte counters and an expiry timestamp and is implemented by
Mihomo. Shadowsocks SIP008 is the notable formal alternative: it defines usage
fields in the JSON body, not the HTTP header.

RahRow should also separate three different network values in its UI:

- **Local network IP**: an address on the active physical/underlying interface.
  Native platform APIs can obtain this without an Internet service.
- **Server endpoint**: the selected profile's hostname or IP. This comes from the
  profile and is not the connected/exit IP.
- **Exit IP**: the public address seen after routing through the tunnel or proxy.
  A host behind NAT cannot determine this from local interface state alone. It
  requires an external observer, ideally a small RahRow-owned HTTPS endpoint.

`127.0.0.1` is a loopback listener and must never be presented as the device's
local network or public IP.

## Subscription usage and expiry metadata

### De-facto Clash/Mihomo header

Mihomo reads `subscription-userinfo` from an HTTP subscription response, stores
it with the provider, and exposes the parsed result. Its current parser accepts
semicolon-delimited, case-normalized fields named `upload`, `download`, `total`,
and `expire` ([Mihomo header ingestion](https://github.com/MetaCubeX/mihomo/blob/Meta/adapter/provider/provider.go#L208-L217),
[Mihomo parser](https://github.com/MetaCubeX/mihomo/blob/Meta/adapter/provider/subscription_info.go#L11-L46)).
The official Mihomo dashboard describes the same four values as subscription
usage-card data ([MetaCubeXD profile manager](https://github.com/MetaCubeX/metacubexd/blob/main/README.md#profiles--config-editor-desktop--server)).

The practical field meanings are:

| Field | Meaning |
| --- | --- |
| `upload` | Uploaded bytes used |
| `download` | Downloaded bytes used |
| `total` | Total quota in bytes |
| `expire` | Expiry as Unix epoch seconds; `0` is commonly used for no known expiry |

Compute `used = upload + download` and `remaining = max(total - used, 0)` only
when the corresponding values are valid. This is an ecosystem convention, not
an IETF header or a V2Ray/Xray wire-protocol field, so absence is normal and
unknown fields must be ignored.

`Profile-Update-Interval` is another de-facto response header. Implementations
treat its integer value as hours, but compatibility is uneven; for example,
v2rayNG has explicitly declined automatic support while Clash-family clients
have added it at different times ([v2rayNG decision and unit convention](https://github.com/2dust/v2rayNG/issues/3438),
[Clash Meta for Android discussion](https://github.com/MetaCubeX/ClashMetaForAndroid/discussions/481)).
Treat it as a bounded refresh hint rather than a guaranteed standard.

Other commonly encountered hints include `Profile-Title`, `Profile-Web-Page-Url`,
`Support-Url`, and a filename in `Content-Disposition`. These should remain
optional and must not be allowed to navigate to unsafe URL schemes.

### Shadowsocks SIP008

SIP008 is a published Shadowsocks online-configuration specification. It defines
optional root-level `bytes_used` and `bytes_remaining` values in bytes. It does
not define an expiry field. It also requires HTTPS and notes that subscription
URLs commonly contain secrets, which is why RahRow must redact these URLs from
logs and diagnostics ([SIP008 specification](https://github.com/shadowsocks/shadowsocks-org/wiki/SIP008-Online-Configuration-Delivery)).

RahRow should parse SIP008 body metadata only after positively identifying and
validating an SIP008 JSON document. It should not scan arbitrary profile names
or link comments for quota-looking text.

### Live inspection of the supplied subscription

A metadata-only GET was made on 2026-08-30. The credential, response body, and
generated profile endpoints were deliberately not retained or reproduced.

- The provider returned HTTP 200.
- With its Clash-compatible representation it returned YAML and a
  `Profile-Update-Interval` of 24 hours.
- It returned `Subscription-Userinfo` with a 150 GiB total quota and an expiry of
  2026-09-13 19:26:51 UTC.
- At the time of the last check, approximately 51.90 GiB was used and 98.10 GiB
  remained, with about 15 days until expiry. Usage and remaining time are
  naturally time-sensitive.
- With a RahRow-specific user agent, the same provider still returned usage and
  expiry metadata, but changed the body representation and omitted the update
  interval. This confirms that providers may vary both body format and optional
  headers by user agent.

The requested data is therefore available directly from this provider; RahRow
does not need to infer it from node names.

### RahRow implementation contract

1. Capture metadata in the same trusted fetch that downloads the subscription;
   do not issue a second metadata request.
2. Parse header names case-insensitively. Split `Subscription-Userinfo` on
   semicolons, trim whitespace, accept fields in any order, reject negative or
   non-finite values, and ignore unknown fields.
3. Parse integer values without losing precision. Prefer decimal-string or
   64-bit storage at the domain/native boundary; only convert to JavaScript
   `number` after checking `Number.MAX_SAFE_INTEGER`.
4. Persist the metadata snapshot, `fetchedAt`, and source alongside the owning
   subscription, atomically with a successful profile refresh. A last-known
   snapshot may be retained for offline display, but it must be visibly marked
   stale if a later fetch has no metadata.
5. Render quota only when `total > 0`; render expiry only when `expire > 0`.
   Clamp remaining bytes at zero and show the exact last-refresh time.
6. Keep a stable RahRow user agent and allow an explicit compatibility user agent
   per subscription if a provider returns a different supported format. Never
   silently send a subscription to a remote conversion service.
7. Redact subscription query strings, credentials, profile passwords, UUIDs, and
   response bodies from logs and diagnostics.

## Local, public, and tunnel IP detection

### What can be detected locally

Native code can enumerate addresses assigned to network interfaces:

- Android exposes a network's interface addresses through
  `ConnectivityManager.getLinkProperties()` and
  `LinkProperties.getLinkAddresses()` ([Android `ConnectivityManager`](https://developer.android.com/reference/android/net/ConnectivityManager#getLinkProperties(android.net.Network)),
  [Android `LinkProperties`](https://developer.android.com/reference/android/net/LinkProperties#getLinkAddresses())).
  When the VPN is active, RahRow should select an underlying non-VPN network,
  because `VpnService` distinguishes the networks carrying VPN upstream traffic
  from the VPN interface itself ([Android `VpnService.setUnderlyingNetworks`](https://developer.android.com/reference/android/net/VpnService#setUnderlyingNetworks(android.net.Network%5B%5D))).
- Apple platforms expose interface addresses through `getifaddrs`; a packet
  tunnel separately owns a virtual interface and its virtual IP settings
  ([Apple `getifaddrs`](https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man3/getifaddrs.3.html),
  [Apple packet-tunnel virtual interface](https://developer.apple.com/documentation/networkextension/nepackettunnelprovider)).
- Windows `GetAdaptersAddresses` returns IPv4/IPv6 adapter information and
  unicast addresses ([Microsoft `GetAdaptersAddresses`](https://learn.microsoft.com/en-us/windows/win32/api/iphlpapi/nf-iphlpapi-getadaptersaddresses)).
- Linux and other Unix-like desktops can enumerate local interface addresses
  with `getifaddrs` ([Linux `getifaddrs`](https://man7.org/linux/man-pages/man3/getifaddrs.3.html)).

Enumeration alone is not enough: systems can have Wi-Fi, Ethernet, cellular,
container, tunnel, link-local, and loopback addresses simultaneously. RahRow
should select the active default-route **physical/underlying** interface, prefer a
usable unicast address, exclude loopback and unspecified addresses, and retain
IPv4 and IPv6 separately. If it cannot choose truthfully, omit the field rather
than showing `127.0.0.1`.

The tunnel's virtual address can also be read locally, but it is a separate value
and normally is not what users mean by public or exit IP.

### RahRow network-identity capability boundary

The shared application accepts an optional native `NetworkIdentity` port whose
snapshot contains only selected local/LAN addresses. Its type deliberately has
no public or exit-address field. Desktop adapters must use the operating
system's active physical/default-route interface APIs; Android adapters must use
the active underlying non-VPN `Network` and its `LinkProperties`; iOS adapters
must enumerate the underlying interface outside the packet-tunnel virtual
address. Until those native adapters can make that selection truthfully, the
capability remains absent and the UI omits the device-LAN row.

No browser fallback, profile hostname, loopback listener, DNS lookup, or tunnel
virtual address may populate this capability. Public/egress identity belongs to
a separate, explicitly configured external observer with its own consent,
privacy, timeout, routing, and retention policy; without that observer, RahRow
does not render public or exit IP.

### What requires an external observer

Private addresses are deliberately reusable and are not globally unique
([RFC 1918](https://www.rfc-editor.org/rfc/rfc1918)). NAT assigns an address on
the public side that is visible to a remote peer, not necessarily to the local
host. STUN demonstrates the required model: the external STUN server observes the
request's translated source address and returns it to the client as a reflexive
address ([RFC 8489](https://www.rfc-editor.org/rfc/rfc8489)). An HTTPS “what is my
IP” endpoint uses the same external-observer principle.

Therefore:

- The disconnected public IP and connected tunnel exit IP require a network
  request to an external observer. A third-party service is optional; an owned,
  minimal RahRow endpoint is preferable for reliability and privacy.
- A connected probe must actually traverse the selected tunnel/proxy. In TUN
  mode a normal included request should do so. In proxy mode the client must send
  the probe through the local proxy explicitly.
- A pre-tunnel public IP while already connected requires either a cached
  disconnected result or a native request bound/protected to the underlying
  interface. It cannot be derived from the profile.
- Split tunneling means an exit probe reports the route taken by that probe, not
  a universal address for every application.

The endpoint should return only the observed IPv4 or IPv6 address over HTTPS,
avoid persistent request logging, apply strict timeouts and size limits, and let
the UI say “Unavailable” or omit the row on failure. RahRow must never label the
profile hostname as “Connected IP”; label it “Server” instead.
