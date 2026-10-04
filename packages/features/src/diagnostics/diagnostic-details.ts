import { redactDiagnosticText } from '../app/diagnostics-snapshot.ts'
import type {
	DiagnosticCapability,
	DiagnosticsSnapshot,
} from '../app/runtime.tsx'

export function engineDiagnosticDetail(snapshot: DiagnosticsSnapshot): string {
	return snapshot.lastError
		? `Last error: ${redactDiagnosticText(snapshot.lastError)}`
		: 'No engine errors reported'
}

export function engineDiagnosticStatus(snapshot: DiagnosticsSnapshot): string {
	return snapshot.lastError ? 'error' : (snapshot.engineStatus ?? 'unknown')
}

export function capabilityDiagnosticDetail(
	capability: DiagnosticCapability,
): string {
	return capability.detail
		? redactDiagnosticText(capability.detail)
		: 'No detail available'
}

export function createEngineDiagnosticPayload(
	snapshot: DiagnosticsSnapshot,
): string {
	return [
		'Name: Engine',
		`Status: ${engineDiagnosticStatus(snapshot)}`,
		`Detail: ${engineDiagnosticDetail(snapshot)}`,
	].join('\n')
}

export function createCapabilityDiagnosticPayload(
	capability: DiagnosticCapability,
	status: string,
): string {
	return [
		`Name: ${capability.name}`,
		`Status: ${status}`,
		`Supported: ${capability.supported ? 'yes' : 'no'}`,
		`Enabled: ${
			capability.enabled === undefined
				? 'not reported'
				: capability.enabled
					? 'yes'
					: 'no'
		}`,
		`Detail: ${capabilityDiagnosticDetail(capability)}`,
	].join('\n')
}

/** One sanitized clipboard report for support: no secrets, paths, or host config. */
export function createDiagnosticsShareReport(input: {
	readonly snapshot: DiagnosticsSnapshot
	readonly connectionState?: string
	readonly engineId?: string
	readonly connectionMode?: string
	readonly localPort?: number
	readonly platform?: string
}): string {
	const capabilities = input.snapshot.capabilities
		.map((capability) => {
			const enabled =
				capability.enabled === undefined
					? ''
					: capability.enabled
						? ',enabled'
						: ',disabled'
			return `${capability.name}:${capability.supported ? 'ok' : 'missing'}${enabled}`
		})
		.join('; ')

	return redactDiagnosticText(
		[
			'RahRow diagnostics',
			`Platform: ${input.platform ?? 'unknown'}`,
			`Engine: ${input.engineId ?? 'unknown'}`,
			`Engine status: ${engineDiagnosticStatus(input.snapshot)}`,
			`Connection: ${input.connectionState ?? 'unknown'}`,
			`Mode: ${input.connectionMode ?? 'unknown'}`,
			`Local port: ${
				typeof input.localPort === 'number' ? input.localPort : 'unknown'
			}`,
			`Last error: ${
				input.snapshot.lastError
					? redactDiagnosticText(input.snapshot.lastError)
					: 'none'
			}`,
			`Capabilities: ${capabilities || 'none'}`,
		].join('\n'),
	)
}
