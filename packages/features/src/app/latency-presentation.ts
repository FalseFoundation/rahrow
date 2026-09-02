export interface LatencyProbeResult {
	readonly reachable?: boolean
	readonly latencyMs?: number
	readonly error?: string
}

export type LatencyPresentation =
	| {
			readonly kind: 'measured'
			readonly label: string
			readonly value: number
	  }
	| {
			readonly kind:
				| 'canceled'
				| 'error'
				| 'timeout'
				| 'unavailable'
				| 'unreachable'
			readonly label: string
			readonly value: null
	  }

const CANCELED_PATTERN = /\b(?:abort(?:ed)?|cancel(?:ed|led)?)\b/iu
const TIMEOUT_PATTERN = /\b(?:timed?\s*out|timeout)\b/iu

export function presentLatency(
	input?: LatencyProbeResult,
): LatencyPresentation {
	const error = input?.error?.trim()

	if (error && CANCELED_PATTERN.test(error))
		return { kind: 'canceled', label: translate('latency.canceled'), value: null }
	if (error && TIMEOUT_PATTERN.test(error))
		return { kind: 'timeout', label: translate('latency.timeout'), value: null }
	if (input?.latencyMs === 0)
		return { kind: 'timeout', label: translate('latency.timeout'), value: null }
	if (error)
		return { kind: 'error', label: translate('latency.failed'), value: null }
	if (input?.reachable === false)
		return {
			kind: 'unreachable',
			label: translate('latency.unreachable'),
			value: null,
		}
	if (
		input?.latencyMs === undefined ||
		!Number.isFinite(input.latencyMs) ||
		input.latencyMs < 0
	) {
		return {
			kind: 'unavailable',
			label: translate('latency.unavailable'),
			value: null,
		}
	}

	return {
		kind: 'measured',
		label: translate('latency.measured', { value: input.latencyMs }),
		value: input.latencyMs,
	}
}

const LATENCY_KIND_RANK: Record<LatencyPresentation['kind'], number> = {
	measured: 0,
	timeout: 1,
	canceled: 2,
	error: 3,
	unreachable: 4,
	unavailable: 5,
}

export function compareLatencyResults(
	left?: LatencyProbeResult,
	right?: LatencyProbeResult,
): number {
	const leftPresentation = presentLatency(left)
	const rightPresentation = presentLatency(right)
	const rankDifference =
		LATENCY_KIND_RANK[leftPresentation.kind] -
		LATENCY_KIND_RANK[rightPresentation.kind]
	if (rankDifference !== 0) return rankDifference
	if (
		leftPresentation.kind === 'measured' &&
		rightPresentation.kind === 'measured'
	) {
		return leftPresentation.value - rightPresentation.value
	}
	return leftPresentation.label.localeCompare(rightPresentation.label)
}

import { translate } from './app-i18n.tsx'
