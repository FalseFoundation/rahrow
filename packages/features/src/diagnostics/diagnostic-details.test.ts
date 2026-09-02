import { describe, expect, it } from 'vitest'

import { redactDiagnosticsSnapshot } from '../app/diagnostics-snapshot.ts'
import {
	capabilityDiagnosticDetail,
	createCapabilityDiagnosticPayload,
	createEngineDiagnosticPayload,
} from './diagnostic-details.ts'

describe('diagnostic detail payloads', () => {
	it('creates deterministic engine and capability payloads including fallback states', () => {
		expect(
			createEngineDiagnosticPayload({
				engineStatus: 'stopped',
				capabilities: [],
			}),
		).toBe('Name: Engine\nStatus: stopped\nDetail: No engine errors reported')

		const capability = { name: 'vpn', supported: false } as const
		expect(capabilityDiagnosticDetail(capability)).toBe('No detail available')
		expect(createCapabilityDiagnosticPayload(capability, 'unavailable')).toBe(
			'Name: vpn\nStatus: unavailable\nSupported: no\nEnabled: not reported\nDetail: No detail available',
		)
	})

	it('copies the same failed status shown for an engine error', () => {
		expect(
			createEngineDiagnosticPayload({
				engineStatus: 'stopped',
				lastError: 'Native provider failed',
				capabilities: [],
			}),
		).toBe(
			'Name: Engine\nStatus: error\nDetail: Last error: Native provider failed',
		)
	})

	it('redacts credentials and private keys at the diagnostics snapshot boundary', () => {
		const snapshot = redactDiagnosticsSnapshot({
			engineStatus: 'error',
			lastError:
				'Authorization: Bearer engine-secret password=hunter2 https://alice:private@example.com',
			capabilities: [
				{
					name: 'vpn',
					supported: false,
					detail:
						'https://example.com/status?token=query-secret\n-----BEGIN PRIVATE KEY-----\nprivate-key-material\n-----END PRIVATE KEY-----',
				},
			],
		})

		expect(snapshot.lastError).toContain('Authorization: Bearer [REDACTED]')
		expect(snapshot.lastError).toContain('password=[REDACTED]')
		expect(snapshot.lastError).toContain('alice:[REDACTED]@example.com')
		expect(snapshot.capabilities[0]?.detail).toContain('token=[REDACTED]')
		expect(snapshot.capabilities[0]?.detail).toContain('[REDACTED PRIVATE KEY]')
		expect(JSON.stringify(snapshot)).not.toContain('engine-secret')
		expect(JSON.stringify(snapshot)).not.toContain('private-key-material')
	})
})
