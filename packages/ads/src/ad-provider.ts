import type { AdObligation } from './ad-gate.ts'

export interface AdCreative {
	readonly sponsor: string
	readonly headline: string
	readonly body: string
	readonly actionLabel?: string
	readonly actionUrl?: string
}

export type AdPresentation =
	| {
			readonly kind: 'embedded'
			readonly creative: AdCreative
	  }
	| {
			readonly kind: 'native'
			present(): Promise<AdPresentationResult>
	  }

export type AdPresentationResult = 'dismissed' | 'failed' | 'unavailable'

export interface AdProvider {
	readonly id: string
	load(obligation: AdObligation): Promise<AdPresentation | null>
	openPrivacyOptions?(): Promise<void>
}
