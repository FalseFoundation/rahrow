# Design Conventions

General design principles for RahRow implementation work.

## General Design

- Apply SOLID as design heuristics, especially SRP, OCP, LSP, and DIP. Preserve
  separation of concerns, encapsulation, high cohesion, low coupling,
  testability, and inward dependency flow without creating ceremonial layers.
- Prefer clean architecture boundaries and pragmatic DDD where domain behavior
  benefits from explicit modules, entities, value objects, use cases, and
  ports. Use feature-based architecture for user-facing and interaction
  surfaces.
- Prefer object-oriented design for stateful domain models, lifecycle-rich
  entities, polymorphic adapters, and dependency-injected boundaries. Prefer
  focused functions for stateless parsing, validation, serialization, and data
  transformation. Do not convert code to classes for style alone.
- Use in-process domain events when several independent reactions or clear
  temporal decoupling justify them. Do not add an event bus, message broker, or
  distributed event architecture without a measured product need.
- Reuse before adding. Extend the existing source of truth when the concept
  already exists.
- Prefer explicit data flow, typed state, discriminated variants, and
  structured errors over string coordination.
- Keep functions and modules focused. Split by responsibility, not arbitrary
  line count.
- Separate pure parsing, validation, graph, and query logic from filesystem
  effects where practical.
- Fail with actionable diagnostics for invalid persisted state or destructive
  operations.
- Comment format constraints and non-obvious tradeoffs. Do not narrate obvious
  code.
- Add focused TSDoc to non-obvious public APIs and short orienting comments
  around complex algorithms, transactions, migrations, synchronization, and
  validation. Do not document obvious assignments or straightforward control
  flow.
- Keep diffs narrow. Do not combine behavior changes with unrelated renaming or
  cleanup.
