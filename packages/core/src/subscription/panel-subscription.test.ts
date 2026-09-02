import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { errorMessage } from '../errors.ts'
import { parseConnectionUrl } from '../protocol/connection-protocol.ts'
import { parseImportedProfilesWithReport } from './subscription-import.ts'

const fixtureDirectory = dirname(fileURLToPath(import.meta.url))

function prettyVmessUrl(payload: Record<string, unknown>) {
	return `vmess://${globalThis.btoa(`${JSON.stringify(payload, null, 2)}\n`)}`
}

describe('panel subscription payloads', () => {
	it('parses a panel-style mixed subscription including Trojan without security=', () => {
		const fixture = readFileSync(
			join(fixtureDirectory, 'fixtures/panel-subscription.txt'),
			'utf8',
		)
		const result = parseImportedProfilesWithReport({
			value: fixture,
			source: 'subscription',
		})

		expect(result.issues).toEqual([])
		expect(result.profiles.map((profile) => profile.protocol)).toEqual([
			'trojan',
			'trojan',
			'vless',
			'vless',
			'vmess',
		])
		expect(result.profiles[0]?.security).toMatchObject({
			type: 'tls',
			serverName: 'grm.example.com',
			fingerprint: 'chrome',
			allowInsecure: false,
		})
	})

	it('parses the same payload when wrapped in standard subscription base64', () => {
		const fixture = readFileSync(
			join(fixtureDirectory, 'fixtures/panel-subscription.txt'),
			'utf8',
		)
		const result = parseImportedProfilesWithReport({
			value: globalThis.btoa(fixture.trim()),
			source: 'subscription',
		})

		expect(result.issues).toEqual([])
		expect(result.profiles.length).toBeGreaterThan(0)
	})

	it('parses pretty-printed VMess JSON with type=ws and insecure', () => {
		const [profile] = parseConnectionUrl(
			prettyVmessUrl({
				add: 'panel.example.com',
				aid: '0',
				alpn: '',
				fp: 'chrome',
				id: '11111111-1111-4111-8111-111111111111',
				insecure: '0',
				net: 'ws',
				port: '443',
				ps: 'Germany',
				scy: 'auto',
				sni: 'hlhl.example.com',
				tls: 'tls',
				type: 'ws',
				v: '2',
			}),
		)

		expect(profile).toMatchObject({
			protocol: 'vmess',
			transport: { type: 'ws' },
			security: {
				type: 'tls',
				serverName: 'hlhl.example.com',
				allowInsecure: false,
			},
			authentication: { encryption: 'auto' },
		})
	})
})

describe('errorMessage', () => {
	it('surfaces Tauri-style non-Error objects instead of a generic fallback', () => {
		expect(
			errorMessage(
				{ message: 'command rahrow_http_get not found' },
				'Import failed',
			),
		).toBe('command rahrow_http_get not found')
	})
})
