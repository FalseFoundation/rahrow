# Post-connection egress IP and speed testing

Research date: 2026-09-02

## Recommendation

RahRow should ultimately operate a minimal HTTPS endpoint on a RahRow-owned hostname, for example a Cloudflare Worker at `https://network.rahrow.false.foundation/egress`. It should return only a versioned response such as:

```json
{
  "version": 1,
  "ip": "203.0.113.7",
  "country": "NL"
}
```

Cloudflare documents that `CF-Connecting-IP` contains the client address seen by its edge, including IPv6 handling, and that a Worker's inbound `request.cf.country` is a two-letter country code. Workers can explicitly set CORS response headers. These form a substantially clearer contract than parsing another Cloudflare product's diagnostic response ([Cloudflare HTTP headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/), [Workers request properties](https://developers.cloudflare.com/workers/runtime-apis/request/), [Workers CORS example](https://developers.cloudflare.com/workers/examples/cors-header-proxy/)).

The endpoint should:

- accept only `GET` and `HEAD`;
- return `Cache-Control: no-store` and a small JSON body;
- allow only RahRow application origins where an origin is available, while still supporting native clients that do not send one;
- validate and normalize the IP before returning it;
- return only IP and ISO country code, without city, coordinates, ASN, user agent, or other fingerprinting data;
- disable application-level request logging and document any unavoidable infrastructure retention;
- publish a stable versioned schema, availability expectations, and an abuse-protection policy;
- support both IPv4 and IPv6 without converting a real IPv6 address to a pseudo-IPv4 value.

Owning the hostname and response contract allows RahRow to change the underlying edge provider later. It does not eliminate the fundamental privacy fact: any external reflector necessarily receives the user's final public IP.

Cloudflare enables invocation logs by default for newly created Workers, but documents an `invocation_logs = false` setting. RahRow should set that explicitly and avoid custom request logs ([Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)). The current Workers Free plan allows 100,000 requests per day; that is enough for an initial rollout, not an unlimited availability promise, so usage and fail-closed behavior must be monitored ([Workers limits](https://developers.cloudflare.com/workers/platform/limits/)).

For the initial implementation, use Cloudflare's trace endpoint directly, then fall back to ipify for IP-only results. Provider lookup failure must never turn a successful VPN or proxy connection into a connection failure.

## Why an external reflector is required

Operating-system networking APIs describe addresses assigned to local interfaces and adapters. Android's `LinkProperties.getLinkAddresses()` returns the addresses assigned to a specific link. Linux `getifaddrs()` returns interfaces of the local system, and its examples include loopback, private IPv4, and link-local IPv6 addresses. Windows `GetAdaptersAddresses` likewise retrieves addresses associated with adapters on the local computer. Apple recommends `getifaddrs` when software needs the full interface list ([Android `LinkProperties`](https://developer.android.com/reference/android/net/LinkProperties#getLinkAddresses()), [Linux `getifaddrs`](https://man7.org/linux/man-pages/man3/getifaddrs.3.html), [Windows `GetAdaptersAddresses`](https://learn.microsoft.com/en-us/windows/win32/api/iphlpapi/nf-iphlpapi-getadaptersaddresses), [Apple local-network guidance](https://developer.apple.com/documentation/technotes/tn3179-understanding-local-network-privacy)).

Those APIs can identify a tunnel interface and its assigned address; they cannot reliably reveal the Internet-facing address after VPN routing, carrier-grade NAT, conventional NAT, or an application proxy. This limitation applies to Android, iOS, macOS, Linux, Windows, and CLI processes running on those systems. RahRow must make a request to an off-device service through the newly active route.

## Provider comparison

| Option | IP families | Country | Browser CORS | Published usage boundary | Main dependency/privacy point |
| --- | --- | --- | --- | --- | --- |
| RahRow-owned reflector | IPv4 and IPv6 by contract | Yes | Controlled by RahRow | Hosting-plan capacity | Stable first-party contract; edge provider still observes the IP |
| Cloudflare trace | Family used by the request | Yes (`loc`) | Currently `*` | No API SLA/rate limit published | Cloudflare diagnostic format is not versioned |
| ipify `api64` | IPv4 or IPv6 | No | Currently `*` | Official site says unlimited | Official site says visitor information is not logged |
| ifconfig.co | IPv4 or IPv6 | Yes | Not currently advertised | One automated request/minute | No equivalent no-logging promise found |
| IPinfo Lite | Dual stack | Yes | Officially supported | Unlimited authenticated Lite requests | Token, licensing, and direct vendor disclosure |

“Currently” reflects live HTTPS response-header checks on the research date, not a contractual guarantee. Native clients do not require CORS, but RahRow's WebView code does unless the request is mediated by a native capability.

### RahRow-owned endpoint

This is the preferred production design. A Cloudflare Worker can read the client IP supplied by the edge and a two-letter country from `request.cf.country` ([Cloudflare HTTP headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/), [Workers request properties](https://developers.cloudflare.com/workers/runtime-apis/request/)). It can return HTTPS JSON with an explicit, app-controlled CORS and privacy policy.

Advantages are a stable RahRow schema, no client API key, first-party error monitoring, controlled response size, and freedom to migrate providers. The tradeoffs are operating responsibility, abuse controls, Cloudflare dependence while hosted there, and the need to make logging and retention choices explicit.

### Cloudflare `/cdn-cgi/trace`

Cloudflare documents `/cdn-cgi/trace` as a Cloudflare-managed diagnostic endpoint used to identify the serving data center. Its WARP documentation explicitly instructs users to request `https://www.cloudflare.com/cdn-cgi/trace` to verify tunnel state ([`/cdn-cgi/` reference](https://developers.cloudflare.com/fundamentals/reference/cdn-cgi-endpoint/), [WARP Linux verification](https://developers.cloudflare.com/warp-client/get-started/linux/)). The live HTTPS response contains line-oriented fields including `ip`, `loc`, and `colo`, and currently permits cross-origin reads with `Access-Control-Allow-Origin: *` ([live trace endpoint](https://www.cloudflare.com/cdn-cgi/trace)).

It provides public IP and a country code in one small request without a client credential. However, Cloudflare does not document the trace body as a versioned public API, or publish a specific SLA or rate limit for this use. RahRow should parse defensively, ignore unknown fields, validate both the address and country, and treat absent or malformed values as an unavailable enrichment. This is a pragmatic initial provider, not the strongest long-term contract.

The address reflects the protocol family used for that request. RahRow should accept either IPv4 or IPv6 rather than assuming that every dual-stack device will return both.

Cloudflare's general privacy policy says visits to its websites may be stored in log files with IP address, system configuration, referring URL, locale, and language information. That makes “small response” different from “no data collection”; RahRow should name Cloudflare in its disclosure ([Cloudflare privacy policy](https://www.cloudflare.com/policies/privacy/)).

### ipify

ipify offers separate HTTPS endpoints for IPv4, IPv6-only, and universal IPv4/IPv6 access, with text, JSON, and JSONP responses. Its official site states that use is unlimited, the implementation is open source, and visitor information is not logged. It does not return a country ([ipify documentation](https://www.ipify.org/)). The JSON endpoint currently supports browser CORS.

`https://api64.ipify.org?format=json` is therefore the best direct fallback when Cloudflare trace fails. A successful response should produce an IP-only home-screen state with no flag, not trigger a second geolocation request automatically. The `api6` endpoint should not be the default because its documentation says it fails when IPv6 is unavailable.

### ifconfig.co

ifconfig.co returns IP, country, ISO country code, city, ASN, and related fields; supports HTTPS and IPv6; and publishes its BSD-licensed server implementation. It uses MaxMind data for geolocation ([ifconfig.co](https://ifconfig.co/), [`echoip` source and documentation](https://github.com/mpolden/echoip)).

Its official FAQ limits automated clients to one request per minute and warns that excess traffic may receive `429` responses or be dropped. Its current JSON response does not advertise browser CORS, and the project does not make the same no-logging promise as ipify. It is unsuitable as RahRow's default client-side provider. It may be useful as an opt-in native fallback or a self-hostable reference implementation, but a RahRow-owned minimal endpoint would collect and expose less data.

### IPinfo

IPinfo Lite provides HTTPS, dual-stack IP and country/ASN results and documents unlimited authenticated requests. It requires an API token ([IPinfo developer documentation](https://ipinfo.io/developers)). Embedding a shared service credential in desktop and mobile binaries is not a sound secret-management strategy.

Its privacy policy says the service collects IP and device/usage information, derives generalized location, may use generalized location for service improvement and advertising, and hosts its services in the United States ([IPinfo privacy policy](https://ipinfo.io/privacy-policy)). Its public-site terms also restrict automated collection and external commercial reuse, while separate data-service terms may apply ([IPinfo terms](https://ipinfo.io/terms-of-service)). IPinfo should therefore not be built directly into the client as the default. If chosen later, it should sit behind a RahRow-controlled service and undergo a licensing and privacy review.

## Connection and routing behavior

The probe must be tied to a connection generation, not merely to component mount state:

1. Wait until the engine reports a confirmed connected state and the platform route or proxy change has completed.
2. Start a new probe with a generation identifier and an abort signal.
3. For VPN mode, use normal system networking after the tunnel route is active.
4. For proxy mode, ensure the request uses RahRow's configured proxy path. A WebView or native HTTP client that bypasses the application proxy would expose and display the pre-proxy egress address.
5. Discard a result if the selected profile, engine, mode, or connection generation changed while the request was running.
6. Clear the displayed IP immediately on disconnect or reinitialization. Never carry an address across connections.

A three-to-five-second per-provider deadline is a reasonable product policy, not a provider guarantee. Try the RahRow endpoint first when available, Cloudflare trace next during migration or service outage, and ipify last. Avoid unbounded retry loops. At most one delayed retry per connection generation is sufficient; ordinary refresh can happen when the app becomes active or the connection changes. This limits disclosure and battery/network use.

The home screen should display only the external address. It should not show a local interface address or the selected connection URL. A validated two-letter ISO country code can be converted locally to Unicode regional-indicator symbols; no flag image service is needed. Special or unknown codes should use a neutral globe rather than producing a misleading flag.

## Privacy and failure semantics

The UI and privacy documentation should name the provider because the request reveals the user's VPN or proxy exit address to it. Do not attach profile IDs, subscription names, device IDs, advertising IDs, or analytics parameters. Do not persist historical addresses unless the user explicitly requests diagnostics. Logs should redact IP response bodies.

States should be explicit:

- `loading`: connection succeeded and enrichment is running;
- `available`: validated external IP, optionally with a country;
- `unavailable`: connected, but all reflectors timed out or returned invalid data;
- `disconnected`: no current external IP is claimed.

An unavailable IP is not evidence that the tunnel failed. Conversely, an IP response alone is not sufficient proof that all expected traffic is routed through the VPN.

## Cloudflare speed test: latency is not throughput

Cloudflare's official open-source `@cloudflare/speedtest` module powers `speed.cloudflare.com`. Its defaults use `https://speed.cloudflare.com/__down` for download requests and `https://speed.cloudflare.com/__up` for uploads. It can measure idle and loaded latency, jitter, download/upload bandwidth, and packet loss ([Cloudflare speedtest source and API](https://github.com/cloudflare/speedtest), [Cloudflare speed-testing overview](https://developers.cloudflare.com/fundamentals/performance/test-speed/)).

The live `__down?bytes=0` response currently exposes IP and country metadata in response headers, but Cloudflare does not document those headers as a stable egress-identity API. RahRow should use that endpoint for a Cloudflare measurement only, not couple home-screen identity to incidental speed-test headers.

The measures must not be conflated:

- A latency request uses the download endpoint with zero bytes and measures request-start to response-start round-trip timing. It does not measure Mbps.
- Download and upload throughput transfer bodies of specified sizes and compute bits per second from transfer size and duration, accounting for server processing timing.
- Packet loss uses UDP through a WebRTC TURN server. The public TURN server is deprecated; Cloudflare's project says clients must provide their own TURN configuration for this measurement.

The module's default measurement ramp includes repeated samples up to very large payload sizes, including 250 MB downloads. That is inappropriate as an automatic, silent post-connect action on metered or mobile networks. Cloudflare says a full test can consume up to 200 MB, receives the client's IP, estimated location, and ASN, and shares anonymized measurements with measurement partners; its package also states that completed results are collected for aggregate connection-quality insights ([Cloudflare Speed Test disclosure](https://speed.cloudflare.com/), [Cloudflare speedtest source and API](https://github.com/cloudflare/speedtest)).

RahRow should show a lightweight result panel after successful connection, but should not silently run the full default suite. Recommended behavior:

- automatically perform only a small Cloudflare latency/readiness probe after route stabilization;
- present an explicit **Run speed test** action for throughput, with an estimated data-use disclosure;
- use a custom bounded measurement plan rather than Cloudflare's full default sequence;
- honor metered-data, low-power, background, and user cancellation signals;
- never run upload/download throughput concurrently with profile ranking pings or engine reinitialization;
- label latency in milliseconds and throughput in Mbps, and show partial failure honestly;
- disclose that Cloudflare receives completed measurement results if the official module's reporting remains enabled.

If product requirements insist on automatic throughput testing after every successful connection, it should default off, have a data cap, and be suppressed on metered networks. A successful tunnel should remain connected even when the test fails or is cancelled.

## Current implementation boundary

RahRow's desktop host can make these allowlisted HTTPS observations through its local SOCKS endpoint with the existing Rust `ureq` transport, and the Android and iOS hosts can do the same through per-request native proxy configuration. These paths reject redirects, bound time and response size, avoid credentials and caches, and do not fall back to direct networking.

The CLI remains intentionally unavailable in proxy mode. Its bundled Node HTTP transport has no SOCKS dispatcher, and the repository does not currently include an audited SOCKS-capable CLI dependency. A direct `fetch` fallback would expose the pre-proxy address and produce a false result, so the CLI adapter fails closed until a reviewed transport is selected. Consequently, the cross-platform Taskset item must remain in progress even though desktop and mobile have safe implementations.

## Suggested rollout

1. Implement a provider-neutral `EgressIdentityProvider` contract and connection-generation cancellation.
2. Ship Cloudflare trace with ipify fallback, external-IP-only UI, local flag derivation, redacted logging, and provider disclosure.
3. Add a small Cloudflare latency probe and an explicit bounded throughput action; do not adopt the full default test plan unchanged.
4. Deploy the RahRow-owned endpoint, document retention and abuse controls, and make it primary.
5. Keep direct Cloudflare trace and ipify as independently disableable fallbacks so a RahRow service outage does not remove the diagnostic entirely.
6. Test VPN and proxy routing separately on Android, iOS, macOS, Linux, Windows, and CLI, including IPv4-only, IPv6-only, dual-stack, captive/offline, timeout, reconnect, and provider-malformed-response cases.
