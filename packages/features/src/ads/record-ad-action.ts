import type { AdActionEvent, AdGateController } from '@rahrow/ads/ad-gate.ts'
import type { Logger } from '@rahrow/core/logging/logger.ts'

export async function recordAdAction(
	gate: AdGateController | undefined,
	logger: Logger | undefined,
	event: AdActionEvent,
): Promise<void> {
	if (!gate) return
	try {
		await gate.recordActionEvent(event)
	} catch (error) {
		logger?.warn(
			{
				action: 'advertising.action-gate.record',
				adAction: event.action,
				outcome: 'failure',
				errorType: error instanceof Error ? error.name : typeof error,
			},
			'User action outcome could not be recorded by the advertising gate',
		)
	}
}
