import { useCallback, useEffect, useState } from 'react'
import type { AdvertisingDiagnostics } from '../ads/ad-diagnostics.ts'
import { useAppTranslation } from '../app/app-i18n.tsx'
import { redactDiagnosticsSnapshot } from '../app/diagnostics-snapshot.ts'
import { type DiagnosticsSnapshot, useAppRuntime } from '../app/runtime.tsx'

export function useDiagnostics() {
	const { t } = useAppTranslation()
	const runtime = useAppRuntime()
	const [snapshot, setSnapshot] = useState<DiagnosticsSnapshot>({
		capabilities: [],
	})
	const [error, setError] = useState<string>()
	const [copyFeedback, setCopyFeedback] = useState<{
		readonly kind: 'success' | 'error'
		readonly message: string
	}>()
	const [isCopying, setIsCopying] = useState(false)
	const [isRefreshing, setIsRefreshing] = useState(true)
	const [advertising, setAdvertising] = useState<AdvertisingDiagnostics>(() =>
		advertisingDiagnostics(runtime),
	)

	useEffect(() => {
		const configured = runtime.advertising
		if (!configured) {
			setAdvertising({ configured: false })
			return
		}

		const update = () => setAdvertising(advertisingDiagnostics(runtime))
		update()
		const unsubscribe = configured.gate.subscribe(update)
		void configured.gate
			.initialize()
			.then(update)
			.catch(() => {
				setAdvertising({
					configured: true,
					providerId: configured.provider.id,
					snapshot: configured.gate.snapshot(),
					initializationFailed: true,
				})
			})
		return unsubscribe
	}, [runtime])

	const refresh = useCallback(async () => {
		setIsRefreshing(true)
		setError(undefined)
		try {
			const next = await runtime.diagnostics.snapshot()
			setSnapshot(redactDiagnosticsSnapshot(next))
		} catch {
			setError(t('diagnostics.errors.refresh'))
		} finally {
			setIsRefreshing(false)
		}
	}, [runtime, t])

	const copy = useCallback(
		async (label: string, payload: string) => {
			if (runtime.capabilities.clipboard.supported === false || isCopying) return
			setIsCopying(true)
			setCopyFeedback(undefined)
			try {
				await runtime.capabilities.clipboard.write(payload)
				setCopyFeedback({
					kind: 'success',
					message: t('diagnostics.feedback.copied', { name: label }),
				})
			} catch {
				setCopyFeedback({
					kind: 'error',
					message: t('diagnostics.errors.copy', { name: label }),
				})
			} finally {
				setIsCopying(false)
			}
		},
		[isCopying, runtime, t],
	)

	useEffect(() => {
		void refresh()
	}, [refresh])

	return {
		state: {
			advertising,
			snapshot,
			error,
			copyFeedback,
			isCopying,
			isRefreshing,
			canCopy: runtime.capabilities.clipboard.supported !== false,
		},
		actions: { refresh, copy },
	}
}

function advertisingDiagnostics(runtime: ReturnType<typeof useAppRuntime>) {
	if (!runtime.advertising) return { configured: false } as const
	return {
		configured: true,
		providerId: runtime.advertising.provider.id,
		snapshot: runtime.advertising.gate.snapshot(),
	} as const
}
