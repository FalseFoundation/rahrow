import { parseConnectionProfile } from '@rahrow/core/profile/profile-schema.ts'
import { describe, expect, it } from 'vitest'

import {
	createShadowsocksProfile,
	createShadowsocksProfileFromForm,
	createShadowsocksShareUrl,
	shadowsocksProfileDefaultValues,
	shadowsocksSaveErrorMessage,
	validateShadowsocksMethod,
} from './shadowsocks-profile-model.ts'

describe('createShadowsocksShareUrl', () => {
	it('builds a validated canonical profile through the shared serializer', () => {
		expect(
			createShadowsocksShareUrl({
				name: 'Manual SS',
				host: 'example.com',
				port: 8388,
				method: 'aes-256-gcm',
				password: 'secret',
			}),
		).toBe('ss://YWVzLTI1Ni1nY206c2VjcmV0@example.com:8388#Manual%20SS')
	})
})

describe('createShadowsocksProfile', () => {
	it('updates a profile without changing its identity or subscription metadata', () => {
		const existing = parseConnectionProfile({
			id: 'subscription:stable-profile',
			protocol: 'shadowsocks',
			endpoint: { host: 'old.example.com', port: 443 },
			authentication: { method: 'aes-128-gcm', password: 'old-secret' },
			metadata: {
				name: 'Old name',
				source: 'subscription',
				tags: ['work'],
			},
		})

		expect(
			createShadowsocksProfile(
				{
					name: 'Edited profile',
					host: 'new.example.com',
					port: 8443,
					method: '2022-blake3-aes-256-gcm',
					password: 'new-secret',
				},
				existing,
			),
		).toEqual({
			id: 'subscription:stable-profile',
			protocol: 'shadowsocks',
			endpoint: { host: 'new.example.com', port: 8443 },
			authentication: {
				method: '2022-blake3-aes-256-gcm',
				password: 'new-secret',
			},
			metadata: {
				name: 'Edited profile',
				source: 'subscription',
				tags: ['work'],
			},
		})
	})

	it('converts form port values while preserving edit metadata', () => {
		const existing = parseConnectionProfile({
			id: 'subscription:stable-profile',
			protocol: 'shadowsocks',
			endpoint: { host: 'old.example.com', port: 443 },
			authentication: { method: 'aes-128-gcm', password: 'old-secret' },
			metadata: { source: 'subscription', tags: ['work'] },
		})

		expect(
			createShadowsocksProfileFromForm(
				{
					...shadowsocksProfileDefaultValues(existing),
					host: 'new.example.com',
					port: '8388',
				},
				existing,
			),
		).toMatchObject({
			id: 'subscription:stable-profile',
			endpoint: { host: 'new.example.com', port: 8388 },
			metadata: { source: 'subscription', tags: ['work'] },
		})
	})

	it('validates methods and redacts the exact password from save errors', () => {
		expect(validateShadowsocksMethod('aes-256-gcm')).toBeUndefined()
		expect(validateShadowsocksMethod('not-a-method' as 'aes-256-gcm')).toBe(
			'Select a supported method',
		)
		expect(
			shadowsocksSaveErrorMessage(
				new Error('Rejected credential very-secret-value'),
				'very-secret-value',
			),
		).toBe("Couldn't save connection")
	})
})
