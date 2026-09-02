import type {
	SmartConnectOrchestrator,
	SmartConnectProgress,
	SmartConnectRunResult,
} from '@rahrow/core/connection/smart-connect.ts'
import type { SmartConnectScheduleRunner } from '@rahrow/core/connection/smart-connect-schedule-runner.ts'
import type { SmartConnectScheduleState } from '@rahrow/core/storage/json-store.ts'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface SmartConnectControl {
	readonly orchestrator: Pick<
		SmartConnectOrchestrator,
		'status' | 'start' | 'stop' | 'run'
	>
	readonly schedule: Pick<SmartConnectScheduleRunner, 'resume'>
}

export interface SmartConnectViewState {
	readonly enabled: boolean
	readonly isLoading: boolean
	readonly status:
		| 'unavailable'
		| 'loading'
		| 'idle'
		| 'running'
		| 'success'
		| 'error'
	readonly progress?: SmartConnectProgress
	readonly outcome?: SmartConnectRunResult['outcome']
	readonly probed?: number
	readonly winnerLatencyMs?: number
	readonly nextRunAt?: string
}

const unavailableState: SmartConnectViewState = {
	enabled: false,
	isLoading: false,
	status: 'unavailable',
}

function scheduledState(
	schedule: SmartConnectScheduleState,
): SmartConnectViewState {
	return {
		enabled: schedule.enabled,
		isLoading: false,
		status: 'idle',
		nextRunAt: schedule.nextRunAt,
	}
}

export function useSmartConnect(capability: SmartConnectControl | undefined) {
	const [state, setState] = useState<SmartConnectViewState>(() =>
		capability
			? { enabled: false, isLoading: true, status: 'loading' }
			: unavailableState,
	)
	const activeController = useRef<AbortController | undefined>(undefined)

	useEffect(() => {
		activeController.current?.abort('Smart Connect surface changed')
		activeController.current = undefined
		if (!capability) {
			setState(unavailableState)
			return
		}
		let active = true
		setState({ enabled: false, isLoading: true, status: 'loading' })
		void capability.orchestrator.status().then(
			(schedule) => {
				if (active) setState(scheduledState(schedule))
			},
			() => {
				if (active) {
					setState({ enabled: false, isLoading: false, status: 'error' })
				}
			},
		)
		return () => {
			active = false
			activeController.current?.abort('Smart Connect surface closed')
		}
	}, [capability])

	const run = useCallback(async () => {
		if (!capability || activeController.current) return
		const controller = new AbortController()
		activeController.current = controller
		setState((current) => ({
			...current,
			enabled: true,
			isLoading: false,
			status: 'running',
			outcome: undefined,
			progress: { phase: 'queued', total: 0 },
		}))
		try {
			const result = await capability.orchestrator.run({
				signal: controller.signal,
				onProgress: (progress) => {
					if (controller.signal.aborted) return
					setState((current) => ({ ...current, progress }))
				},
			})
			if (controller.signal.aborted) return
			setState((current) => ({
				...current,
				enabled: true,
				status: 'success',
				progress: undefined,
				outcome: result.outcome,
				probed: result.probed,
				winnerLatencyMs: result.winner?.latencyMs,
				nextRunAt: result.nextRunAt,
			}))
		} catch (error) {
			if (controller.signal.aborted || isAbortError(error)) {
				setState((current) => ({
					...current,
					status: 'idle',
					progress: undefined,
				}))
				return
			}
			setState((current) => ({
				...current,
				status: 'error',
				progress: undefined,
			}))
		} finally {
			try {
				await capability.schedule.resume()
			} catch {
				// The persisted policy remains the source of truth. Native lifecycle
				// recovery will retry scheduling when this surface resumes.
			}
			if (activeController.current === controller) {
				activeController.current = undefined
			}
		}
	}, [capability])

	const start = useCallback(async () => {
		if (!capability) return
		try {
			const schedule = await capability.orchestrator.start()
			setState(scheduledState(schedule))
			await run()
		} catch {
			setState((current) => ({
				...current,
				enabled: false,
				isLoading: false,
				status: 'error',
				progress: undefined,
			}))
		}
	}, [capability, run])

	const stop = useCallback(async () => {
		if (!capability) return
		activeController.current?.abort('Smart Connect disabled')
		try {
			const schedule = await capability.orchestrator.stop()
			setState(scheduledState(schedule))
		} catch {
			setState((current) => ({
				...current,
				isLoading: false,
				status: 'error',
				progress: undefined,
			}))
		}
	}, [capability])

	const cancel = useCallback(() => {
		activeController.current?.abort('Smart Connect run canceled')
	}, [])

	return {
		state,
		actions: { start, run, stop, cancel },
	}
}

function isAbortError(error: unknown): boolean {
	return error instanceof DOMException && error.name === 'AbortError'
}
