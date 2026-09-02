import { EngineError } from '@rahrow/core/errors.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type {
	EngineHealth,
	EngineId,
	EngineStartInput,
	LatencyResult,
	ProxyEngine,
} from '@rahrow/core/runtime/proxy-engine.ts'

import type { EngineRegistry } from './engine-registry.ts'

export type EngineSelection = () => EngineId | Promise<EngineId>

export class SelectedEngine implements ProxyEngine {
	readonly id = 'selected' as const
	readonly manifest
	#active: ProxyEngine | undefined

	constructor(
		private readonly registry: EngineRegistry,
		private readonly selection: EngineSelection,
	) {
		this.manifest = {
			id: this.id,
			supportedProtocols: [
				...new Set(
					registry.list().flatMap((engine) => engine.manifest.supportedProtocols),
				),
			],
		}
	}

	async start(input: EngineStartInput): Promise<void> {
		if (this.#active) {
			throw new EngineError(
				'engine_already_running',
				`${this.#active.id} is already running`,
			)
		}

		const engine = await this.selected(input.engineId)
		await engine.start(input)
		this.#active = engine
	}

	async stop(): Promise<void> {
		const engine = this.#active ?? (await this.findActiveEngine())?.engine
		if (!engine) {
			return
		}

		await engine.stop()
		this.#active = undefined
	}

	async restart(input: EngineStartInput): Promise<void> {
		if (this.#active) {
			await this.#active.restart(input)
			return
		}

		await this.start(input)
	}

	async status(): Promise<EngineHealth> {
		if (this.#active) return this.#active.status()
		const recovered = await this.findActiveEngine()
		if (recovered) {
			this.#active = recovered.engine
			return recovered.health
		}
		return (await this.selected()).status()
	}

	async test(profile: ConnectionProfile): Promise<LatencyResult> {
		return (await this.selected()).test(profile)
	}

	private async selected(engineId?: EngineId): Promise<ProxyEngine> {
		return this.registry.get(engineId ?? (await this.selection()))
	}

	private async findActiveEngine(): Promise<
		{ readonly engine: ProxyEngine; readonly health: EngineHealth } | undefined
	> {
		for (const engine of this.registry.list()) {
			const health = await engine.status()
			if (health.status !== 'stopped') return { engine, health }
		}
		return undefined
	}
}
