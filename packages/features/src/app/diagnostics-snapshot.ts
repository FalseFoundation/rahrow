import type { DiagnosticsSnapshot } from './runtime.tsx'

const privateKeyPattern =
	/-----BEGIN(?: [A-Z0-9]+)? PRIVATE KEY-----[\s\S]*?-----END(?: [A-Z0-9]+)? PRIVATE KEY-----/gi
const authorizationPattern =
	/(\bauthorization\s*:\s*(?:bearer|basic)\s+)[^\s,;]+/gi
const urlCredentialPattern = /([a-z][a-z\d+.-]*:\/\/[^\s/@:]+:)[^\s/@]+(@)/gi
const assignedSecretPattern =
	/(\b(?:access[_-]?token|refresh[_-]?token|api[_-]?key|password|passwd|private[_-]?key|secret|token)\b["']?\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;&}]+)/gi
const querySecretPattern =
	/([?&](?:access[_-]?token|refresh[_-]?token|api[_-]?key|password|passwd|private[_-]?key|secret|token)=)[^&#\s]*/gi

export function redactDiagnosticText(value: string): string {
	return value
		.replace(privateKeyPattern, '[REDACTED PRIVATE KEY]')
		.replace(authorizationPattern, '$1[REDACTED]')
		.replace(urlCredentialPattern, '$1[REDACTED]$2')
		.replace(querySecretPattern, '$1[REDACTED]')
		.replace(assignedSecretPattern, '$1[REDACTED]')
}

export function redactDiagnosticsSnapshot(
	snapshot: DiagnosticsSnapshot,
): DiagnosticsSnapshot {
	return {
		...snapshot,
		lastError: snapshot.lastError
			? redactDiagnosticText(snapshot.lastError)
			: undefined,
		capabilities: snapshot.capabilities.map((capability) => ({
			...capability,
			detail: capability.detail
				? redactDiagnosticText(capability.detail)
				: undefined,
		})),
	}
}
