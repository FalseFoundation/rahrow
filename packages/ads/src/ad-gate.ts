import { z } from 'zod'

const MIN_FORCED_VISIBLE_MS = 10_000
const MAX_FORCED_VISIBLE_MS = 15_000
const MIN_SELECTIONS_PER_AD = 3
const MAX_QUEUED_OBLIGATIONS = 8
const PING_ACTIONS_PER_AD = 10
export const AD_VIEW_COOLDOWN_MS = 5 * 60 * 1_000

export type AdTrigger =
	| 'profile-selection'
	| 'connection-success'
	| 'ping-actions'
	| 'cleanup-success'
	| 'backup-success'
export type AdObligationStatus = 'pending' | 'presenting'
export type AdCompletionOutcome =
	| 'closed'
	| 'provider-dismissed'
	| 'provider-failed'
	| 'provider-unavailable'

export type AdAction =
	| 'profile-ping'
	| 'subscription-ping'
	| 'cleanup'
	| 'backup-export'
	| 'backup-import'
export type AdActionOutcome =
	| 'completed'
	| 'failed'
	| 'cancelled'
	| 'permission-denied'
	| 'no-op'

export interface AdActionEvent {
	/** Stable operation ID reused by retries and remounts. */
	readonly id: string
	readonly action: AdAction
	readonly outcome: AdActionOutcome
}

export interface AdActionRecordResult {
	readonly status: 'recorded' | 'duplicate' | 'ignored'
	readonly obligation: AdObligation | null
}

export function createAdActionEventId(action: AdAction): string {
	return `${action}:${defaultId()}`
}

export interface AdObligation {
	readonly id: string
	readonly trigger: AdTrigger
	readonly status: AdObligationStatus
	readonly createdAt: number
	readonly minimumVisibleMs: number
	readonly attempts: number
	readonly startedAt?: number
}

export interface AdGateSnapshot {
	readonly isInitialized: boolean
	readonly policy: AdGatePolicy
	readonly profileSelectionCount: number
	readonly pingActionCount: number
	readonly obligations: readonly AdObligation[]
	/** Wall-clock time when another queued ad may be presented. */
	readonly cooldownUntil?: number
	readonly lastCompletion?: AdCompletion
}

export interface AdCompletion {
	readonly trigger: AdTrigger
	readonly outcome: AdCompletionOutcome
	readonly attempts: number
	readonly completedAt: number
}

export interface AdGatePolicy {
	readonly selectionsPerAd: number
	readonly pingActionsPerAd: number
	readonly minimumVisibleMs: number
}

export interface AdGateStorage {
	read(): Promise<string | null>
	write(value: string): Promise<void>
}

export interface AdGateControllerOptions {
	readonly storage: AdGateStorage
	readonly policy?: Partial<AdGatePolicy>
	readonly createId?: () => string
	readonly now?: () => number
}

export const DEFAULT_AD_GATE_POLICY: AdGatePolicy = {
	selectionsPerAd: 3,
	pingActionsPerAd: PING_ACTIONS_PER_AD,
	minimumVisibleMs: MIN_FORCED_VISIBLE_MS,
}

const AdTriggerSchema = z.enum([
	'profile-selection',
	'connection-success',
	'ping-actions',
	'cleanup-success',
	'backup-success',
])

const AdObligationSchema = z.object({
	id: z.string().min(1),
	trigger: AdTriggerSchema,
	status: z.enum(['pending', 'presenting']),
	createdAt: z.number().finite().nonnegative(),
	minimumVisibleMs: z.number().finite(),
	attempts: z.number().int().nonnegative(),
	startedAt: z.number().finite().nonnegative().optional(),
})

const PersistedAdGateStateV1Schema = z.object({
	version: z.literal(1),
	profileSelectionCount: z.number().int().nonnegative(),
	obligations: z
		.array(
			AdObligationSchema.extend({
				trigger: z.enum(['profile-selection', 'connection-success']),
			}),
		)
		.max(MAX_QUEUED_OBLIGATIONS),
	lastCompletion: z
		.object({
			trigger: z.enum(['profile-selection', 'connection-success']),
			outcome: z.enum([
				'closed',
				'provider-dismissed',
				'provider-failed',
				'provider-unavailable',
			]),
			attempts: z.number().int().nonnegative(),
			completedAt: z.number().finite().nonnegative(),
		})
		.optional(),
})

const PersistedAdGateStateV2Schema = z.object({
	version: z.literal(2),
	profileSelectionCount: z.number().int().nonnegative(),
	pingActionCount: z.number().int().nonnegative(),
	processedActionEventIds: z.array(z.string().min(1)),
	obligations: z.array(AdObligationSchema).max(MAX_QUEUED_OBLIGATIONS),
	lastCompletion: z
		.object({
			trigger: AdTriggerSchema,
			outcome: z.enum([
				'closed',
				'provider-dismissed',
				'provider-failed',
				'provider-unavailable',
			]),
			attempts: z.number().int().nonnegative(),
			completedAt: z.number().finite().nonnegative(),
		})
		.optional(),
})

const PersistedAdGateStateSchema = z.object({
	version: z.literal(3),
	profileSelectionCount: z.number().int().nonnegative(),
	pingActionCount: z.number().int().nonnegative(),
	processedActionEventIds: z.array(z.string().min(1)),
	obligations: z.array(AdObligationSchema).max(MAX_QUEUED_OBLIGATIONS),
	lastSuccessfulViewAt: z.number().finite().nonnegative().optional(),
	lastCompletion: z
		.object({
			trigger: AdTriggerSchema,
			outcome: z.enum([
				'closed',
				'provider-dismissed',
				'provider-failed',
				'provider-unavailable',
			]),
			attempts: z.number().int().nonnegative(),
			completedAt: z.number().finite().nonnegative(),
		})
		.optional(),
})

type PersistedAdGateState = z.infer<typeof PersistedAdGateStateSchema>

const EMPTY_STATE: PersistedAdGateState = {
	version: 3,
	profileSelectionCount: 0,
	pingActionCount: 0,
	processedActionEventIds: [],
	obligations: [],
}

export class AdGateController {
	private readonly storage: AdGateStorage
	private readonly policy: AdGatePolicy
	private readonly createId: () => string
	private readonly now: () => number
	private readonly listeners = new Set<(snapshot: AdGateSnapshot) => void>()
	private state: PersistedAdGateState = EMPTY_STATE
	private isInitialized = false
	private initializePromise: Promise<AdGateSnapshot> | undefined
	private mutation = Promise.resolve()

	constructor(options: AdGateControllerOptions) {
		this.storage = options.storage
		this.policy = normalizePolicy(options.policy)
		this.createId = options.createId ?? defaultId
		this.now = options.now ?? Date.now
	}

	initialize(): Promise<AdGateSnapshot> {
		if (this.isInitialized) return Promise.resolve(this.snapshot())
		if (this.initializePromise) return this.initializePromise

		this.initializePromise = this.enqueue(async () => {
			const parsed = await readState(this.storage)
			const recovered = recoverInterruptedPresentations(
				parsed,
				this.policy,
				this.now(),
			)
			this.state = recovered
			this.isInitialized = true
			await this.persist()
			this.emit()
			return this.snapshot()
		})

		return this.initializePromise
	}

	snapshot(): AdGateSnapshot {
		const cooldownUntil = this.state.lastSuccessfulViewAt
			? this.state.lastSuccessfulViewAt + AD_VIEW_COOLDOWN_MS
			: undefined
		return {
			isInitialized: this.isInitialized,
			policy: this.policy,
			profileSelectionCount: this.state.profileSelectionCount,
			pingActionCount: this.state.pingActionCount,
			obligations: this.state.obligations,
			...(cooldownUntil ? { cooldownUntil } : {}),
			...(this.state.lastCompletion
				? { lastCompletion: this.state.lastCompletion }
				: {}),
		}
	}

	subscribe(listener: (snapshot: AdGateSnapshot) => void): () => void {
		this.listeners.add(listener)
		return () => this.listeners.delete(listener)
	}

	async recordProfileSelection(
		previousProfileId: string,
		nextProfileId: string,
	): Promise<AdObligation | null> {
		await this.initialize()
		if (
			!previousProfileId ||
			!nextProfileId ||
			previousProfileId === nextProfileId
		) {
			return null
		}

		return this.enqueue(async () => {
			const nextCount = this.state.profileSelectionCount + 1
			if (nextCount < this.policy.selectionsPerAd) {
				this.state = { ...this.state, profileSelectionCount: nextCount }
				await this.persistAndEmit()
				return null
			}

			const obligation = this.createObligation('profile-selection')
			this.state = {
				...this.state,
				profileSelectionCount: 0,
				obligations: appendBounded(this.state.obligations, obligation),
			}
			await this.persistAndEmit()
			return obligation
		})
	}

	async recordConnectionSuccess(): Promise<AdObligation> {
		await this.initialize()
		return this.enqueue(async () => {
			const obligation = this.createObligation('connection-success')
			this.state = {
				...this.state,
				obligations: appendBounded(this.state.obligations, obligation),
			}
			await this.persistAndEmit()
			return obligation
		})
	}

	async recordActionEvent(event: AdActionEvent): Promise<AdActionRecordResult> {
		await this.initialize()
		const eventId = event.id.trim()
		if (!eventId) throw new Error('Ad action event ID must not be empty.')

		return this.enqueue(async () => {
			if (this.state.processedActionEventIds.includes(eventId)) {
				return { status: 'duplicate', obligation: null }
			}

			let pingActionCount = this.state.pingActionCount
			let obligation: AdObligation | null = null
			if (event.outcome === 'completed') {
				if (
					event.action === 'profile-ping' ||
					event.action === 'subscription-ping'
				) {
					pingActionCount += 1
					if (pingActionCount === PING_ACTIONS_PER_AD) {
						pingActionCount = 0
						obligation = this.createObligation('ping-actions')
					}
				} else {
					obligation = this.createObligation(
						event.action === 'cleanup' ? 'cleanup-success' : 'backup-success',
					)
				}
			}

			const nextState: PersistedAdGateState = {
				...this.state,
				pingActionCount,
				processedActionEventIds: [...this.state.processedActionEventIds, eventId],
				obligations: obligation
					? appendBounded(this.state.obligations, obligation)
					: [...this.state.obligations],
			}
			await this.writeState(nextState)
			this.state = nextState
			this.emit()
			return {
				status: event.outcome === 'completed' ? 'recorded' : 'ignored',
				obligation,
			}
		})
	}

	async claimNext(): Promise<AdObligation | null> {
		await this.initialize()
		return this.enqueue(async () => {
			const now = this.now()
			if (
				this.state.lastSuccessfulViewAt !== undefined &&
				now < this.state.lastSuccessfulViewAt
			) {
				this.state = { ...this.state, lastSuccessfulViewAt: now }
				await this.persistAndEmit()
				return null
			}
			if (
				this.state.lastSuccessfulViewAt !== undefined &&
				now - this.state.lastSuccessfulViewAt < AD_VIEW_COOLDOWN_MS
			) {
				return null
			}
			const first = this.state.obligations[0]
			if (!first) return null
			if (first.status === 'presenting') return null

			const claimed: AdObligation = {
				...first,
				status: 'presenting',
				attempts: first.attempts + 1,
				startedAt: now,
			}
			this.state = {
				...this.state,
				obligations: [claimed, ...this.state.obligations.slice(1)],
			}
			await this.persistAndEmit()
			return claimed
		})
	}

	async retry(id: string): Promise<void> {
		await this.initialize()
		await this.enqueue(async () => {
			const obligation = this.state.obligations[0]
			if (!obligation || obligation.id !== id) return
			this.state = {
				...this.state,
				obligations: [
					{ ...obligation, status: 'pending', startedAt: undefined },
					...this.state.obligations.slice(1),
				],
			}
			await this.persistAndEmit()
		})
	}

	async complete(
		id: string,
		outcome: AdCompletionOutcome = 'closed',
	): Promise<void> {
		await this.initialize()
		await this.enqueue(async () => {
			const index = this.state.obligations.findIndex(
				(obligation) => obligation.id === id,
			)
			if (index < 0) return
			const completed = this.state.obligations[index]
			if (!completed) return
			const completedAt = this.now()
			const didWatch =
				completed.status === 'presenting' &&
				(outcome === 'closed' || outcome === 'provider-dismissed')
			this.state = {
				...this.state,
				...(didWatch ? { lastSuccessfulViewAt: completedAt } : {}),
				lastCompletion: {
					trigger: completed.trigger,
					outcome,
					attempts: completed.attempts,
					completedAt,
				},
				obligations: this.state.obligations.filter(
					(obligation) => obligation.id !== id,
				),
			}
			await this.persistAndEmit()
		})
	}

	private createObligation(trigger: AdTrigger): AdObligation {
		return {
			id: this.createId(),
			trigger,
			status: 'pending',
			createdAt: this.now(),
			minimumVisibleMs: this.policy.minimumVisibleMs,
			attempts: 0,
		}
	}

	private async persistAndEmit(): Promise<void> {
		await this.persist()
		this.emit()
	}

	private async persist(): Promise<void> {
		await this.writeState(this.state)
	}

	private async writeState(state: PersistedAdGateState): Promise<void> {
		await this.storage.write(`${JSON.stringify(state, null, 2)}\n`)
	}

	private emit(): void {
		const snapshot = this.snapshot()
		for (const listener of this.listeners) listener(snapshot)
	}

	private enqueue<T>(operation: () => Promise<T>): Promise<T> {
		const result = this.mutation.then(operation)
		this.mutation = result.then(
			() => undefined,
			() => undefined,
		)
		return result
	}
}

async function readState(
	storage: AdGateStorage,
): Promise<PersistedAdGateState> {
	try {
		const raw = await storage.read()
		if (!raw) return EMPTY_STATE
		const input: unknown = JSON.parse(raw)
		const current = PersistedAdGateStateSchema.safeParse(input)
		if (current.success) return current.data

		const previous = PersistedAdGateStateV2Schema.safeParse(input)
		if (previous.success) return { ...previous.data, version: 3 }

		const legacy = PersistedAdGateStateV1Schema.safeParse(input)
		return legacy.success
			? {
					...legacy.data,
					version: 3,
					pingActionCount: 0,
					processedActionEventIds: [],
				}
			: EMPTY_STATE
	} catch {
		return EMPTY_STATE
	}
}

function recoverInterruptedPresentations(
	state: PersistedAdGateState,
	policy: AdGatePolicy,
	now: number,
): PersistedAdGateState {
	return {
		...state,
		version: 3,
		...(state.lastSuccessfulViewAt !== undefined &&
		state.lastSuccessfulViewAt > now
			? { lastSuccessfulViewAt: now }
			: {}),
		profileSelectionCount: Math.min(
			state.profileSelectionCount,
			policy.selectionsPerAd - 1,
		),
		obligations: state.obligations.map((obligation) => ({
			...obligation,
			status: 'pending',
			minimumVisibleMs: clampVisibleMs(obligation.minimumVisibleMs),
			startedAt: undefined,
		})),
	}
}

function appendBounded(
	obligations: readonly AdObligation[],
	obligation: AdObligation,
): AdObligation[] {
	if (obligations.length >= MAX_QUEUED_OBLIGATIONS) return [...obligations]
	return [...obligations, obligation]
}

function normalizePolicy(policy?: Partial<AdGatePolicy>): AdGatePolicy {
	return {
		selectionsPerAd: Math.max(
			MIN_SELECTIONS_PER_AD,
			Math.trunc(
				policy?.selectionsPerAd ?? DEFAULT_AD_GATE_POLICY.selectionsPerAd,
			),
		),
		pingActionsPerAd: PING_ACTIONS_PER_AD,
		minimumVisibleMs: clampVisibleMs(
			policy?.minimumVisibleMs ?? DEFAULT_AD_GATE_POLICY.minimumVisibleMs,
		),
	}
}

function clampVisibleMs(value: number): number {
	if (!Number.isFinite(value)) return MIN_FORCED_VISIBLE_MS
	return Math.min(MAX_FORCED_VISIBLE_MS, Math.max(MIN_FORCED_VISIBLE_MS, value))
}

function defaultId(): string {
	return (
		globalThis.crypto?.randomUUID?.() ??
		`ad-${Date.now()}-${Math.random().toString(36).slice(2)}`
	)
}
