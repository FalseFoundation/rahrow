# @rahrow/engine

Owns proxy engine implementations behind the `ProxyEngine` contract from
`@rahrow/core`.

The package provides Xray and sing-box adapters plus a registry and selected
engine router. Engine-specific JSON stays inside the adapter boundary; apps
depend on `ProxyEngine` and select an engine by its manifest id.

Both adapters compile validated Shadowsocks profiles with modern AEAD and
AEAD-2022 methods without cipher fallback. Installed-runtime conformance remains
a release gate before Shadowsocks is advertised as fully supported.

## Bundled runtime metadata

Pinned Xray and sing-box artifact metadata lives under `engines/*/runtime.json`
and is parsed by `parseEngineRuntimeManifest`. Production resolution uses
`resolveEngineRuntimeBinary`:

- Engine environment overrides must be explicit filesystem paths when set.
- Bundled artifacts are resolved relative to the runtime directory and checksums
  are verified.
- Missing binaries fail with a typed error. Production builds never search
  `PATH`.

Desktop production builds stage both checksummed artifacts as Tauri sidecars.
VPN mode generates current native TUN inbounds for both engines; proxy mode
generates loopback-only local proxy inbounds. The build runs each engine's own
configuration validator for both modes before packaging.
Development may still use explicit `RAHROW_XRAY_BINARY` and
`RAHROW_SING_BOX_BINARY` overrides. Release applications never search `PATH`
and never download executable code at application runtime.

Mobile engines require native libraries rather than desktop executables. The
Android AAR/JNI and Apple XCFramework integrations remain release gates and
must be built from pinned engine sources before either mobile app is described
as production-ready.

## Remote import goldens

The opt-in remote corpus suite imports public V2Ray subscription data through
the shared profile pipeline, then compiles every compatible profile for Xray
and sing-box. It is excluded from ordinary test runs so upstream availability
and changing subscription contents cannot make deterministic CI flaky.

Run the representative corpus (super subscription, split subscription 1, and
each protocol-specific subscription):

```sh
RAHROW_IMPORT_GOLDENS=smoke pnpm --filter @rahrow/engine test -- remote-subscription-import.golden.test.ts
```

Run the complete corpus (all protocols, super subscription, split
subscriptions 1–39, and every protocol-specific subscription):

```sh
RAHROW_IMPORT_GOLDENS=full pnpm --filter @rahrow/engine test -- remote-subscription-import.golden.test.ts
```
