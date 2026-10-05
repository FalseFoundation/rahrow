# **Changelog**

## 0.1.0

### Minor Changes

- 85edaa4: Add canonical RahRow About metadata under the core product seam, capability-gated external and email navigation, desktop and mobile build metadata wiring, and a CLI `about` command that prints support, source, license, and product information without pretending to open links.
- 85edaa4: Add a platform-gated HEV SOCKS5 tunnel backend, make the verified bundled Android runtime the default for compatible sing-box VPN connections, and report unavailable desktop integrations without claiming unsupported VPN capability.
- 85edaa4: Add durable, provider-neutral advertising gates after three connection selections
  and successful VPN connections. Add a shared policy-safe drawer, native Google
  AdMob and consent integration for mobile, and an opt-in embedded sponsor provider
  for desktop. Development previews now include a safe test provider, and
  Diagnostics reports provider, policy progress, pending work, attempts, and the
  last completion result.

### Patch Changes

- 85edaa4: Observe the externally visible post-connect IP through a timeout-bounded, route-aware capability and present it on Home without exposing local addresses or profile endpoints.
- 85edaa4: Route post-connect egress identity and Cloudflare readiness observations through bounded native SOCKS requests in proxy mode. Unsupported hosts now fail closed instead of silently observing the direct route.
- 85edaa4: Decode Android camera frames using their actual luminance-plane strides, and stop advertising QR scanning on desktop hosts that do not provide a camera decoder.
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
- Updated dependencies [85edaa4]
  - @rahrow/core@0.1.0
  - @rahrow/features@0.1.0
  - @rahrow/engine@0.1.0
  - @rahrow/ui@0.1.0
  - @rahrow/ads@0.1.0

## **Unreleased**

### **Added**

### **Changed**

### **Fixed**
