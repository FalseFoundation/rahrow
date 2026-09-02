import type { LatencyResult } from '@rahrow/core/runtime/proxy-engine.ts'
import { Store } from '@tanstack/store'

export interface ProfileWorkProgress {
	readonly completed: number
	readonly pending: number
	readonly total: number
	readonly status: 'idle' | 'running' | 'completed' | 'canceled' | 'failed'
}

interface ProfileSpeedTestState {
	readonly results: Readonly<Record<string, LatencyResult | undefined>>
	readonly testingIds: ReadonlySet<string>
	readonly progress: ProfileWorkProgress
}

const idleProgress: ProfileWorkProgress = {
	completed: 0,
	pending: 0,
	total: 0,
	status: 'idle',
}

const initialState = (): ProfileSpeedTestState => ({
	results: {},
	testingIds: new Set(),
	progress: idleProgress,
})

export const profileSpeedTestStore = new Store<ProfileSpeedTestState>(
	initialState(),
)

let activeController: AbortController | undefined

export function profileSpeedTestResultBatchSize(total: number): number {
	return Math.max(1, Math.ceil(total / 20))
}

export function hydrateProfileSpeedTestResults(
	results: Readonly<Record<string, LatencyResult | undefined>>,
): void {
	profileSpeedTestStore.setState((current) => ({
		...current,
		// In-memory results belong to the newer app session and must survive route remounts.
		results: { ...results, ...current.results },
	}))
}

export function publishProfileSpeedTestResults(
	results: Readonly<Record<string, LatencyResult | undefined>>,
): Readonly<Record<string, LatencyResult | undefined>> {
	const next = { ...profileSpeedTestStore.state.results, ...results }
	profileSpeedTestStore.setState((current) => ({ ...current, results: next }))
	return next
}

export function setProfileSpeedTestProgress(
	progress: ProfileWorkProgress,
): void {
	profileSpeedTestStore.setState((current) => ({ ...current, progress }))
}

export function beginProfileSpeedTest(
	profileIds: readonly string[],
): AbortController {
	activeController?.abort()
	const controller = new AbortController()
	activeController = controller
	profileSpeedTestStore.setState((current) => ({
		...current,
		testingIds: new Set(profileIds),
		progress: {
			completed: 0,
			pending: profileIds.length,
			total: profileIds.length,
			status: 'running',
		},
	}))
	return controller
}

export function finishProfileSpeedTest(controller: AbortController): void {
	if (activeController !== controller) return
	activeController = undefined
	profileSpeedTestStore.setState((current) => ({
		...current,
		testingIds: new Set(),
	}))
}

export function cancelProfileSpeedTest(): void {
	if (!activeController) return
	activeController.abort()
	profileSpeedTestStore.setState((current) => ({
		...current,
		testingIds: new Set(),
		progress: { ...current.progress, status: 'canceled' },
	}))
}

export function resetProfileSpeedTestStore(): void {
	activeController?.abort()
	activeController = undefined
	profileSpeedTestStore.setState(() => initialState())
}
