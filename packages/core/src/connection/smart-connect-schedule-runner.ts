import type {
	SmartConnectOrchestrator,
	SmartConnectRunResult,
} from './smart-connect.ts'

const MAX_TIMER_DELAY_MS = 2_147_483_647
const DEFAULT_RETRY_DELAY_MS = 5 * 60 * 1_000

export interface SmartConnectScheduleTimer {
	now(): number
	set(delay: number, callback: () => void): unknown
	clear(handle: unknown): void
}

export interface SmartConnectScheduleOperation {
	cancel?(reason?: string): void
	status(): ReturnType<SmartConnectOrchestrator['status']>
	runIfDue(options?: {
		readonly signal?: AbortSignal
	}): Promise<SmartConnectRunResult>
}

export interface SmartConnectScheduleRunnerOptions {
	readonly timer?: SmartConnectScheduleTimer
	readonly retryDelay?: number
	readonly onError?: (error: unknown) => void
}

/**
 * Keeps one foreground/daemon scheduler for the persisted Smart Connect policy.
 * Mobile hosts call resume when the app becomes active; native tunnel ownership
 * remains outside this runner because suspended webviews cannot promise timers.
 */
export class SmartConnectScheduleRunner {
	readonly #timer: SmartConnectScheduleTimer
	readonly #retryDelay: number
	readonly #onError: (error: unknown) => void
	#started = false
	#timerHandle: unknown
	#active: Promise<void> | undefined
	#controller: AbortController | undefined

	constructor(
		private readonly operation: SmartConnectScheduleOperation,
		options: SmartConnectScheduleRunnerOptions = {},
	) {
		this.#timer = options.timer ?? browserScheduleTimer
		this.#retryDelay = Math.max(
			1,
			Math.floor(options.retryDelay ?? DEFAULT_RETRY_DELAY_MS),
		)
		this.#onError = options.onError ?? (() => undefined)
	}

	start(): Promise<void> {
		this.#started = true
		return this.#trigger()
	}

	resume(): Promise<void> {
		if (!this.#started) return Promise.resolve()
		return this.#trigger()
	}

	stop(): void {
		this.#started = false
		this.#clearTimer()
		this.#controller?.abort('Smart Connect scheduler stopped')
		this.operation.cancel?.('Smart Connect scheduler stopped')
	}

	#trigger(): Promise<void> {
		if (this.#active) return this.#active
		this.#clearTimer()
		const active = this.#execute()
		this.#active = active
		void active.finally(() => {
			if (this.#active === active) this.#active = undefined
		})
		return active
	}

	async #execute(): Promise<void> {
		this.#controller = new AbortController()
		try {
			const result = await this.operation.runIfDue({
				signal: this.#controller.signal,
			})
			if (!this.#started) return
			const state = await this.operation.status()
			if (!state.enabled) return
			this.#schedule(result.nextRunAt ?? state.nextRunAt)
		} catch (error) {
			if (!this.#controller.signal.aborted) this.#onError(error)
			if (this.#started) this.#scheduleAfter(this.#retryDelay)
		} finally {
			this.#controller = undefined
		}
	}

	#schedule(nextRunAt: string | undefined): void {
		const parsed = nextRunAt ? Date.parse(nextRunAt) : Number.NaN
		const delay = Number.isFinite(parsed)
			? Math.max(0, parsed - this.#timer.now())
			: 0
		this.#scheduleAfter(delay)
	}

	#scheduleAfter(delay: number): void {
		if (!this.#started) return
		this.#timerHandle = this.#timer.set(
			Math.min(delay, MAX_TIMER_DELAY_MS),
			() => {
				this.#timerHandle = undefined
				void this.#trigger()
			},
		)
	}

	#clearTimer(): void {
		if (this.#timerHandle === undefined) return
		this.#timer.clear(this.#timerHandle)
		this.#timerHandle = undefined
	}
}

const browserScheduleTimer: SmartConnectScheduleTimer = {
	now: () => Date.now(),
	set: (delay, callback) => globalThis.setTimeout(callback, delay),
	clear: (handle) =>
		globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
}
