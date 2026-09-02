---
'@rahrow/core': minor
'@rahrow/engine': patch
'@rahrow/features': minor
---

Make sing-box over VPN/TUN the persisted default connection, generate native dual-stack
TUN configurations for the selected desktop engine, keep system proxy as an
explicit lifecycle-managed fallback, expose tunnel capability diagnostics,
remove legacy settings migration, and rename shared process and native runtime
boundaries from Xray-specific names to generic engine names. Desktop releases
validate both modes with the bundled engines and include Wintun and third-party
license materials where required. Desktop VPN mode fails closed before engine
launch until a real platform tunnel provider is installed; administrator-script
elevation is not treated as a production VPN facility.
