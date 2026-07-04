import type { RuntimeConfig, RuntimeHealth } from '@rahrow/core'
import { createRuntimeManager, type RuntimeManager } from '@rahrow/runtime-manager'

export class RahrowSdk {
	readonly #runtimeManager: RuntimeManager

	constructor(runtimeManager: RuntimeManager = createRuntimeManager()) {
		this.#runtimeManager = runtimeManager
	}

	start(config: RuntimeConfig): Promise<void> {
		return this.#runtimeManager.start(config)
	}

	stop(): Promise<void> {
		return this.#runtimeManager.stop()
	}

	health(): Promise<RuntimeHealth> {
		return this.#runtimeManager.health()
	}
}

export function createSdk(): RahrowSdk {
	return new RahrowSdk()
}

export type { RuntimeConfig, RuntimeHealth }
