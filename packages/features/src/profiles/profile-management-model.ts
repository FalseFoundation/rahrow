import type {
	Clipboard,
	QrDecoder,
	QrEncoder,
	Share,
} from '@rahrow/core/platform/capabilities.ts'

import {
	type LatencyProbeResult,
	presentLatency,
} from '../app/latency-presentation.ts'

export interface ProfileManagementCapabilities {
	readonly clipboard: Clipboard
	readonly share?: Share
	readonly qrEncoder: QrEncoder
	readonly qrDecoder?: QrDecoder
}

export function formatLatencyResult(input: LatencyProbeResult): string {
	return `Latency test: ${presentLatency(input).label}`
}
