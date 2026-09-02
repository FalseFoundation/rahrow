import { QueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { changeAppLanguage } from './app-i18n.tsx'
import { DEFAULT_APP_LOCALE } from './app-locale.ts'
import type {
	AppRuntime,
	ConnectionPort,
	ConnectionSnapshot,
} from './runtime.tsx'

type ConnectionThemeState = 'connected' | 'disconnected'

function connectionThemeState(state: string): ConnectionThemeState {
	return state === 'connected' ? 'connected' : 'disconnected'
}

export function useAppShellResources(runtime: AppRuntime) {
	const [localeReady, setLocaleReady] = useState(false)
	const [connectionState, setConnectionState] =
		useState<ConnectionThemeState>('disconnected')
	const queryClient = useMemo(() => new QueryClient(), [runtime])
	const publishSnapshot = useCallback((snapshot: ConnectionSnapshot) => {
		setConnectionState(connectionThemeState(snapshot.state))
	}, [])
	const readConnectionState = useCallback(async () => {
		try {
			publishSnapshot(await runtime.connection.status())
		} catch {
			setConnectionState('disconnected')
		}
	}, [publishSnapshot, runtime.connection])
	const connection = useMemo<ConnectionPort>(() => {
		const source = runtime.connection

		return {
			async connect(profile, options) {
				try {
					await source.connect(profile, options)
					try {
						await runtime.advertising?.gate.recordConnectionSuccess()
					} catch (error) {
						runtime.logger.warn(
							{
								action: 'advertising.connection-gate.record',
								outcome: 'failure',
								errorType: error instanceof Error ? error.name : typeof error,
							},
							'Connection succeeded, but the advertising gate could not be recorded',
						)
					}
				} finally {
					await readConnectionState()
				}
			},
			async disconnect() {
				try {
					await source.disconnect()
				} finally {
					await readConnectionState()
				}
			},
			async status() {
				try {
					const snapshot = await source.status()
					publishSnapshot(snapshot)
					return snapshot
				} catch (error) {
					setConnectionState('disconnected')
					throw error
				}
			},
			test(profile) {
				return source.test(profile)
			},
			...(source.subscribe
				? {
						subscribe(listener: (snapshot: ConnectionSnapshot) => void) {
							return source.subscribe?.(listener) ?? (() => undefined)
						},
					}
				: {}),
		}
	}, [publishSnapshot, readConnectionState, runtime])
	const settingsStore = useMemo(
		() => ({
			read: () => runtime.settingsStore.read(),
			async write(settings: Parameters<typeof runtime.settingsStore.write>[0]) {
				await runtime.settingsStore.write(settings)
				await changeAppLanguage(settings.language)
			},
		}),
		[runtime.settingsStore],
	)
	const shellRuntime = useMemo(
		() => ({ ...runtime, connection, settingsStore }),
		[runtime, connection, settingsStore],
	)

	useEffect(() => {
		let active = true
		void runtime.connection
			.status()
			.then((snapshot) => {
				if (active) publishSnapshot(snapshot)
			})
			.catch(() => {
				if (active) setConnectionState('disconnected')
			})

		let unsubscribe: (() => void) | undefined
		try {
			unsubscribe = runtime.connection.subscribe?.((snapshot) => {
				if (active) publishSnapshot(snapshot)
			})
		} catch {
			unsubscribe = undefined
		}

		return () => {
			active = false
			unsubscribe?.()
		}
	}, [publishSnapshot, runtime.connection])

	useEffect(() => {
		document.documentElement.dataset.connectionState = connectionState
	}, [connectionState])

	useEffect(() => {
		let active = true
		void runtime.settingsStore
			.read()
			.then(async (settings) => {
				if (active) {
					await changeAppLanguage(settings.language)
				}
			})
			.catch(async () => {
				if (active) await changeAppLanguage(DEFAULT_APP_LOCALE.language)
			})
			.finally(() => {
				if (active) setLocaleReady(true)
			})

		return () => {
			active = false
		}
	}, [runtime.settingsStore])

	useEffect(
		() => () => {
			document.documentElement.dataset.connectionState = 'disconnected'
		},
		[],
	)

	useEffect(
		() => () => {
			queryClient.clear()
		},
		[queryClient],
	)

	return { localeReady, queryClient, runtime: shellRuntime }
}
