import { EngineError } from '@rahrow/core/errors.ts'
import type {
	EngineId,
	ProxyEngine,
} from '@rahrow/core/runtime/proxy-engine.ts'

export class EngineRegistry {
	readonly #engines = new Map<EngineId, ProxyEngine>()

	constructor(engines: readonly ProxyEngine[] = []) {
		for (const engine of engines) {
			this.#engines.set(engine.id, engine)
		}
	}

	get(id: EngineId): ProxyEngine {
		const engine = this.#engines.get(id)

		if (!engine) {
			throw new EngineError('engine_not_found', `Proxy engine not found: ${id}`)
		}

		return engine
	}

	list(): readonly ProxyEngine[] {
		return [...this.#engines.values()]
	}
}

export function createEngineRegistry(
	engines?: readonly ProxyEngine[],
): EngineRegistry {
	return new EngineRegistry(engines)
}
