import { describe, expect, it } from 'vitest'
import {
	evaluateProfileScaleEvidence,
	PROFILE_SCALE_BUDGETS,
	type ProfileScaleEvidence,
} from './profile-scale-evidence.ts'

const stableDesktopEvidence = {
	deviceClass: 'desktop',
	fixtureCount: 10_000,
	samples: {
		importParseMs: [610, 620, 615, 618, 612],
		persistenceMs: [1_180, 1_200, 1_190, 1_195, 1_185],
		queryInvalidationMs: [22, 23, 22, 24, 23],
		initialRenderMs: [115, 118, 116, 117, 115],
		scrollFps: [58, 59, 58, 60, 59],
		searchLatencyMs: [34, 35, 34, 36, 35],
		memoryMiB: [145, 146, 145, 147, 146],
		appStartupMs: [820, 830, 825, 828, 824],
	},
	observedRefreshConcurrency: 2,
	previousDataStayedUsable: true,
} satisfies ProfileScaleEvidence

describe('profile scale evidence', () => {
	it('accepts reproducible evidence inside the desktop budget', () => {
		const result = evaluateProfileScaleEvidence(stableDesktopEvidence)

		expect(result.stable).toBe(true)
		expect(result.passed).toBe(true)
		expect(result.violations).toEqual([])
		expect(result.summary.importParseMs.median).toBe(615)
	})

	it('reports unstable samples separately from budget failures', () => {
		const result = evaluateProfileScaleEvidence({
			...stableDesktopEvidence,
			samples: {
				...stableDesktopEvidence.samples,
				searchLatencyMs: [10, 12, 80, 11, 75],
			},
		})

		expect(result.stable).toBe(false)
		expect(result.passed).toBe(false)
		expect(result.violations).toContain('searchLatencyMs:unstable')
	})

	it('enforces mobile-class limits and refresh continuity', () => {
		const result = evaluateProfileScaleEvidence({
			...stableDesktopEvidence,
			deviceClass: 'mobile',
			observedRefreshConcurrency:
				PROFILE_SCALE_BUDGETS.mobile.maxRefreshConcurrency + 1,
			previousDataStayedUsable: false,
		})

		expect(result.passed).toBe(false)
		expect(result.violations).toEqual(
			expect.arrayContaining([
				'refreshConcurrency:budget',
				'previousData:unavailable',
			]),
		)
	})
})
