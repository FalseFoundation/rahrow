import type { RuntimeAdapter, RuntimeName } from '@rahrow/core'
import { RuntimeError } from '@rahrow/core'
import { createDefaultAdapters } from '@rahrow/runtime-adapters'

export class RuntimeRegistry {
	readonly #adapters = new Map<RuntimeName, RuntimeAdapter>()

	constructor(adapters: readonly RuntimeAdapter[] = []) {
		for (const adapter of adapters) {
			this.register(adapter)
		}
	}

	register(adapter: RuntimeAdapter): void {
		this.#adapters.set(adapter.manifest.name, adapter)
	}

	get(name: RuntimeName): RuntimeAdapter {
		const adapter = this.#adapters.get(name)

		if (!adapter) {
			throw new RuntimeError('runtime_not_found', `Runtime adapter is not registered: ${name}`)
		}

		return adapter
	}

	list(): readonly RuntimeAdapter[] {
		return [...this.#adapters.values()]
	}
}

export function createDefaultRuntimeRegistry(): RuntimeRegistry {
	return new RuntimeRegistry(createDefaultAdapters())
}
