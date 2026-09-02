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
