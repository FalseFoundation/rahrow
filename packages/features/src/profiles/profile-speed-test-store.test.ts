import { beforeEach, describe, expect, it } from 'vitest'
import {
	beginProfileSpeedTest,
	cancelProfileSpeedTest,
	finishProfileSpeedTest,
	hydrateProfileSpeedTestResults,
	profileSpeedTestResultBatchSize,
	profileSpeedTestStore,
	publishProfileSpeedTestResults,
	resetProfileSpeedTestStore,
	setProfileSpeedTestProgress,
} from './profile-speed-test-store.ts'

describe('profile speed-test session store', () => {
	beforeEach(() => resetProfileSpeedTestStore())

	it('keeps active progress and results outside the Connections route lifetime', () => {
		const controller = beginProfileSpeedTest(['alpha', 'beta'])
		publishProfileSpeedTestResults({
			alpha: {
				profileId: 'alpha',
				reachable: true,
				latencyMs: 24,
				checkedAt: '2026-08-31T12:00:00.000Z',
			},
		})
		setProfileSpeedTestProgress({
			completed: 1,
			pending: 1,
			total: 2,
			status: 'running',
		})

		// Rehydrating after route navigation must not replace the newer live session.
		hydrateProfileSpeedTestResults({})
		expect(profileSpeedTestStore.state.progress.status).toBe('running')
		expect(profileSpeedTestStore.state.testingIds).toEqual(
			new Set(['alpha', 'beta']),
		)
		expect(profileSpeedTestStore.state.results.alpha?.latencyMs).toBe(24)

		cancelProfileSpeedTest()
		expect(controller.signal.aborted).toBe(true)
		expect(profileSpeedTestStore.state.progress.status).toBe('canceled')
		expect(profileSpeedTestStore.state.testingIds.size).toBe(0)
		finishProfileSpeedTest(controller)
		expect(profileSpeedTestStore.state.testingIds.size).toBe(0)
	})

	it('bounds expensive result publication to about twenty collection updates', () => {
		expect(profileSpeedTestResultBatchSize(10)).toBe(1)
		expect(profileSpeedTestResultBatchSize(10_000)).toBe(500)
	})
})
