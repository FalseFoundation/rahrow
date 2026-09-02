import { describe, expect, it } from 'vitest'

import {
	createStandardProfile,
	createStandardProfileFromForm,
	standardCredentialLabel,
	standardProfileDefaultValues,
	validateStandardCredential,
	validateStandardHost,
	validateStandardPort,
} from './manual-profile-model.ts'

describe('manual profile model', () => {
	it('creates a standalone VLESS profile from the selected protocol form', () => {
		const profile = createStandardProfile({
			protocol: 'vless',
			name: 'Edge',
			host: 'edge.example.com',
			port: 443,
			credential: '11111111-1111-4111-8111-111111111111',
			security: 'tls',
		})

		expect(profile).toMatchObject({
			protocol: 'vless',
			metadata: { name: 'Edge', source: 'manual' },
			authentication: {
				id: '11111111-1111-4111-8111-111111111111',
			},
		})
	})

	it('changes credentials for Trojan', () => {
		const profile = createStandardProfile({
			protocol: 'trojan',
			host: 'edge.example.com',
			port: 443,
			credential: 'secret',
			security: 'tls',
		})

		expect(profile.authentication).toEqual({ password: 'secret' })
	})

	it('owns typed defaults and protocol-specific validation copy', () => {
		expect(standardProfileDefaultValues('trojan')).toMatchObject({
			protocol: 'trojan',
			port: '443',
			security: 'tls',
		})
		expect(standardCredentialLabel('trojan')).toBe('Password')
		expect(standardCredentialLabel('vmess')).toBe('User ID')
		expect(validateStandardHost(' ')).toBe('Server is required')
		expect(validateStandardPort('0')).toBe('Enter a port from 1 to 65535')
		expect(validateStandardPort('65536')).toBe('Enter a port from 1 to 65535')
		expect(validateStandardPort('443')).toBeUndefined()
		expect(validateStandardCredential('trojan', '')).toBe('Password is required')
	})

	it('converts string ports and omits inactive TLS server names', () => {
		const profile = createStandardProfileFromForm({
			...standardProfileDefaultValues('trojan'),
			host: 'edge.example.com',
			port: '8443',
			credential: 'secret',
			security: 'none',
			serverName: 'must-not-leak.example.com',
		})

		expect(profile.endpoint.port).toBe(8443)
		expect(profile.security).toEqual({ type: 'none' })
	})
})
