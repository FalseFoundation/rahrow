import {
	AdMob,
	type AdMobPlugin,
	InterstitialAdPluginEvents,
	MaxAdContentRating,
} from '@capacitor-community/admob'
import type {
	AdPresentationResult,
	AdProvider,
} from '@rahrow/ads/ad-provider.ts'

export interface AdMobAdProviderOptions {
	readonly adUnitId: string
	readonly isTesting?: boolean
	readonly plugin?: AdMobPlugin
}

export class AdMobAdProvider implements AdProvider {
	readonly id = 'google-admob'
	private readonly plugin: AdMobPlugin
	private initialization?: Promise<boolean>

	constructor(private readonly options: AdMobAdProviderOptions) {
		this.plugin = options.plugin ?? AdMob
	}

	async load() {
		if (!(await this.ensureInitialized())) return null
		try {
			await this.plugin.prepareInterstitial({
				adId: this.options.adUnitId,
				isTesting: this.options.isTesting === true,
			})
			return {
				kind: 'native' as const,
				present: () => this.present(),
			}
		} catch {
			return null
		}
	}

	async openPrivacyOptions() {
		await this.plugin.showPrivacyOptionsForm()
	}

	private ensureInitialized() {
		this.initialization ??= this.initialize()
		return this.initialization
	}

	private async initialize() {
		try {
			let consent = await this.plugin.requestConsentInfo()
			if (!consent.canRequestAds && consent.isConsentFormAvailable)
				consent = await this.plugin.showConsentForm()
			if (!consent.canRequestAds) return false

			await this.plugin.initialize({
				initializeForTesting: this.options.isTesting === true,
				maxAdContentRating: MaxAdContentRating.General,
				tagForChildDirectedTreatment: false,
				tagForUnderAgeOfConsent: false,
			})
			return true
		} catch {
			return false
		}
	}

	private async present(): Promise<AdPresentationResult> {
		return await new Promise((resolve) => {
			const handles = Promise.all([
				this.plugin.addListener(InterstitialAdPluginEvents.Dismissed, () => {
					void finish('dismissed')
				}),
				this.plugin.addListener(InterstitialAdPluginEvents.FailedToShow, () => {
					void finish('failed')
				}),
			])
			let settled = false
			const finish = async (result: AdPresentationResult) => {
				if (settled) return
				settled = true
				for (const handle of await handles) await handle.remove()
				resolve(result)
			}

			void handles
				.then(() => this.plugin.showInterstitial())
				.catch(() => finish('failed'))
		})
	}
}
