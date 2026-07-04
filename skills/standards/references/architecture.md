# Architecture

Use this file as the routing map for architecture standards. Load only the
topic file needed for the change, then load additional files when the work
crosses that boundary.

## Routing

- [product-and-source.md](architecture/product-and-source.md): product
  direction, `.rahrow/` source-of-truth rules, generated/cache authority, and
  persisted format compatibility requirements
- [ownership-and-dependencies.md](architecture/ownership-and-dependencies.md):
  repository ownership, package identity, dependency flow, public runtime
  package set, and core/interface ownership
- [client-and-server.md](architecture/client-and-server.md): feature-based
  clients, DDD-lite modular core/server architecture, and server composition
  boundaries
- [storage-and-snapshots.md](architecture/storage-and-snapshots.md): storage,
  graph, canonical relationship, atomic write, and snapshot rules
- [documentation-and-generated.md](architecture/documentation-and-generated.md):
  documentation architecture, website content ownership, integrations, and
  generated-source handling

## Loading Guidance

- For package boundaries, dependency direction, or public package behavior, load
  `ownership-and-dependencies.md`.
- For `.rahrow/` persistence, schema compatibility, generated views, snapshots,
  or filesystem mutation, load `product-and-source.md` plus
  `storage-and-snapshots.md`.
- For UI, CLI, MCP, extension, Kanban, Office, core, or server architecture,
  load `ownership-and-dependencies.md` plus `client-and-server.md`.
- For documentation routes, website content, blog ownership, or generated
  outputs, load `documentation-and-generated.md`.
