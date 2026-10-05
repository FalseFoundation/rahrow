import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const xrayRuntime = JSON.parse(
	readFileSync(
		new URL('../../../../engines/xray/runtime.json', import.meta.url),
		'utf8',
	),
) as { version: string }
const singBoxRuntime = JSON.parse(
	readFileSync(
		new URL('../../../../engines/sing-box/runtime.json', import.meta.url),
		'utf8',
	),
) as { version: string }

const pins = JSON.parse(
	readFileSync(
		new URL('../../native-runtime-pins.json', import.meta.url),
		'utf8',
	),
)

describe('mobile native runtime source pins', () => {
	it('pins exact upstream commits and keeps the two Go runtimes process-isolated', () => {
		expect(pins.schemaVersion).toBe(2)
		expect(pins.buildToolchains).toMatchObject({
			go: { version: '1.26.7', downloadPolicy: 'local-only' },
			androidNdk: {
				version: '28.0.13004108',
				downloadPolicy: 'local-only',
			},
		})
		expect(pins.engines.xray).toMatchObject({
			version: xrayRuntime.version,
			ref: `v${xrayRuntime.version}`,
			license: 'MPL-2.0',
			androidProcess: ':vpn_xray',
		})
		expect(pins.engines.xray.revision).toMatch(/^[a-f0-9]{40}$/u)
		expect(pins.engines['sing-box']).toMatchObject({
			version: singBoxRuntime.version,
			ref: `v${singBoxRuntime.version}`,
			license: 'GPL-3.0-or-later',
			androidProcess: ':vpn_sing_box',
		})
		expect(pins.engines['sing-box'].revision).toMatch(/^[a-f0-9]{40}$/u)
	})

	it('declares every shipped Android ABI and Apple device/simulator target', () => {
		expect(pins.targets.android).toEqual([
			'arm64-v8a',
			'armeabi-v7a',
			'x86',
			'x86_64',
		])
		expect(pins.targets.apple).toEqual([
			'ios-arm64',
			'ios-simulator-arm64',
			'ios-simulator-x86_64',
		])
	})

	it('pins HEV as a separately licensed tunnel provider rather than a proxy engine', () => {
		expect(pins.tunnelProviders['hev-socks5-tunnel']).toMatchObject({
			version: '2.17.1',
			ref: '2.17.1',
			revision: '9a06bc6e7989da54e3d32ff701ef7a7ce4995d3a',
			repository: 'https://github.com/heiher/hev-socks5-tunnel.git',
			license: 'MIT',
			defaults: ['android', 'linux'],
		})
		expect(pins.engines).not.toHaveProperty('hev-socks5-tunnel')
	})
})
