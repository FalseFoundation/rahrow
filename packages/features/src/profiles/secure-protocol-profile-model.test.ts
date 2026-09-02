import { describe, expect, it } from 'vitest'

import {
	createSecureProtocolProfile,
	createSecureProtocolProfileFromForm,
	secureProtocolDefaultValues,
} from './secure-protocol-profile-model.ts'

describe('createSecureProtocolProfile', () => {
	it('creates a host-key-pinned SSH profile and preserves identity when editing', () => {
		const profile = createSecureProtocolProfile({
			protocol: 'ssh',
			name: 'SSH',
			host: 'ssh.example.com',
			port: 22,
			username: 'alice',
			password: 'secret',
			hostKey: 'ssh-ed25519 AAAA-test',
		})
		const edited = createSecureProtocolProfile(
			{
				protocol: 'ssh',
				name: 'Edited',
				host: 'new.example.com',
				port: 2222,
				username: 'alice',
				password: 'secret',
				hostKey: 'ssh-ed25519 AAAA-test',
			},
			profile,
		)

		expect(edited.id).toBe(profile.id)
		expect(edited.endpoint).toEqual({ host: 'new.example.com', port: 2222 })
	})

	it('preserves a Hysteria obfuscation password when an edit omits it', () => {
		const profile = createSecureProtocolProfile({
			protocol: 'hysteria2',
			host: 'hy2.example.com',
			port: 443,
			password: 'secret',
			obfsPassword: 'obfs-secret',
		})
		const edited = createSecureProtocolProfile(
			{
				protocol: 'hysteria2',
				host: 'hy2.example.com',
				port: 8443,
				password: 'secret',
			},
			profile,
		)

		expect(edited.hysteria?.obfsPassword).toBe('obfs-secret')
	})

	it('round-trips Hysteria defaults, optional obfuscation, and edit metadata', () => {
		const existing = createSecureProtocolProfile({
			protocol: 'hysteria',
			name: 'Imported Hysteria',
			host: 'hy.example.com',
			port: 443,
			password: 'secret',
			serverName: 'edge.example.com',
			upMbps: 60,
			downMbps: 120,
			obfsPassword: 'obfs-secret',
		})
		const tagged = {
			...existing,
			metadata: {
				...existing.metadata,
				tags: ['work'],
				source: 'subscription' as const,
			},
		}
		const defaults = secureProtocolDefaultValues(tagged)
		const edited = createSecureProtocolProfileFromForm(
			{ ...defaults, name: 'Edited Hysteria', obfsPassword: '' },
			tagged,
		)

		expect(defaults).toMatchObject({
			protocol: 'hysteria',
			upMbps: '60',
			downMbps: '120',
			obfsPassword: 'obfs-secret',
		})
		expect(edited).toMatchObject({
			id: tagged.id,
			protocol: 'hysteria',
			metadata: {
				name: 'Edited Hysteria',
				tags: ['work'],
				source: 'subscription',
			},
			hysteria: { upMbps: 60, downMbps: 120 },
		})
		expect(edited.hysteria?.obfsPassword).toBeUndefined()
	})

	it('does not leak inactive Hysteria fields into an SSH payload', () => {
		const profile = createSecureProtocolProfileFromForm({
			...secureProtocolDefaultValues(undefined, 'ssh'),
			host: 'ssh.example.com',
			port: '22',
			username: 'alice',
			password: 'secret',
			hostKey: 'ssh-ed25519 AAAA-test',
			serverName: 'inactive.example.com',
			obfsPassword: 'inactive-secret',
		})

		expect(profile.protocol).toBe('ssh')
		expect(profile.authentication).toEqual({
			username: 'alice',
			password: 'secret',
			hostKey: 'ssh-ed25519 AAAA-test',
		})
		expect(profile.security).toBeUndefined()
		expect(profile.hysteria).toBeUndefined()
	})

	it('creates a Hysteria2 payload with the shared bandwidth defaults', () => {
		const profile = createSecureProtocolProfileFromForm({
			...secureProtocolDefaultValues(undefined, 'hysteria2'),
			host: 'hy2.example.com',
			password: 'secret',
			obfsPassword: 'salamander-secret',
		})

		expect(profile).toMatchObject({
			protocol: 'hysteria2',
			endpoint: { host: 'hy2.example.com', port: 443 },
			authentication: { password: 'secret' },
			security: { type: 'tls', serverName: 'hy2.example.com' },
			hysteria: {
				upMbps: 50,
				downMbps: 100,
				obfsPassword: 'salamander-secret',
			},
		})
	})
})
