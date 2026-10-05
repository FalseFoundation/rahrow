import { useCallback, useEffect, useState } from 'react'
import type { AdvertisingDiagnostics } from '../ads/ad-diagnostics.ts'
import { useAppTranslation } from '../app/app-i18n.tsx'
import { redactDiagnosticsSnapshot } from '../app/diagnostics-snapshot.ts'
import {
	type ConnectionSnapshot,
	type DiagnosticsSnapshot,
	useAppRuntime,
} from '../app/runtime.tsx'
import { createDiagnosticsShareReport } from './diagnostic-details.ts'

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
	const [connectionContext, setConnectionContext] = useState<{
		readonly connectionState?: string
		readonly engineId?: string
		readonly connectionMode?: string
		readonly localPort?: number
	}>({})
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
			const [next, settings, connection] = await Promise.all([
				runtime.diagnostics.snapshot(),
				runtime.settingsStore.read(),
				runtime.connection.status().catch(
					(): ConnectionSnapshot => ({
						state: 'unavailable',
					}),
				),
			])
			setSnapshot(redactDiagnosticsSnapshot(next))
			setConnectionContext({
				connectionState: connection.state,
				engineId: connection.engineId ?? settings.engineId ?? runtime.engine.id,
				connectionMode: connection.mode ?? settings.connectionMode,
				localPort: connection.localPort ?? settings.localPort,
			})
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

	const copyShareReport = useCallback(async () => {
		await copy(
			t('diagnostics.shareReportName'),
			createDiagnosticsShareReport({
				snapshot,
				...connectionContext,
				platform: runtime.platform,
			}),
		)
	}, [connectionContext, copy, runtime.platform, snapshot, t])

	const openSystemVpnSettings = useCallback(async () => {
		try {
			await runtime.capabilities.vpn?.openSystemSettings?.()
		} catch {
			setCopyFeedback({
				kind: 'error',
				message: t('diagnostics.errors.refresh'),
			})
		}
	}, [runtime.capabilities.vpn, t])

	useEffect(() => {
		void refresh()
	}, [refresh])

	const lastError = snapshot.lastError ?? ''
	const showAndroidVpnGuide =
		runtime.platform === 'android' ||
		/Always-on VPN|VPN permission was denied|did not allow RahRow to start a VPN/i.test(
			lastError,
		)

	return {
		state: {
			advertising,
			snapshot,
			error,
			copyFeedback,
			isCopying,
			isRefreshing,
			canCopy: runtime.capabilities.clipboard.supported !== false,
			showAndroidVpnGuide,
			canOpenSystemVpnSettings: Boolean(
				runtime.capabilities.vpn?.openSystemSettings,
			),
		},
		actions: { refresh, copy, copyShareReport, openSystemVpnSettings },
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
