# @rahrow/runtime-manager

Single runtime lifecycle entry point.

The manager normalizes runtime config, resolves an adapter from the registry,
and controls `start`, `stop`, and `health`. SDK and app code should call this
package instead of reaching into adapters directly.
