import type { AdGateSnapshot } from '@rahrow/ads/ad-gate.ts'

export interface AdvertisingDiagnostics {
	readonly configured: boolean
	readonly providerId?: string
	readonly snapshot?: AdGateSnapshot
	readonly initializationFailed?: boolean
}

export function advertisingDiagnosticStatus(
	diagnostics: AdvertisingDiagnostics,
): 'disabled' | 'enabled' | 'error' {
	if (!diagnostics.configured) return 'disabled'
	return diagnostics.initializationFailed ? 'error' : 'enabled'
}

export function advertisingDiagnosticDetail(
	diagnostics: AdvertisingDiagnostics,
): string {
	if (!diagnostics.configured)
		return 'No advertising provider is configured for this build.'
	if (diagnostics.initializationFailed)
		return `Provider: ${diagnostics.providerId ?? 'unknown'}. Ad gate storage could not initialize.`

	const snapshot = diagnostics.snapshot
	if (!snapshot)
		return `Provider: ${diagnostics.providerId ?? 'unknown'}. Ad gate state is loading.`

	const current = snapshot.obligations[0]
	const queueDetail = current
		? `${snapshot.obligations.length} ${snapshot.obligations.length === 1 ? 'ad' : 'ads'} queued. Current ad: ${current.status}. Presentation attempts: ${current.attempts}.`
		: 'No ads queued.'
	const lastCompletion = snapshot.lastCompletion
		? ` Last ad result: ${completionLabel(snapshot.lastCompletion.outcome)}.`
		: ''

	return `Provider: ${diagnostics.providerId ?? 'unknown'}. ${snapshot.profileSelectionCount} of ${snapshot.policy.selectionsPerAd} connection selections recorded. ${queueDetail}${lastCompletion}`
}

export function createAdvertisingDiagnosticPayload(
	diagnostics: AdvertisingDiagnostics,
): string {
	return [
		'Name: Advertising',
		`Status: ${advertisingDiagnosticStatus(diagnostics)}`,
		`Detail: ${advertisingDiagnosticDetail(diagnostics)}`,
	].join('\n')
}

function completionLabel(
	outcome: NonNullable<AdGateSnapshot['lastCompletion']>['outcome'],
) {
	if (outcome === 'closed') return 'closed'
	if (outcome === 'provider-dismissed') return 'provider dismissed'
	if (outcome === 'provider-failed') return 'provider failed'
	return 'provider unavailable'
}
