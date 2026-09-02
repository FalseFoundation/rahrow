# @rahrow/mobile

## Purpose
RahRow app workspace scaffold (React, Vite, and Capacitor).

## Responsibilities
- Host the mobile React/Vite composition root.
- Compose public APIs from shared packages.
- Keep native Android VPN and iOS Network Extension code behind TypeScript-facing platform contracts.

## Raw Structure

```text
src/                  Mobile React source
android/              Capacitor Android project and Kotlin plugins
ios/                  Capacitor iOS app and Network Extension control plane
native-runtime-pins.json  Exact mobile engine source revisions and targets
scripts/              Native build and checksum verification
capacitor.config.ts   Capacitor host configuration
index.html            Vite HTML entry
```

## Public API
- The `RahRowVpn` Capacitor plugin is registered from `src/lib/mobile-vpn.ts` and implemented in Kotlin.
- The TypeScript contract exposes `connect`, `disconnect`, `status`, `diagnostics`, and `probe`.
- `RahRowQr.scan()` returns a string; protocol parsing stays in `@rahrow/core`.

## Dependencies
- React and Vite own the web application shell.
- Capacitor owns native mobile shell integration.

## Advertising

Native Android and iOS builds can use Google AdMob interstitials through the
provider-neutral `@rahrow/ads` gate. Set
`VITE_RAHROW_ADMOB_INTERSTITIAL_ID` to the platform's production ad-unit ID.
Native development preview builds use Google's published test interstitial IDs.
The Android preview command builds web assets in the explicit `preview` mode so
the installable debug APK retains test advertising. Mobile
web development builds use an embedded test advertisement so the shared gate
and diagnostics remain testable outside a native host.

Before a release, replace the Google sample application IDs in
`android/app/src/main/res/values/strings.xml` and `ios/App/App/Info.plist`, then
run `pnpm capacitor:sync`. Configure a User Messaging Platform message in the
AdMob account so the consent and Privacy choices forms are available. If ads
cannot be requested, loaded, or shown, the gate fails open and VPN behavior is
unchanged.

## App icons

`pnpm icons:generate` regenerates the checked-in Android adaptive/legacy icons
and iOS app icon from `assets/logo.png` and `assets/logo-dark.png`. Both assets
use the official white RahRow mark; the generator supplies a static black icon
background for consistent contrast. Splash screens continue to use separate
light and dark backgrounds.

## Consumers
- RahRow users of the mobile application.

## Future Plans
- Add application features and platform contracts.

## VPN Platform Boundary

Android `VpnService` behavior and iOS Network Extension behavior must stay behind native adapters for the `RahRowVpn` Capacitor plugin. Kotlin and Swift code should not contain profile parsing, subscription handling, or connection orchestration business logic.

VPN/TUN is the only mobile connection mode and is the persisted default. Mobile
does not silently fall back to changing system proxy settings. Android asks the
user for `VpnService` permission and owns a full-route TUN; iOS fails closed
until its packet-tunnel extension and entitlement are present.

Native runtime workflow:

- `pnpm native:verify-pins` validates exact upstream Git revisions and targets.
- `pnpm native:build:android` or `pnpm native:build:apple` checks out those exact
  revisions and runs the upstream-supported mobile build commands.
- `pnpm native:verify` is the release gate. It fails until all built artifacts
  exist and their generated SHA-256 lock entries match.

## iOS development preview

The iOS preview contract is declared in `ios-development-preview.json`. It pins
the application, the Xray and sing-box packet-tunnel extension products, their
bundle identifiers, and the framework each extension must own. Generated native
runtimes and build products are staged only under the repository `.artifacts/`
directory; the Xcode project consumes them through
`RAHROW_NATIVE_RUNTIME_ROOT` and embeds them into the extension products.

- `pnpm ios:preview:check` validates the complete Xcode target/embedding wiring.
- `pnpm ios:preview:stage-runtimes` requires the pinned Apple archives and their
  SHA-256 lock entries, extracts both XCFrameworks, and verifies arm64 device
  plus arm64/x86_64 Simulator slices. It never downloads executable code.
- `pnpm ios:preview:simulator` builds `.artifacts/ios-simulator/RahRow.app` with full
  Xcode and no signing identity. The Simulator cannot run Network Extension, so
  this artifact embeds both extension products but records VPN as unavailable
  and the providers fail closed. When pinned engine XCFrameworks have not been
  built yet, the command generates inert Simulator-only link stubs so Xcode can
  compile the extension shells; device builds never accept those stubs.
- `pnpm bundle:ios` stages both verified XCFrameworks and builds the signed
  physical-device application under `.artifacts/ios-device/RahRow.app`. Set
  `RAHROW_IOS_DESTINATION='platform=iOS,name=h'` to target a named device.
- `pnpm ios:preview:install -- h` installs the already verified device bundle.
- `pnpm ios:preview:verify -- <app-path>` verifies the extension bundle IDs,
  fail-closed metadata, and Mach-O dependency paths. Add `--device` to require
  both embedded native frameworks for a device-build artifact.

The commands require Xcode only to compile the local Apple application. They do
not require Homebrew, PATH-installed engines, first-launch downloads, production
certificates, notarization, or App Store credentials. Physical-device execution
still requires Apple provisioning and Network Extension/App Group entitlements;
that distribution boundary does not relax the bundle checks.

Current limitations:

- Android uses separate Xray and sing-box `VpnService` processes and fails
  closed unless the engine-specific JNI provider is embedded. The former
  subprocess/SOCKS gateway was removed because excluding the app UID leaked app
  traffic and could not protect engine upstream sockets.
- iOS has a `NETunnelProviderManager` Capacitor control plane and fails closed
  until both signed packet-tunnel extensions are embedded with their native
  frameworks and Network Extension/App Group entitlements.
- Native artifacts are deliberately not committed or downloaded on first use.
- sing-box/libbox distribution remains gated on the GPL-3.0-or-later release
  model decision.
- Web builds report the plugin as unavailable unless a Capacitor implementation is registered.
- Diagnostics expose platform, native readiness, and a short detail string.

## Android development preview

`pnpm bundle:android` stages both checksummed AARs, copies the portable web
application, builds the debug APK, and verifies its embedded runtime provenance
and every advertised ABI. Android packaging fails before Gradle compilation if
either AAR is absent. Generated AARs and provenance manifests are build inputs;
they are not downloaded by the installed application.
