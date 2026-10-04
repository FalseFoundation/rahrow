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
		const engine = await this.selected(input.engineId)
		if (this.#active) {
			const activeHealth = await this.#active.status()
			const activeRunning = activeHealth.status !== 'stopped'
			if (this.#active.id === engine.id && activeRunning) {
				throw new EngineError(
					'engine_already_running',
					`${this.#active.id} is already running`,
				)
			}
			// Stale latch or engine switch: release the previous owner first.
			if (activeRunning) await this.#active.stop()
			this.#active = undefined
		}

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
		const engine = await this.selected(input.engineId)
		if (this.#active && this.#active.id !== engine.id) {
			await this.stop()
			await this.start(input)
			return
		}
		if (this.#active) {
			await this.#active.restart(input)
			return
		}

		await this.start(input)
	}

	async status(): Promise<EngineHealth> {
		if (this.#active) {
			const health = await this.#active.status()
			if (health.status === 'stopped') {
				this.#active = undefined
			} else {
				return health
			}
		}
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
