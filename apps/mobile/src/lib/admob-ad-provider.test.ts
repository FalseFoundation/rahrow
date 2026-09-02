import {
	type AdMobPlugin,
	InterstitialAdPluginEvents,
} from '@capacitor-community/admob'
import { describe, expect, it, vi } from 'vitest'

import { AdMobAdProvider } from './admob-ad-provider.ts'

function createPlugin(canRequestAds = true) {
	const listeners = new Map<string, () => void>()
	const remove = vi.fn(async () => undefined)
	const plugin = {
		requestConsentInfo: vi.fn(async () => ({
			canRequestAds,
			isConsentFormAvailable: false,
			privacyOptionsRequirementStatus: 'NOT_REQUIRED',
			status: 'OBTAINED',
		})),
		showConsentForm: vi.fn(),
		showPrivacyOptionsForm: vi.fn(async () => undefined),
		initialize: vi.fn(async () => undefined),
		prepareInterstitial: vi.fn(async () => ({ adUnitId: 'test' })),
		showInterstitial: vi.fn(async () => undefined),
		addListener: vi.fn(async (event: string, listener: () => void) => {
			listeners.set(event, listener)
			return { remove }
		}),
	} as unknown as AdMobPlugin

	return { listeners, plugin, remove }
}

describe('AdMobAdProvider', () => {
	it('requests consent before loading and resolves on native dismissal', async () => {
		const { listeners, plugin, remove } = createPlugin()
		const provider = new AdMobAdProvider({
			adUnitId: 'ca-app-pub-test/interstitial',
			isTesting: true,
			plugin,
		})

		const presentation = await provider.load()
		expect(plugin.requestConsentInfo).toHaveBeenCalledOnce()
		expect(plugin.initialize).toHaveBeenCalledOnce()
		expect(plugin.prepareInterstitial).toHaveBeenCalledWith({
			adId: 'ca-app-pub-test/interstitial',
			isTesting: true,
		})
		if (presentation?.kind !== 'native')
			throw new Error('Expected native presentation')

		const result = presentation.present()
		await vi.waitFor(() => expect(plugin.showInterstitial).toHaveBeenCalledOnce())
		listeners.get(InterstitialAdPluginEvents.Dismissed)?.()

		await expect(result).resolves.toBe('dismissed')
		expect(remove).toHaveBeenCalledTimes(2)
	})

	it('does not request an ad when consent does not permit it', async () => {
		const { plugin } = createPlugin(false)
		const provider = new AdMobAdProvider({ adUnitId: 'test', plugin })

		await expect(provider.load()).resolves.toBeNull()
		expect(plugin.initialize).not.toHaveBeenCalled()
		expect(plugin.prepareInterstitial).not.toHaveBeenCalled()
	})
})
