---
'@rahrow/core': patch
'@rahrow/features': patch
'@rahrow/desktop': patch
'@rahrow/mobile': patch
'@rahrow/cli': patch
---

Route post-connect egress identity and Cloudflare readiness observations through bounded native SOCKS requests in proxy mode. Unsupported hosts now fail closed instead of silently observing the direct route.
