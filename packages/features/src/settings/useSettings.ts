import type { ResetScope } from '@rahrow/core/settings/reset-orchestrator.ts'
import type { Settings } from '@rahrow/core/storage/json-store.ts'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useAppTranslation } from '../app/app-i18n.tsx'
import { resolveAppLocale } from '../app/app-locale.ts'
import { useAppRuntime } from '../app/runtime.tsx'
import { persistableBoolean } from './settings-model.ts'

type SettingsOverrides = Partial<{
	localPort: string
	engineId: string
	routingMode: NonNullable<Settings['routingMode']>
	theme: NonNullable<Settings['theme']>
	language: string
	connectionMode: NonNullable<Settings['connectionMode']>
	launchAtStartup: boolean
}>

type PendingAction = 'save' | 'reset'

const DEFAULT_SETTINGS = {
	localPort: '10808',
	engineId: 'sing-box',
	routingMode: 'global',
	theme: 'system',
	language: 'en',
	connectionMode: 'vpn',
	launchAtStartup: false,
} as const

export function useSettings() {
	const { t } = useAppTranslation()
	const runtime = useAppRuntime()
	const logger = useMemo(
		() => runtime.logger.child({ module: 'user-action' }),
		[runtime.logger],
	)
	const [localPort, setLocalPort] = useState<string>(DEFAULT_SETTINGS.localPort)
	const [engineId, setEngineId] = useState<string>(DEFAULT_SETTINGS.engineId)
	const [routingMode, setRoutingMode] = useState<
		NonNullable<Settings['routingMode']>
	>(DEFAULT_SETTINGS.routingMode)
	const [theme, setTheme] = useState<NonNullable<Settings['theme']>>(
		DEFAULT_SETTINGS.theme,
	)
	const [language, setLanguage] = useState<string>(DEFAULT_SETTINGS.language)
	const [connectionMode, setConnectionMode] = useState<
		NonNullable<Settings['connectionMode']>
	>(DEFAULT_SETTINGS.connectionMode)
	const [launchAtStartup, setLaunchAtStartup] = useState(false)
	const [vpnSupported, setVpnSupported] = useState(false)
	const [systemProxySupported, setSystemProxySupported] = useState(false)
	const [autostartSupported, setAutostartSupported] = useState(false)
	const [message, setMessage] = useState(() => t('settings.status.loading'))
	const [isLoading, setIsLoading] = useState(true)
	const [loadError, setLoadError] = useState<string>()
	const [failure, setFailure] = useState<string>()
	const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
	const loadLock = useRef(false)
	const actionLock = useRef(false)
	const hasUsableSettings = useRef(false)
	const mutationRevision = useRef(0)
	const translate = useRef(t)
	translate.current = t
	const engineIds = runtime.availableEngines?.map((engine) => engine.id) ?? [
		runtime.engine.id,
	]
	const appVersion = runtime.buildMetadata?.version?.trim() || undefined
	const restoreVisibleSettings = useCallback((settings: Settings) => {
		setLocalPort(String(settings.localPort ?? DEFAULT_SETTINGS.localPort))
		setEngineId(settings.engineId ?? DEFAULT_SETTINGS.engineId)
		setRoutingMode(settings.routingMode ?? DEFAULT_SETTINGS.routingMode)
		setTheme(settings.theme ?? DEFAULT_SETTINGS.theme)
		setLanguage(resolveAppLocale(settings.language).language)
		setConnectionMode(settings.connectionMode ?? DEFAULT_SETTINGS.connectionMode)
		setLaunchAtStartup(settings.launchAtStartup ?? false)
	}, [])

	const load = useCallback(async () => {
		if (loadLock.current) return false
		loadLock.current = true
		const revisionAtStart = mutationRevision.current
		if (!hasUsableSettings.current) setIsLoading(true)
		setLoadError(undefined)
		setFailure(undefined)
		setMessage(translate.current('settings.status.loading'))

		try {
			const [settings, vpnStatus, systemProxyStatus, autostartStatus] =
				await Promise.all([
					runtime.settingsStore.read(),
					readCapabilityStatus(runtime.capabilities.vpn),
					readCapabilityStatus(runtime.capabilities.systemProxy),
					readCapabilityStatus(runtime.capabilities.autostart),
				])
			if (revisionAtStart !== mutationRevision.current) return false
			restoreVisibleSettings(settings)
			setVpnSupported(vpnStatus !== undefined && vpnStatus.supported !== false)
			setSystemProxySupported(systemProxyStatus?.supported === true)
			setAutostartSupported(autostartStatus?.supported === true)
			setLaunchAtStartup(
				persistableBoolean(settings.launchAtStartup ?? false, {
					supported: autostartStatus?.supported === true,
				}),
			)
			hasUsableSettings.current = true
			setMessage(translate.current('settings.status.loaded'))
			return true
		} catch {
			const nextError = translate.current('settings.errors.load')
			setLoadError(nextError)
			setMessage(nextError)
			return false
		} finally {
			loadLock.current = false
			setIsLoading(false)
		}
	}, [restoreVisibleSettings, runtime.capabilities, runtime.settingsStore])

	useEffect(() => {
		void load()
	}, [load])

	const selectEngine = useCallback(
		(nextEngineId: string) => {
			setEngineId(nextEngineId)
			logger.info(
				{ action: 'engine.select', engineId: nextEngineId, outcome: 'selected' },
				`Engine selected: ${nextEngineId}`,
			)
		},
		[logger],
	)

	const selectConnectionMode = useCallback(
		(nextMode: NonNullable<Settings['connectionMode']>) => {
			setConnectionMode(nextMode)
			logger.info(
				{
					action: 'connection-mode.select',
					connectionMode: nextMode,
					outcome: 'selected',
				},
				`Connection mode selected: ${nextMode}`,
			)
		},
		[logger],
	)

	const persist = useCallback(
		async (overrides: SettingsOverrides, action: PendingAction) => {
			if (isLoading || loadError || actionLock.current) return false
			actionLock.current = true
			mutationRevision.current += 1
			setPendingAction(action)
			setFailure(undefined)
			setMessage(
				translate.current(
					action === 'reset'
						? 'settings.status.resetting'
						: 'settings.status.saving',
				),
			)

			let current: Settings | undefined
			let nativeAutostartChanged = false
			try {
				current = await runtime.settingsStore.read()
				const nextLocalPort = overrides.localPort ?? localPort
				const nextEngineId = overrides.engineId ?? engineId
				const nextRoutingMode = overrides.routingMode ?? routingMode
				const nextTheme = overrides.theme ?? theme
				const nextLanguage = resolveAppLocale(
					overrides.language ?? language,
				).language
				const nextConnectionMode = overrides.connectionMode ?? connectionMode
				const nextLaunchAtStartup = overrides.launchAtStartup ?? launchAtStartup
				const port = Number.parseInt(nextLocalPort, 10)
				const persistedAutostart = persistableBoolean(nextLaunchAtStartup, {
					supported: autostartSupported,
				})

				if (!Number.isFinite(port) || port < 1 || port > 65535) {
					throw new Error(translate.current('settings.errors.invalidPort'))
				}

				const previousAutostart = current.launchAtStartup === true
				if (autostartSupported && persistedAutostart !== previousAutostart) {
					if (persistedAutostart) {
						await runtime.capabilities.autostart?.enable()
					} else {
						await runtime.capabilities.autostart?.disable()
					}
					nativeAutostartChanged = true
				}

				await runtime.settingsStore.write({
					...current,
					localPort: port,
					engineId: nextEngineId,
					routingMode: nextRoutingMode,
					theme: nextTheme,
					language: nextLanguage,
					connectionMode: nextConnectionMode,
					launchAtStartup: persistedAutostart,
				})
				logger.info(
					{
						action: `settings.${action}`,
						outcome: 'success',
						engineId: nextEngineId,
						connectionMode: nextConnectionMode,
					},
					action === 'reset'
						? 'Settings reset to defaults'
						: `Settings saved with ${nextEngineId} in ${nextConnectionMode} mode`,
				)
				setMessage(
					translate.current(
						action === 'reset' ? 'settings.status.reset' : 'settings.status.saved',
					),
				)
				return true
			} catch (error) {
				if (current) {
					restoreVisibleSettings(current)
					if (nativeAutostartChanged) {
						try {
							if (current.launchAtStartup === true) {
								await runtime.capabilities.autostart?.enable()
							} else {
								await runtime.capabilities.autostart?.disable()
							}
						} catch (rollbackError) {
							logger.warn(
								{
									action: 'settings.autostart.rollback',
									outcome: 'failure',
									errorType:
										rollbackError instanceof Error
											? rollbackError.name
											: typeof rollbackError,
								},
								'Autostart rollback failed after settings persistence failure',
							)
						}
					}
				}
				const verb = action === 'reset' ? 'reset' : 'save'
				const nextFailure = translate.current(
					action === 'reset' ? 'settings.errors.reset' : 'settings.errors.save',
				)
				logger.warn(
					{
						action: `settings.${action}`,
						outcome: 'failure',
						errorType: error instanceof Error ? error.name : typeof error,
					},
					`Settings ${verb} failed`,
				)
				setFailure(nextFailure)
				setMessage(nextFailure)
				return false
			} finally {
				actionLock.current = false
				setPendingAction(null)
			}
		},
		[
			autostartSupported,
			engineId,
			isLoading,
			launchAtStartup,
			language,
			loadError,
			localPort,
			connectionMode,
			logger,
			restoreVisibleSettings,
			routingMode,
			runtime,
			theme,
		],
	)

	const save = useCallback(
		(overrides: SettingsOverrides = {}) => persist(overrides, 'save'),
		[persist],
	)

	const reset = useCallback(
		async (scope: ResetScope = 'settings') => {
			if (!runtime.reset) {
				if (scope !== 'settings') return false
				const didReset = await persist(DEFAULT_SETTINGS, 'reset')
				if (!didReset) return false
				restoreVisibleSettings({
					...DEFAULT_SETTINGS,
					localPort: Number(DEFAULT_SETTINGS.localPort),
				})
				return true
			}

			if (isLoading || loadError || actionLock.current) return false
			actionLock.current = true
			mutationRevision.current += 1
			setPendingAction('reset')
			setFailure(undefined)
			setMessage(translate.current('settings.status.resetting'))
			try {
				const outcome = await runtime.reset.reset(scope)
				if (outcome.status !== 'completed') {
					const nextFailure = `${translate.current('settings.errors.reset')} ${outcome.recovery}`
					setFailure(nextFailure)
					setMessage(nextFailure)
					return false
				}
				const current = await runtime.settingsStore.read()
				restoreVisibleSettings(current)
				setMessage(translate.current('settings.status.reset'))
				return true
			} catch {
				const nextFailure = translate.current('settings.errors.reset')
				setFailure(nextFailure)
				setMessage(nextFailure)
				return false
			} finally {
				actionLock.current = false
				setPendingAction(null)
			}
		},
		[isLoading, loadError, persist, restoreVisibleSettings, runtime],
	)

	return {
		state: {
			localPort,
			engineId,
			routingMode,
			theme,
			language,
			connectionMode,
			launchAtStartup,
			vpnSupported,
			systemProxySupported,
			autostartSupported,
			message,
			engineIds,
			appVersion,
			isLoading,
			loadError,
			failure,
			pendingAction,
		},
		actions: {
			load,
			setLocalPort,
			setEngineId: selectEngine,
			setRoutingMode,
			setTheme,
			setLanguage,
			setConnectionMode: selectConnectionMode,
			setLaunchAtStartup,
			save,
			reset,
		},
	}
}

async function readCapabilityStatus(capability?: {
	readonly status: () => Promise<{ readonly supported?: boolean }>
}) {
	try {
		return await capability?.status()
	} catch {
		return undefined
	}
}
