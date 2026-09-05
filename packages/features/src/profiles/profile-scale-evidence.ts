export type ProfileScaleDeviceClass = 'desktop' | 'mobile'

export interface ProfileScaleSamples {
	readonly importParseMs: readonly number[]
	readonly persistenceMs: readonly number[]
	readonly queryInvalidationMs: readonly number[]
	readonly initialRenderMs: readonly number[]
	readonly scrollFps: readonly number[]
	readonly searchLatencyMs: readonly number[]
	readonly memoryMiB: readonly number[]
	readonly appStartupMs: readonly number[]
}

export interface ProfileScaleEvidence {
	readonly deviceClass: ProfileScaleDeviceClass
	readonly fixtureCount: number
	readonly samples: ProfileScaleSamples
	readonly observedRefreshConcurrency: number
	readonly previousDataStayedUsable: boolean
}

export interface ProfileScaleMetricSummary {
	readonly median: number
	readonly relativeRange: number
	readonly sampleCount: number
}

type ProfileScaleMetric = keyof ProfileScaleSamples

interface ProfileScaleBudget {
	readonly maximums: Readonly<
		Record<Exclude<ProfileScaleMetric, 'scrollFps'>, number>
	>
	readonly minimumScrollFps: number
	readonly maxRefreshConcurrency: number
}

export const PROFILE_SCALE_BUDGETS = {
	desktop: {
		maximums: {
			importParseMs: 1_000,
			persistenceMs: 2_000,
			queryInvalidationMs: 50,
			initialRenderMs: 200,
			searchLatencyMs: 50,
			memoryMiB: 256,
			appStartupMs: 1_500,
		},
		minimumScrollFps: 55,
		maxRefreshConcurrency: 2,
	},
	mobile: {
		maximums: {
			importParseMs: 2_000,
			persistenceMs: 4_000,
			queryInvalidationMs: 100,
			initialRenderMs: 350,
			searchLatencyMs: 100,
			memoryMiB: 192,
			appStartupMs: 2_500,
		},
		minimumScrollFps: 45,
		maxRefreshConcurrency: 2,
	},
} as const satisfies Record<ProfileScaleDeviceClass, ProfileScaleBudget>

export const PROFILE_SCALE_MINIMUM_SAMPLES = 5
export const PROFILE_SCALE_MAXIMUM_RELATIVE_RANGE = 0.15

export interface ProfileScaleEvidenceResult {
	readonly passed: boolean
	readonly stable: boolean
	readonly summary: Readonly<
		Record<ProfileScaleMetric, ProfileScaleMetricSummary>
	>
	readonly violations: readonly string[]
}

function summarizeSamples(
	samples: readonly number[],
): ProfileScaleMetricSummary {
	const sorted = [...samples].sort((left, right) => left - right)
	const middle = Math.floor(sorted.length / 2)
	const median =
		sorted.length === 0
			? Number.NaN
			: sorted.length % 2 === 0
				? ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2
				: (sorted[middle] ?? 0)
	const minimum = sorted[0] ?? Number.NaN
	const maximum = sorted.at(-1) ?? Number.NaN
	const relativeRange =
		Number.isFinite(median) && median > 0
			? (maximum - minimum) / median
			: Number.POSITIVE_INFINITY

	return { median, relativeRange, sampleCount: samples.length }
}

export function evaluateProfileScaleEvidence(
	evidence: ProfileScaleEvidence,
): ProfileScaleEvidenceResult {
	const budget = PROFILE_SCALE_BUDGETS[evidence.deviceClass]
	const metricNames = Object.keys(evidence.samples) as ProfileScaleMetric[]
	const summary = Object.fromEntries(
		metricNames.map((metric) => [
			metric,
			summarizeSamples(evidence.samples[metric]),
		]),
	) as unknown as Record<ProfileScaleMetric, ProfileScaleMetricSummary>
	const violations: string[] = []

	for (const metric of metricNames) {
		const metricSummary = summary[metric]
		if (metricSummary.sampleCount < PROFILE_SCALE_MINIMUM_SAMPLES) {
			violations.push(`${metric}:insufficient-samples`)
			continue
		}
		if (
			!Number.isFinite(metricSummary.relativeRange) ||
			metricSummary.relativeRange > PROFILE_SCALE_MAXIMUM_RELATIVE_RANGE
		) {
			violations.push(`${metric}:unstable`)
			continue
		}
		const exceedsBudget =
			metric === 'scrollFps'
				? metricSummary.median < budget.minimumScrollFps
				: metricSummary.median > budget.maximums[metric]
		if (exceedsBudget) violations.push(`${metric}:budget`)
	}

	if (evidence.observedRefreshConcurrency > budget.maxRefreshConcurrency) {
		violations.push('refreshConcurrency:budget')
	}
	if (!evidence.previousDataStayedUsable) {
		violations.push('previousData:unavailable')
	}

	const stable = violations.every(
		(violation) =>
			!violation.endsWith(':unstable') &&
			!violation.endsWith(':insufficient-samples'),
	)
	return {
		passed: stable && violations.length === 0,
		stable,
		summary,
		violations,
	}
}
