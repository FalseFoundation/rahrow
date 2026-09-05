import { describe, expect, it } from 'vitest'

import {
	availableSettings,
	persistableBoolean,
	SETTINGS_REGISTRY,
	settingsQueryMatches,
	toggleDisabled,
} from './settings-model.ts'

describe('settings-model', () => {
	it('matches settings sections without case or surrounding whitespace', () => {
		expect(settingsQueryMatches(' START ', ['Launch at startup'])).toBe(true)
		expect(
			settingsQueryMatches('logs', ['Appearance', 'Diagnostics and logs']),
		).toBe(true)
		expect(settingsQueryMatches('account', ['Appearance', 'Diagnostics'])).toBe(
			false,
		)
	})

	it('does not persist or enable unsupported capability toggles', () => {
		expect(
			persistableBoolean(true, { supported: false, detail: 'unsigned build' }),
		).toBe(false)
		expect(toggleDisabled({ supported: false })).toBe(true)
	})

	it('persists supported capability toggles that the user requested', () => {
		expect(persistableBoolean(true, { supported: true })).toBe(true)
		expect(toggleDisabled({ supported: true })).toBe(false)
	})

	it('declares searchable capability and lifecycle metadata for every setting', () => {
		expect(SETTINGS_REGISTRY.length).toBeGreaterThan(0)
		for (const setting of SETTINGS_REGISTRY) {
			expect(setting.searchKeywords.length).toBeGreaterThan(0)
			expect(typeof setting.isAvailable).toBe('function')
			expect(setting.effect).toMatch(/^(none|reconnect|restart)$/)
		}
	})

	it('omits platform settings when their capability is unavailable', () => {
		const visible = availableSettings({
			vpnSupported: false,
			systemProxySupported: false,
			autostartSupported: false,
			privacyOptionsSupported: false,
			connectionMode: 'vpn',
			selectableLocaleCount: 2,
		}).map((setting) => setting.id)

		expect(visible).not.toEqual(
			expect.arrayContaining([
				'connection-mode',
				'system-proxy',
				'autostart',
				'privacy',
			]),
		)
		expect(visible).toEqual(
			expect.arrayContaining(['engine', 'routing', 'appearance', 'about']),
		)
	})

	it('keeps routing available in VPN and system proxy modes', () => {
		const context = {
			vpnSupported: true,
			systemProxySupported: true,
			autostartSupported: false,
			privacyOptionsSupported: false,
			selectableLocaleCount: 2,
		} as const

		for (const connectionMode of ['vpn', 'proxy'] as const) {
			expect(
				availableSettings({ ...context, connectionMode }).some(
					(setting) => setting.id === 'routing',
				),
			).toBe(true)
		}
	})

	it('shows LAN sharing only for an explicit native capability', () => {
		const context = {
			vpnSupported: true,
			systemProxySupported: true,
			autostartSupported: false,
			privacyOptionsSupported: false,
			connectionMode: 'proxy' as const,
			selectableLocaleCount: 2,
		}

		expect(
			availableSettings(context).some(
				(setting) => setting.id === 'lan-proxy-sharing',
			),
		).toBe(false)
		expect(
			availableSettings({ ...context, lanProxySharingSupported: true }).some(
				(setting) => setting.id === 'lan-proxy-sharing',
			),
		).toBe(true)
	})
})
