import type { RuntimeConfig, RuntimeHealth, RuntimeName } from '@rahrow/core'
import { normalizeRuntimeConfig } from '@rahrow/runtime-core'
import { createDefaultRuntimeRegistry, type RuntimeRegistry } from '@rahrow/runtime-registry'

export class RuntimeManager {
	readonly #registry: RuntimeRegistry
	#activeRuntime?: RuntimeName

	constructor(registry: RuntimeRegistry = createDefaultRuntimeRegistry()) {
		this.#registry = registry
	}

	async start(config: RuntimeConfig): Promise<void> {
		const normalizedConfig = normalizeRuntimeConfig(config)
		const adapter = this.#registry.get(normalizedConfig.runtime)

		await adapter.start(normalizedConfig)
		this.#activeRuntime = normalizedConfig.runtime
	}

	async stop(): Promise<void> {
		if (!this.#activeRuntime) {
			return
		}

		const adapter = this.#registry.get(this.#activeRuntime)
		await adapter.stop()
		this.#activeRuntime = undefined
	}

	async health(): Promise<RuntimeHealth> {
		if (!this.#activeRuntime) {
			return {
				status: 'stopped',
				checkedAt: new Date().toISOString(),
			}
		}

		return this.#registry.get(this.#activeRuntime).health()
	}

	get registry(): RuntimeRegistry {
		return this.#registry
	}
}

export function createRuntimeManager(): RuntimeManager {
	return new RuntimeManager()
}
