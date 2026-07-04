# desktop

## Purpose
RahRow desktop app workspace scaffold (Tauri + React).

## Responsibilities
- Host platform-specific code for the desktop surface.
- Compose public APIs from shared packages.
- Keep Rust host/runtime bindings isolated from React UI code.

## Raw Structure

```text
src/                     React UI shell
src/components/          Shared desktop UI components
src/features/            Feature modules
src/lib/                 Desktop app utilities and adapters
src-tauri/               Tauri host root
src-tauri/src/           Rust host code
src-tauri/capabilities/  Tauri capability definitions
src-tauri/icons/         Desktop icon assets
```

## Public API
- Placeholder: no public API yet.

## Dependencies
- None yet.

## Consumers
- RahRow users of the desktop application.

## Future Plans
- Add Tauri configuration and runtime bridge contracts.
