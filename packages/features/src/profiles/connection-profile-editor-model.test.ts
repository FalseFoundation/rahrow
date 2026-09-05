import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { describe, expect, it } from 'vitest'

import {
	buildEditedConnectionProfile,
	formatCanonicalProfileJson,
	parseCanonicalProfileJson,
	previewCanonicalProfileJsonChange,
	toConnectionProfileEditorValues,
} from './connection-profile-editor-model.ts'

const vlessProfile: ConnectionProfile = {
	id: 'profile:vless-test',
	protocol: 'vless',
	endpoint: { host: 'old.example.com', port: 443 },
	transport: {
		type: 'ws',
		host: 'cdn.example.com',
		path: '/socket',
		packetEncoding: 'xudp',
	},
	security: {
		type: 'reality',
		serverName: 'origin.example.com',
		fingerprint: 'chrome',
		publicKey: 'test-public-key',
		shortId: '01234567',
	},
	authentication: {
		id: '00000000-0000-4000-8000-000000000000',
		flow: 'xtls-rprx-vision',
		encryption: 'none',
	},
	metadata: {
		name: 'Original',
		source: 'subscription',
		tags: ['favorite'],
		subscriptionId: 'subscription:test',
	},
}

describe('connection profile editor model', () => {
	it('edits modeled fields while preserving identity and ownership metadata', () => {
		const values = {
			...toConnectionProfileEditorValues(vlessProfile),
			name: 'Edited',
			host: 'new.example.com',
			port: '8443',
		}

		const edited = buildEditedConnectionProfile(vlessProfile, values)

		expect(edited.id).toBe(vlessProfile.id)
		expect(edited.endpoint).toEqual({ host: 'new.example.com', port: 8443 })
		expect(edited.metadata).toEqual({
			name: 'Edited',
			source: 'subscription',
			tags: ['favorite'],
			subscriptionId: 'subscription:test',
		})
		expect(edited.authentication).toEqual(vlessProfile.authentication)
	})

	it('only emits transport fields represented by the selected network', () => {
		const edited = buildEditedConnectionProfile(vlessProfile, {
			...toConnectionProfileEditorValues(vlessProfile),
			transportType: 'grpc',
			serviceName: 'rahrow.Connection',
		})

		expect(edited.transport).toEqual({
			type: 'grpc',
			serviceName: 'rahrow.Connection',
			packetEncoding: 'xudp',
		})
	})

	it('removes an explicit transport only when the user disables it', () => {
		const edited = buildEditedConnectionProfile(vlessProfile, {
			...toConnectionProfileEditorValues(vlessProfile),
			transportEnabled: false,
		})

		expect(edited.transport).toBeUndefined()
	})

	it('validates canonical JSON and prevents identity or protocol coercion', () => {
		const valid = parseCanonicalProfileJson(
			formatCanonicalProfileJson(vlessProfile),
			vlessProfile,
		)
		const changedIdentity = JSON.stringify({
			...vlessProfile,
			id: 'profile:other',
		})
		const changedProtocol = JSON.stringify({
			...vlessProfile,
			protocol: 'trojan',
		})
		const unknownField = JSON.stringify({ ...vlessProfile, engineConfig: {} })

		expect(valid).toEqual(vlessProfile)
		expect(() =>
			parseCanonicalProfileJson(changedIdentity, vlessProfile),
		).toThrow('identity')
		expect(() =>
			parseCanonicalProfileJson(changedProtocol, vlessProfile),
		).toThrow('Protocol changes')
		expect(() => parseCanonicalProfileJson(unknownField, vlessProfile)).toThrow(
			'Invalid profile',
		)
	})

	it('stages canonical JSON changes as a path-only diff before applying them', () => {
		const preview = previewCanonicalProfileJsonChange(
			JSON.stringify({
				...vlessProfile,
				endpoint: { host: 'new.example.com', port: 8443 },
				metadata: { ...vlessProfile.metadata, name: 'Edited' },
			}),
			vlessProfile,
		)

		expect(preview.changedPaths).toEqual([
			'$.endpoint.host',
			'$.endpoint.port',
			'$.metadata.name',
		])
		expect(preview.profile.endpoint).toEqual({
			host: 'new.example.com',
			port: 8443,
		})
		expect(JSON.stringify(preview.changedPaths)).not.toContain('new.example.com')
	})

	it('does not expose transport or TLS fields for SSH profiles', () => {
		const sshProfile: ConnectionProfile = {
			id: 'profile:ssh-test',
			protocol: 'ssh',
			endpoint: { host: 'ssh.example.com', port: 22 },
			authentication: {
				username: 'test-user',
				password: 'test-only-password',
				hostKey: 'ssh-ed25519 test-only-host-key',
			},
			metadata: { name: 'SSH', source: 'manual' },
		}
		const values = {
			...toConnectionProfileEditorValues(sshProfile),
			transportEnabled: true,
			securityType: 'tls' as const,
		}

		const edited = buildEditedConnectionProfile(sshProfile, values)

		expect(edited.transport).toBeUndefined()
		expect(edited.security).toBeUndefined()
	})
})
