# @rahrow/runtime-adapters

Adapter implementations for supported VPN engines.

Adapters implement `start(config)`, `stop()`, `health()`, and
`transformConfig(config)`, expose a manifest, and remain isolated from SDK,
app, and billing/product logic. Adding a new engine should add a new adapter
without modifying runtime core.
