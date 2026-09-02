import type {
	AdGateController,
	AdGateSnapshot,
	AdObligation,
} from '@rahrow/ads/ad-gate.ts'
import type {
	AdCreative,
	AdPresentationResult,
	AdProvider,
} from '@rahrow/ads/ad-provider.ts'
import { useCallback, useEffect, useState } from 'react'

export interface ActiveEmbeddedAd {
	readonly obligation: AdObligation
	readonly creative: AdCreative
	readonly remainingMs: number
	readonly canClose: boolean
}

export function useAdGate(gate: AdGateController, provider: AdProvider) {
	const [snapshot, setSnapshot] = useState<AdGateSnapshot>(() => gate.snapshot())
	const [active, setActive] = useState<ActiveEmbeddedAd | null>(null)
	const [currentTime, setCurrentTime] = useState(() => Date.now())
	const firstObligation = snapshot.obligations[0]
	const isCoolingDown =
		snapshot.cooldownUntil !== undefined && snapshot.cooldownUntil > currentTime

	useEffect(() => gate.subscribe(setSnapshot), [gate])

	useEffect(() => {
		void gate.initialize().catch(() => undefined)
	}, [gate])

	useEffect(() => {
		if (!firstObligation) {
			setActive(null)
			return
		}
		if (isCoolingDown && snapshot.cooldownUntil !== undefined) {
			setActive(null)
			const timer = setTimeout(
				() => setCurrentTime(Date.now()),
				Math.max(0, snapshot.cooldownUntil - Date.now()),
			)
			return () => clearTimeout(timer)
		}

		let mounted = true
		let timer: ReturnType<typeof setInterval> | undefined

		void gate
			.claimNext()
			.then(async (obligation) => {
				if (!mounted || !obligation) return
				const presentation = await provider.load(obligation)
				if (!mounted) return

				if (!presentation) {
					await gate.complete(obligation.id, 'provider-unavailable')
					return
				}

				if (presentation.kind === 'native') {
					const result = await presentation
						.present()
						.catch((): AdPresentationResult => 'failed')
					if (mounted && isTerminalProviderResult(result)) {
						await gate.complete(
							obligation.id,
							result === 'dismissed'
								? 'provider-dismissed'
								: result === 'unavailable'
									? 'provider-unavailable'
									: 'provider-failed',
						)
					}
					return
				}

				const eligibleAt = Date.now() + obligation.minimumVisibleMs
				const updateCountdown = () => {
					const remainingMs = Math.max(0, eligibleAt - Date.now())
					setActive({
						obligation,
						creative: presentation.creative,
						remainingMs,
						canClose: remainingMs === 0,
					})
					if (remainingMs === 0 && timer) clearInterval(timer)
				}
				updateCountdown()
				timer = setInterval(updateCountdown, 250)
			})
			.catch(async () => {
				if (mounted) await gate.complete(firstObligation.id, 'provider-failed')
			})

		return () => {
			mounted = false
			if (timer) clearInterval(timer)
		}
	}, [
		currentTime,
		firstObligation?.id,
		gate,
		isCoolingDown,
		provider,
		snapshot.cooldownUntil,
	])

	const close = useCallback(async () => {
		if (!active?.canClose) return
		await gate.complete(active.obligation.id)
	}, [active, gate])

	return {
		active,
		isOpen: Boolean(firstObligation) && !isCoolingDown,
		isPreparing: Boolean(firstObligation) && !isCoolingDown && !active,
		close,
	}
}

function isTerminalProviderResult(result: AdPresentationResult): boolean {
	return (
		result === 'dismissed' || result === 'failed' || result === 'unavailable'
	)
}
