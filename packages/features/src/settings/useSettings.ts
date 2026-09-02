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
	const engineIds = runtime.availableEngines?.map((engine) => engine.id) ?? [
		runtime.engine.id,
	]
	const appVersion = runtime.buildMetadata?.version?.trim() || undefined

	const load = useCallback(async () => {
		if (loadLock.current) return false
		loadLock.current = true
		setIsLoading(true)
		setLoadError(undefined)
		setFailure(undefined)
		setMessage(t('settings.status.loading'))

		try {
			const [settings, vpnStatus, systemProxyStatus, autostartStatus] =
				await Promise.all([
					runtime.settingsStore.read(),
					readCapabilityStatus(runtime.capabilities.vpn),
					readCapabilityStatus(runtime.capabilities.systemProxy),
					readCapabilityStatus(runtime.capabilities.autostart),
				])
			setLocalPort(String(settings.localPort ?? 10808))
			setEngineId(settings.engineId ?? DEFAULT_SETTINGS.engineId)
			setRoutingMode(settings.routingMode ?? DEFAULT_SETTINGS.routingMode)
			setTheme(settings.theme ?? DEFAULT_SETTINGS.theme)
			setLanguage(resolveAppLocale(settings.language).language)
			setConnectionMode(settings.connectionMode ?? DEFAULT_SETTINGS.connectionMode)
			setVpnSupported(vpnStatus !== undefined && vpnStatus.supported !== false)
			setSystemProxySupported(systemProxyStatus?.supported === true)
			setAutostartSupported(autostartStatus?.supported === true)
			setLaunchAtStartup(
				persistableBoolean(settings.launchAtStartup ?? false, {
					supported: autostartStatus?.supported === true,
				}),
			)
			setMessage(t('settings.status.loaded'))
			return true
		} catch {
			const nextError = t('settings.errors.load')
			setLoadError(nextError)
			setMessage(nextError)
			return false
		} finally {
			loadLock.current = false
			setIsLoading(false)
		}
	}, [runtime, t])

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
			setPendingAction(action)
			setFailure(undefined)
			setMessage(
				t(
					action === 'reset'
						? 'settings.status.resetting'
						: 'settings.status.saving',
				),
			)

			try {
				const current = await runtime.settingsStore.read()
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
					throw new Error(t('settings.errors.invalidPort'))
				}

				if (autostartSupported) {
					if (persistedAutostart) {
						await runtime.capabilities.autostart?.enable()
					} else {
						await runtime.capabilities.autostart?.disable()
					}
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
					t(action === 'reset' ? 'settings.status.reset' : 'settings.status.saved'),
				)
				return true
			} catch (error) {
				const verb = action === 'reset' ? 'reset' : 'save'
				const nextFailure = t(
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
			routingMode,
			runtime,
			theme,
			t,
		],
	)

	const save = useCallback(
		(overrides: SettingsOverrides = {}) => persist(overrides, 'save'),
		[persist],
	)

	const reset = useCallback(async () => {
		const didReset = await persist(DEFAULT_SETTINGS, 'reset')
		if (!didReset) return false

		setLocalPort(DEFAULT_SETTINGS.localPort)
		setEngineId(DEFAULT_SETTINGS.engineId)
		setRoutingMode(DEFAULT_SETTINGS.routingMode)
		setTheme(DEFAULT_SETTINGS.theme)
		setLanguage(DEFAULT_SETTINGS.language)
		setConnectionMode(DEFAULT_SETTINGS.connectionMode)
		setLaunchAtStartup(DEFAULT_SETTINGS.launchAtStartup)
		return true
	}, [persist])

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
