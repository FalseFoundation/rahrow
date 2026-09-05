import { AsyncQueuer } from '@tanstack/pacer'

import type { ConnectionProfile } from '../profile/connection-profile.ts'
import type { EngineId, LatencyResult } from '../runtime/proxy-engine.ts'
import type {
	ProfileStore,
	Settings,
	SettingsStore,
	SmartConnectScheduleState,
} from '../storage/json-store.ts'
import type { ConnectionMode } from './connection-mode.ts'

export const SMART_CONNECT_INTERVAL_MS = 5 * 60 * 1_000

export interface SmartConnectCurrentConnection {
	readonly profile: ConnectionProfile
	readonly state:
		| 'disconnected'
		| 'connecting'
		| 'connected'
		| 'disconnecting'
		| 'error'
	readonly runtime?: SmartConnectRuntimeConfiguration
}

export interface SmartConnectRuntimeConfiguration {
	readonly mode: ConnectionMode
	readonly engineId: EngineId
	readonly localPort?: number
}

export interface SmartConnectConnectionInput
	extends SmartConnectRuntimeConfiguration {
	readonly profile: ConnectionProfile
	readonly signal?: AbortSignal
}

export interface SmartConnectConnection {
	readonly current?: SmartConnectCurrentConnection
	readCurrent?(): Promise<SmartConnectCurrentConnection | undefined>
	validate?(input: SmartConnectConnectionInput): Promise<void>
	connect(input: SmartConnectConnectionInput): Promise<unknown>
	disconnect(): Promise<unknown>
}

export interface SmartConnectProbeContext {
	readonly signal: AbortSignal
}

export interface SmartConnectDependencies {
	readonly profileStore: ProfileStore
	readonly settingsStore: SettingsStore
	readonly connection: SmartConnectConnection
	readonly probe: (
		profile: ConnectionProfile,
		context: SmartConnectProbeContext,
	) => Promise<LatencyResult>
	readonly concurrency?: number
	readonly wait?: number
	readonly now?: () => string
}

export type SmartConnectOutcome =
	| 'connected'
	| 'selected'
	| 'unchanged'
	| 'no-reachable-profile'
	| 'stale-winner'
	| 'disabled'
	| 'not-due'

export interface SmartConnectRunResult {
	readonly outcome: SmartConnectOutcome
	readonly probed: number
	readonly winner?: {
		readonly profileId: string
		readonly latencyMs: number
	}
	readonly nextRunAt?: string
}

export type SmartConnectProgress =
	| { readonly phase: 'queued'; readonly total: number }
	| {
			readonly phase: 'testing'
			readonly active: number
			readonly completed: number
			readonly started: number
			readonly total: number
	  }
	| { readonly phase: 'selecting'; readonly total: number }
	| {
			readonly phase: 'switching'
			readonly total: number
			readonly winnerLatencyMs: number
	  }
	| { readonly phase: 'restoring'; readonly total: number }

export interface SmartConnectRunOptions {
	readonly signal?: AbortSignal
	readonly onProgress?: (progress: SmartConnectProgress) => void
}

interface ActiveSmartConnectRun {
	readonly controller: AbortController
	readonly listeners: Set<NonNullable<SmartConnectRunOptions['onProgress']>>
	promise: Promise<SmartConnectRunResult>
}

interface PacedOperation {
	execute(): Promise<void>
}

/**
 * Owns the framework-independent Smart Connect policy. Platform hosts decide
 * when to call runIfDue (foreground timer, native background task, or daemon).
 */
export class SmartConnectOrchestrator {
	readonly #now: () => string
	readonly #concurrency: number
	readonly #wait: number
	readonly #runQueue: AsyncQueuer<PacedOperation>
	readonly #settingsQueue: AsyncQueuer<PacedOperation>
	#generation = 0
	#activeRun: ActiveSmartConnectRun | undefined

	constructor(private readonly dependencies: SmartConnectDependencies) {
		this.#now = dependencies.now ?? (() => new Date().toISOString())
		this.#concurrency = Math.max(1, Math.floor(dependencies.concurrency ?? 4))
		this.#wait = Math.max(0, Math.floor(dependencies.wait ?? 0))
		this.#runQueue = pacedOperationQueue(1)
		this.#settingsQueue = pacedOperationQueue(8)
	}

	async status(): Promise<SmartConnectScheduleState> {
		const settings = await this.dependencies.settingsStore.read()
		return settings.smartConnect ?? { enabled: false }
	}

	async start(): Promise<SmartConnectScheduleState> {
		return this.mutateSettings(async (settings) => {
			const state: SmartConnectScheduleState = {
				...settings.smartConnect,
				enabled: true,
				nextRunAt: this.#now(),
			}
			await this.dependencies.settingsStore.write({
				...settings,
				smartConnect: state,
			})
			return state
		})
	}

	async stop(): Promise<SmartConnectScheduleState> {
		this.cancel('Smart Connect disabled')
		return this.mutateSettings(async (settings) => {
			const state: SmartConnectScheduleState = {
				...settings.smartConnect,
				enabled: false,
				nextRunAt: undefined,
			}
			await this.dependencies.settingsStore.write({
				...settings,
				smartConnect: state,
			})
			return state
		})
	}

	cancel(reason = 'Smart Connect run canceled'): void {
		this.#generation += 1
		this.#activeRun?.controller.abort(reason)
	}

	async runIfDue(options: SmartConnectRunOptions = {}) {
		const state = await this.status()
		if (!state.enabled) {
			return { outcome: 'disabled', probed: 0 } as const
		}
		if (
			state.nextRunAt &&
			Date.parse(state.nextRunAt) > Date.parse(this.#now())
		) {
			return {
				outcome: 'not-due',
				probed: 0,
				nextRunAt: state.nextRunAt,
			} as const
		}
		return this.#run(options, true)
	}

	async run(
		options: SmartConnectRunOptions = {},
	): Promise<SmartConnectRunResult> {
		return this.#run(options, false)
	}

	#run(
		options: SmartConnectRunOptions,
		requiresEnabled: boolean,
	): Promise<SmartConnectRunResult> {
		throwIfAborted(options.signal)
		if (this.#activeRun) return this.observeRun(this.#activeRun, options)

		const controller = new AbortController()
		const listeners = new Set<NonNullable<SmartConnectRunOptions['onProgress']>>()
		const active: ActiveSmartConnectRun = {
			controller,
			listeners,
			promise: Promise.resolve(
				undefined as never,
			) as Promise<SmartConnectRunResult>,
		}
		this.#activeRun = active
		const generation = this.#generation
		active.promise = enqueuePacedOperation(this.#runQueue, () =>
			this.executeRun(
				{
					signal: controller.signal,
					onProgress: (progress) => {
						for (const listener of [...listeners]) {
							emitProgress(listener, progress)
						}
					},
				},
				generation,
				requiresEnabled,
			),
		).finally(() => {
			if (this.#activeRun === active) this.#activeRun = undefined
		})

		return this.observeRun(active, options)
	}

	private observeRun(
		active: ActiveSmartConnectRun,
		options: SmartConnectRunOptions,
	): Promise<SmartConnectRunResult> {
		const listener = options.onProgress
		if (listener) active.listeners.add(listener)
		const abort = () => active.controller.abort(options.signal?.reason)
		if (options.signal?.aborted) abort()
		else options.signal?.addEventListener('abort', abort, { once: true })

		return active.promise.finally(() => {
			if (listener) active.listeners.delete(listener)
			options.signal?.removeEventListener('abort', abort)
		})
	}

	private async executeRun(
		options: SmartConnectRunOptions,
		generation: number,
		requiresEnabled: boolean,
	): Promise<SmartConnectRunResult> {
		throwIfAborted(options.signal)
		const profiles = await this.dependencies.profileStore.list()
		emitProgress(options.onProgress, { phase: 'queued', total: profiles.length })
		const results = await runPacedProbes(
			profiles,
			(profile, signal) => this.dependencies.probe(profile, { signal }),
			{
				concurrency: this.#concurrency,
				wait: this.#wait,
				signal: options.signal,
				onProgress: options.onProgress,
			},
		)
		throwIfAborted(options.signal)
		emitProgress(options.onProgress, {
			phase: 'selecting',
			total: profiles.length,
		})
		const winner = results.filter(isReachableLatency).sort(compareLatency)[0]
		const runAt = this.#now()
		const nextRunAt = new Date(
			Date.parse(runAt) + SMART_CONNECT_INTERVAL_MS,
		).toISOString()

		if (!winner) {
			await this.persistDecision({
				runAt,
				nextRunAt,
				generation,
				requiresEnabled,
			})
			return {
				outcome: 'no-reachable-profile',
				probed: profiles.length,
				nextRunAt,
			}
		}

		// Re-read both profile and settings after the probes: a five-minute run can
		// overlap edits, engine changes, and mode changes.
		const [freshProfile, freshSettings] = await Promise.all([
			this.dependencies.profileStore.get(winner.profileId),
			this.dependencies.settingsStore.read(),
		])
		throwIfAborted(options.signal)
		if (!freshProfile) {
			await this.persistDecision({
				runAt,
				nextRunAt,
				generation,
				requiresEnabled,
			})
			return { outcome: 'stale-winner', probed: profiles.length, nextRunAt }
		}

		const decision = {
			profileId: winner.profileId,
			latencyMs: winner.latencyMs,
			decidedAt: runAt,
		}
		const active = await this.readCurrentConnection()
		const decisionSettings = await this.assertCanContinue(
			generation,
			requiresEnabled,
			options.signal,
		)
		if (active?.state !== 'connected') {
			await this.persistDecision({
				runAt,
				nextRunAt,
				decision,
				generation,
				requiresEnabled,
			})
			return {
				outcome: 'selected',
				probed: profiles.length,
				winner: decision,
				nextRunAt,
			}
		}
		let nextInput = connectionInput(
			freshProfile,
			decisionSettings,
			options.signal,
		)
		if (
			active?.state === 'connected' &&
			active.profile.id === freshProfile.id &&
			(!active.runtime || sameRuntime(active.runtime, nextInput))
		) {
			await this.persistDecision({
				runAt,
				nextRunAt,
				decision,
				generation,
				requiresEnabled,
			})
			return {
				outcome: 'unchanged',
				probed: profiles.length,
				winner: decision,
				nextRunAt,
			}
		}
		await this.dependencies.connection.validate?.(nextInput)
		const switchingSettings = await this.assertCanContinue(
			generation,
			requiresEnabled,
			options.signal,
		)
		const latestInput = connectionInput(
			freshProfile,
			switchingSettings,
			options.signal,
		)
		if (!sameRuntime(nextInput, latestInput)) {
			nextInput = latestInput
			await this.dependencies.connection.validate?.(nextInput)
			await this.assertCanContinue(generation, requiresEnabled, options.signal)
		}
		try {
			emitProgress(options.onProgress, {
				phase: 'switching',
				total: profiles.length,
				winnerLatencyMs: winner.latencyMs,
			})
			await this.dependencies.connection.disconnect()
			await this.assertCanContinue(generation, requiresEnabled, options.signal)
			await this.dependencies.connection.connect(nextInput)
			await this.persistDecision({
				runAt,
				nextRunAt,
				decision,
				generation,
				requiresEnabled,
			})
		} catch (error) {
			emitProgress(options.onProgress, {
				phase: 'restoring',
				total: profiles.length,
			})
			await this.restorePreviousConnection(active, freshSettings)
			throw error
		}
		return {
			outcome: 'connected',
			probed: profiles.length,
			winner: decision,
			nextRunAt,
		}
	}

	private async restorePreviousConnection(
		previous: SmartConnectCurrentConnection | undefined,
		settings: Settings,
	) {
		try {
			await this.dependencies.connection.disconnect()
			if (previous?.state !== 'connected') return
			await this.dependencies.connection.connect(
				previous.runtime
					? { profile: previous.profile, ...previous.runtime }
					: connectionInput(previous.profile, settings),
			)
		} catch {
			// Preserve the original switch error. The connection lifecycle exposes
			// any rollback failure through its own state and logs.
		}
	}

	private async readCurrentConnection() {
		return this.dependencies.connection.readCurrent
			? this.dependencies.connection.readCurrent()
			: this.dependencies.connection.current
	}

	private async persistDecision({
		runAt,
		nextRunAt,
		decision,
		generation,
		requiresEnabled,
	}: {
		readonly runAt: string
		readonly nextRunAt: string
		readonly decision?: SmartConnectScheduleState['lastDecision']
		readonly generation: number
		readonly requiresEnabled: boolean
	}) {
		await this.mutateSettings(async () => {
			const settings = await this.assertCanContinue(generation, requiresEnabled)
			await this.dependencies.settingsStore.write({
				...settings,
				activeProfileId: decision?.profileId ?? settings.activeProfileId,
				smartConnect: {
					...settings.smartConnect,
					enabled: settings.smartConnect?.enabled ?? false,
					lastRunAt: runAt,
					nextRunAt,
					lastDecision: decision ?? settings.smartConnect?.lastDecision,
				},
			})
		})
	}

	private mutateSettings<Result>(
		mutation: (settings: Settings) => Promise<Result>,
	): Promise<Result> {
		return enqueuePacedOperation(this.#settingsQueue, async () => {
			const settings = await this.dependencies.settingsStore.read()
			return mutation(settings)
		})
	}

	private async assertCanContinue(
		generation: number,
		requiresEnabled: boolean,
		signal?: AbortSignal,
	): Promise<Settings> {
		throwIfAborted(signal)
		if (generation !== this.#generation) throw abortError('Smart Connect stopped')
		const settings = await this.dependencies.settingsStore.read()
		throwIfAborted(signal)
		if (generation !== this.#generation) throw abortError('Smart Connect stopped')
		if (requiresEnabled && !settings.smartConnect?.enabled) {
			throw abortError('Smart Connect disabled')
		}
		return settings
	}
}

function pacedOperationQueue(maxSize: number): AsyncQueuer<PacedOperation> {
	return new AsyncQueuer((operation) => operation.execute(), {
		concurrency: 1,
		maxSize,
		throwOnError: false,
	})
}

function enqueuePacedOperation<Result>(
	queue: AsyncQueuer<PacedOperation>,
	operation: () => Promise<Result>,
): Promise<Result> {
	return new Promise((resolve, reject) => {
		const accepted = queue.addItem({
			async execute() {
				try {
					resolve(await operation())
				} catch (error) {
					reject(error)
				}
			},
		})
		if (!accepted) reject(new Error('Smart Connect action queue is full'))
	})
}

function connectionInput(
	profile: ConnectionProfile,
	settings: Settings,
	signal?: AbortSignal,
): SmartConnectConnectionInput {
	return {
		profile,
		mode: settings.connectionMode ?? 'vpn',
		engineId: settings.engineId ?? 'sing-box',
		localPort: settings.localPort,
		signal,
	}
}

function sameRuntime(
	left: SmartConnectRuntimeConfiguration,
	right: SmartConnectRuntimeConfiguration,
): boolean {
	return (
		left.mode === right.mode &&
		left.engineId === right.engineId &&
		left.localPort === right.localPort
	)
}

function isReachableLatency(
	result: LatencyResult,
): result is LatencyResult & { readonly latencyMs: number } {
	return (
		result.reachable &&
		result.error === undefined &&
		result.latencyMs !== undefined &&
		Number.isFinite(result.latencyMs)
	)
}

function compareLatency(
	left: LatencyResult & { readonly latencyMs: number },
	right: LatencyResult & { readonly latencyMs: number },
) {
	const latencyOrder = left.latencyMs - right.latencyMs
	if (latencyOrder !== 0) return latencyOrder
	if (left.profileId === right.profileId) return 0
	return left.profileId < right.profileId ? -1 : 1
}

interface PacedProbeOptions {
	readonly concurrency: number
	readonly wait: number
	readonly signal?: AbortSignal
	readonly onProgress?: (progress: SmartConnectProgress) => void
}

function runPacedProbes(
	profiles: readonly ConnectionProfile[],
	probe: (
		profile: ConnectionProfile,
		signal: AbortSignal,
	) => Promise<LatencyResult>,
	options: PacedProbeOptions,
): Promise<readonly LatencyResult[]> {
	if (profiles.length === 0) return Promise.resolve([])
	return new Promise((resolve, reject) => {
		const controller = new AbortController()
		const results = new Array<LatencyResult>(profiles.length)
		let settled = 0
		let started = 0
		let active = 0
		let finished = false
		const abort = () => {
			if (finished) return
			finished = true
			controller.abort(options.signal?.reason)
			queue.stop()
			queue.clear()
			queue.abort()
			options.signal?.removeEventListener('abort', abort)
			reject(abortError(options.signal?.reason))
		}
		const queue = new AsyncQueuer(
			async ({
				profile,
				index,
			}: {
				profile: ConnectionProfile
				index: number
			}) => {
				throwIfAborted(controller.signal)
				started += 1
				active += 1
				emitProgress(options.onProgress, {
					phase: 'testing',
					active,
					completed: settled,
					started,
					total: profiles.length,
				})
				try {
					results[index] = await probe(profile, controller.signal)
				} catch (error) {
					if (controller.signal.aborted) throw error
					results[index] = {
						profileId: profile.id,
						reachable: false,
						checkedAt: new Date().toISOString(),
						error: error instanceof Error ? error.message : 'Latency probe failed',
					}
				} finally {
					active -= 1
					settled += 1
					emitProgress(options.onProgress, {
						phase: 'testing',
						active,
						completed: settled,
						started,
						total: profiles.length,
					})
				}
			},
			{
				concurrency: options.concurrency,
				wait: options.wait,
				started: false,
				throwOnError: false,
				onSettled: () => {
					if (finished) return
					if (settled !== profiles.length) return
					finished = true
					queue.stop()
					options.signal?.removeEventListener('abort', abort)
					resolve(results)
				},
			},
		)
		if (options.signal?.aborted) {
			abort()
			return
		}
		options.signal?.addEventListener('abort', abort, { once: true })
		profiles.forEach((profile, index) => {
			queue.addItem({ profile, index }, undefined, false)
		})
		queue.start()
	})
}

function throwIfAborted(signal?: AbortSignal): void {
	if (signal?.aborted) throw abortError(signal.reason)
}

function emitProgress(
	listener: SmartConnectRunOptions['onProgress'],
	progress: SmartConnectProgress,
): void {
	try {
		listener?.(progress)
	} catch {
		// Observability must never interrupt a connection decision.
	}
}

function abortError(reason?: unknown) {
	return new DOMException(
		typeof reason === 'string' ? reason : 'Operation canceled',
		'AbortError',
	)
}
