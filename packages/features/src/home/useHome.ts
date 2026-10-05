import { createAdActionEventId } from '@rahrow/ads/ad-gate.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type { EngineId } from '@rahrow/core/runtime/proxy-engine.ts'
import type { LastGoodConnection } from '@rahrow/core/storage/json-store.ts'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { recordAdAction } from '../ads/record-ad-action.ts'
import { translate } from '../app/app-i18n.tsx'
import { presentLatency } from '../app/latency-presentation.ts'
import { usePrimaryTabVisible } from '../app/primary-tab-visibility.tsx'
import {
	type ConnectionSnapshot,
	type LatencySnapshot,
	useAppRuntime,
} from '../app/runtime.tsx'
import {
	busyLocalPortFromCause,
	classifyConnectFailure,
	connectionFailure,
	type UserFacingFailure,
} from '../app/user-facing-failure.ts'
import { useSmartConnect } from '../smart-connect/useSmartConnect.ts'
import {
	canConnect,
	canDisconnect,
	connectionModeUnavailableReason,
	formatConnectionState,
	isLiveConnectionState,
	profileLabel,
	resolveHomeSelectedProfileId,
} from './home-model.ts'
import { usePostConnectEgressIdentity } from './usePostConnectEgressIdentity.ts'
import { usePostConnectNetworkQuality } from './usePostConnectNetworkQuality.ts'

export function useHome() {
	const runtime = useAppRuntime()
	const logger = useMemo(
		() => runtime.logger.child({ module: 'user-action' }),
		[runtime.logger],
	)
	const [profiles, setProfiles] = useState<readonly ConnectionProfile[]>([])
	const [selectedProfileId, setSelectedProfileId] = useState('')
	const [localPort, setLocalPort] = useState(10808)
	const [connectionState, setConnectionState] = useState('disconnected')
	const [connectionMode, setConnectionMode] = useState<'vpn' | 'proxy'>('vpn')
	const [engineId, setEngineId] = useState('sing-box')
	const [engineStatus, setEngineStatus] = useState('unknown')
	const [latency, setLatency] = useState<LatencySnapshot | null>(null)
	const [vpnSupported, setVpnSupported] = useState(false)
	const [systemProxySupported, setSystemProxySupported] = useState(false)
	const [isInitialized, setIsInitialized] = useState(false)
	const [initializationFailure, setInitializationFailure] = useState<{
		readonly title: string
		readonly description: string
		readonly detail: string
	} | null>(null)
	const [message, setMessage] = useState(() => translate('home.status.ready'))
	const [failure, setFailure] = useState<UserFacingFailure | null>(null)
	const [lastGoodConnection, setLastGoodConnection] =
		useState<LastGoodConnection | null>(null)
	const [pendingAction, setPendingAction] = useState<
		'connect' | 'disconnect' | 'test' | 'refresh' | null
	>(null)
	const isMounted = useRef(true)
	const profilesRef = useRef(profiles)
	profilesRef.current = profiles
	const synchronization = useRef<Promise<void> | null>(null)
	const synchronizationQueued = useRef(false)
	const backgroundRefreshScheduled = useRef(false)
	const hasAuthoritativeState = useRef(false)

	const selectedProfile = useMemo(
		() => profiles.find((profile) => profile.id === selectedProfileId),
		[profiles, selectedProfileId],
	)
	const engineIds = useMemo((): readonly EngineId[] => {
		const fromRuntime = runtime.availableEngines?.map((engine) => engine.id)
		if (fromRuntime && fromRuntime.length > 0) return fromRuntime
		return ['sing-box', 'xray']
	}, [runtime.availableEngines])
	const connectUnavailableReason = connectionModeUnavailableReason({
		connectionMode,
		vpnSupported,
		systemProxySupported,
	})
	const egressIdentity = usePostConnectEgressIdentity({
		connectionState,
		connectionKey: `${selectedProfileId}:${connectionMode}:${runtime.engine.id}:${localPort}`,
		mode: connectionMode,
		localPort,
		egressPath: runtime.egressPath,
		identity: runtime.egressIdentity,
	})
	const { state: networkQuality, retest: retestNetworkQuality } =
		usePostConnectNetworkQuality({
			connectionState,
			connectionKey: `${selectedProfileId}:${connectionMode}:${runtime.engine.id}:${localPort}`,
			mode: connectionMode,
			localPort,
			egressPath: runtime.egressPath,
			probe: runtime.networkQuality,
		})
	const smartConnect = useSmartConnect(runtime.smartConnect)

	const applyConnectionSnapshot = useCallback((snapshot: ConnectionSnapshot) => {
		setConnectionState(snapshot.state)
		if (snapshot.mode) setConnectionMode(snapshot.mode)
		setEngineStatus(snapshot.engineStatus ?? 'unknown')
		if (isLiveConnectionState(snapshot.state)) {
			setSelectedProfileId((current) =>
				resolveHomeSelectedProfileId({
					profiles: profilesRef.current,
					connectionState: snapshot.state,
					connectionProfileId: snapshot.profileId,
					connectionProfile: snapshot.profile,
					currentSelectedProfileId: current,
				}),
			)
		}
		if (snapshot.engineId && isLiveConnectionState(snapshot.state)) {
			setEngineId(snapshot.engineId)
		}
	}, [])

	const readAuthoritativeState = useCallback(async () => {
		try {
			const [nextProfiles, settings, snapshot, vpn, systemProxy] =
				await Promise.all([
					runtime.profileStore.list(),
					runtime.settingsStore.read(),
					runtime.connection.status(),
					runtime.capabilities.vpn?.status().catch(() => ({ supported: false })) ??
						Promise.resolve({ supported: false }),
					runtime.capabilities.systemProxy
						?.status()
						.catch(() => ({ supported: false })) ??
						Promise.resolve({ supported: false }),
				])

			if (!isMounted.current) return
			setProfiles(nextProfiles)
			profilesRef.current = nextProfiles
			setSelectedProfileId((current) =>
				resolveHomeSelectedProfileId({
					profiles: nextProfiles,
					connectionState: snapshot.state,
					connectionProfileId: snapshot.profileId,
					connectionProfile: snapshot.profile,
					activeProfileId: settings.activeProfileId,
					currentSelectedProfileId: current,
				}),
			)
			setLocalPort(settings.localPort ?? 10808)
			const persistedEngineId = settings.engineId ?? 'sing-box'
			if (!(snapshot.engineId && isLiveConnectionState(snapshot.state))) {
				setEngineId(persistedEngineId)
			}
			setLastGoodConnection(settings.lastGoodConnection ?? null)
			applyConnectionSnapshot(snapshot)
			if (!snapshot.mode) setConnectionMode(settings.connectionMode ?? 'vpn')
			setVpnSupported(vpn.supported !== false)
			setSystemProxySupported(systemProxy.supported === true)
			setInitializationFailure(null)
			setIsInitialized(true)
			hasAuthoritativeState.current = true
		} catch {
			if (!isMounted.current) return
			if (hasAuthoritativeState.current) return
			setInitializationFailure({
				title: translate('home.errors.loadTitle'),
				description: translate('home.errors.loadDescription'),
				detail: translate('home.errors.loadDetail'),
			})
			setIsInitialized(false)
		}
	}, [applyConnectionSnapshot, runtime])

	const synchronize = useCallback((): Promise<void> => {
		if (synchronization.current) {
			synchronizationQueued.current = true
			return synchronization.current
		}

		const active = (async () => {
			do {
				synchronizationQueued.current = false
				await readAuthoritativeState()
			} while (isMounted.current && synchronizationQueued.current)
		})()
		synchronization.current = active
		void active.finally(() => {
			if (synchronization.current === active) synchronization.current = null
		})
		return active
	}, [readAuthoritativeState])

	const requestBackgroundRefresh = useCallback(() => {
		if (backgroundRefreshScheduled.current) return
		backgroundRefreshScheduled.current = true
		queueMicrotask(() => {
			backgroundRefreshScheduled.current = false
			if (isMounted.current) void synchronize()
		})
	}, [synchronize])

	const refresh = useCallback(async () => {
		setPendingAction('refresh')
		try {
			await synchronize()
		} finally {
			if (isMounted.current) {
				setPendingAction((current) => (current === 'refresh' ? null : current))
			}
		}
	}, [synchronize])

	useEffect(() => {
		isMounted.current = true
		return () => {
			isMounted.current = false
		}
	}, [])

	useEffect(() => {
		void refresh()
	}, [refresh])

	const tabVisible = usePrimaryTabVisible()
	const tabWasVisibleRef = useRef(tabVisible)
	useEffect(() => {
		const becameVisible = tabVisible && !tabWasVisibleRef.current
		tabWasVisibleRef.current = tabVisible
		if (becameVisible) void synchronize()
	}, [synchronize, tabVisible])

	useEffect(() => {
		let unsubscribeConnection: (() => void) | undefined
		let unsubscribeSmartConnect: (() => void) | undefined
		try {
			unsubscribeConnection = runtime.connection.subscribe?.((snapshot) => {
				if (!isMounted.current) return
				applyConnectionSnapshot(snapshot)
				requestBackgroundRefresh()
			})
		} catch {
			unsubscribeConnection = undefined
		}
		try {
			unsubscribeSmartConnect = runtime.smartConnect?.subscribe(() => {
				requestBackgroundRefresh()
			})
		} catch {
			unsubscribeSmartConnect = undefined
		}

		return () => {
			unsubscribeConnection?.()
			unsubscribeSmartConnect?.()
		}
	}, [
		applyConnectionSnapshot,
		requestBackgroundRefresh,
		runtime.connection,
		runtime.smartConnect,
	])

	useEffect(() => {
		const refreshWhenVisible = () => {
			if (document.visibilityState === 'visible') requestBackgroundRefresh()
		}
		document.addEventListener('visibilitychange', refreshWhenVisible)
		window.addEventListener('pageshow', refreshWhenVisible)
		return () => {
			document.removeEventListener('visibilitychange', refreshWhenVisible)
			window.removeEventListener('pageshow', refreshWhenVisible)
		}
	}, [requestBackgroundRefresh])

	const resolveFreeLocalPort = useCallback(
		async (cause: unknown, preferred: number) => {
			if (classifyConnectFailure(cause) !== 'portInUse') return undefined
			if (!runtime.connection.suggestLocalPort) return undefined
			const busy = busyLocalPortFromCause(cause, preferred)
			const suggested = await runtime.connection
				.suggestLocalPort(busy)
				.catch(() => null)
			if (
				typeof suggested !== 'number' ||
				suggested === preferred ||
				suggested === busy
			) {
				return undefined
			}
			return suggested
		},
		[runtime.connection],
	)

	const connect = useCallback(async () => {
		if (!selectedProfile) {
			setMessage(translate('home.errors.selectFirst'))
			return
		}

		try {
			setFailure(null)
			setPendingAction('connect')
			const settings = await runtime.settingsStore.read()
			const connectionMode = settings.connectionMode ?? 'vpn'
			const unavailableReason = connectionModeUnavailableReason({
				connectionMode,
				vpnSupported,
				systemProxySupported,
			})
			if (unavailableReason) {
				setMessage(unavailableReason)
				return
			}
			const selectedEngineId = settings.engineId ?? 'sing-box'
			const preferredPort = settings.localPort ?? localPort
			const connectOptions = {
				localPort: preferredPort,
				mode: connectionMode,
				engineId: selectedEngineId,
			}
			await runtime.connection.canConnect?.(selectedProfile, connectOptions)
			await runtime.connection.connect(selectedProfile, connectOptions)
			const connectedPort =
				(await runtime.connection.status()).localPort ?? preferredPort
			const lastGood: LastGoodConnection = {
				profileId: selectedProfile.id,
				engineId: selectedEngineId === 'xray' ? 'xray' : 'sing-box',
				connectionMode,
				localPort: connectedPort,
				connectedAt: new Date().toISOString(),
			}
			await runtime.settingsStore.write({
				...settings,
				activeProfileId: selectedProfile.id,
				localPort: connectedPort,
				engineId: selectedEngineId,
				connectionMode,
				lastGoodConnection: lastGood,
			})
			if (connectedPort !== localPort) setLocalPort(connectedPort)
			setEngineId(selectedEngineId)
			setLastGoodConnection(lastGood)
			logger.info(
				{
					action: 'connection.connect',
					outcome: 'success',
					connectionMode,
					engineId: selectedEngineId,
					protocol: selectedProfile.protocol,
				},
				`Connected with ${selectedEngineId} in ${connectionMode} mode`,
			)
			await refresh()
			setMessage(translate('home.status.connected'))
		} catch (error) {
			logger.warn(
				{
					action: 'connection.connect',
					outcome: 'failure',
					errorType: error instanceof Error ? error.name : typeof error,
					errorMessage: error instanceof Error ? error.message : undefined,
				},
				'Connection attempt failed',
			)
			const settings = await runtime.settingsStore.read().catch(() => null)
			const freeLocalPort = await resolveFreeLocalPort(
				error,
				settings?.localPort ?? localPort,
			)
			const currentEngine =
				settings?.engineId === 'xray' || engineId === 'xray' ? 'xray' : 'sing-box'
			const alternateEngineId =
				classifyConnectFailure(error) === 'engineMissing'
					? currentEngine === 'xray'
						? ('sing-box' as const)
						: ('xray' as const)
					: undefined
			const lastGood = settings?.lastGoodConnection
			const canReconnectLastGood = Boolean(
				lastGood &&
					profiles.some((profile) => profile.id === lastGood.profileId) &&
					(lastGood.profileId !== selectedProfileId ||
						lastGood.engineId !== currentEngine),
			)
			const nextFailure = connectionFailure('connect', error, {
				canOpenSystemVpnSettings: Boolean(
					runtime.capabilities.vpn?.openSystemSettings,
				),
				freeLocalPort,
				alternateEngineId,
				canReconnectLastGood,
			})
			setFailure(nextFailure)
			setMessage(nextFailure.title)
		} finally {
			setPendingAction(null)
		}
	}, [
		engineId,
		localPort,
		logger,
		profiles,
		refresh,
		resolveFreeLocalPort,
		runtime,
		selectedProfile,
		selectedProfileId,
		systemProxySupported,
		vpnSupported,
	])

	const disconnect = useCallback(async () => {
		try {
			setFailure(null)
			setPendingAction('disconnect')
			await runtime.connection.disconnect()
			logger.info(
				{ action: 'connection.disconnect', outcome: 'success' },
				'Disconnected',
			)
			await refresh()
			setMessage(translate('home.status.disconnected'))
		} catch (error) {
			logger.warn(
				{
					action: 'connection.disconnect',
					outcome: 'failure',
					errorType: error instanceof Error ? error.name : typeof error,
				},
				'Disconnect failed',
			)
			const nextFailure = connectionFailure('disconnect')
			setFailure(nextFailure)
			setMessage(nextFailure.title)
		} finally {
			setPendingAction(null)
		}
	}, [logger, refresh, runtime])

	const retryFailure = useCallback(async () => {
		if (failure?.operation === 'connect') {
			await connect()
			return
		}
		if (failure?.operation === 'disconnect') await disconnect()
	}, [connect, disconnect, failure])

	const useFreePortAndConnect = useCallback(async () => {
		if (failure?.recovery.kind !== 'useFreePort') return
		const port = failure.recovery.port
		setLocalPort(port)
		const settings = await runtime.settingsStore.read()
		await runtime.settingsStore.write({ ...settings, localPort: port })
		await connect()
	}, [connect, failure, runtime.settingsStore])

	const switchEngineAndConnect = useCallback(async () => {
		if (failure?.recovery.kind !== 'switchEngine') return
		const nextEngine = failure.recovery.engineId
		setEngineId(nextEngine)
		const settings = await runtime.settingsStore.read()
		await runtime.settingsStore.write({ ...settings, engineId: nextEngine })
		await connect()
	}, [connect, failure, runtime.settingsStore])

	const reconnectLastGood = useCallback(async () => {
		const settings = await runtime.settingsStore.read()
		const lastGood = settings.lastGoodConnection
		if (!lastGood) return
		const profile = profiles.find((item) => item.id === lastGood.profileId)
		if (!profile) return
		setFailure(null)
		setSelectedProfileId(profile.id)
		setEngineId(lastGood.engineId)
		setConnectionMode(lastGood.connectionMode)
		if (typeof lastGood.localPort === 'number') setLocalPort(lastGood.localPort)
		const preferredPort = lastGood.localPort ?? settings.localPort ?? localPort
		await runtime.settingsStore.write({
			...settings,
			activeProfileId: lastGood.profileId,
			engineId: lastGood.engineId,
			connectionMode: lastGood.connectionMode,
			localPort: preferredPort,
		})
		try {
			setPendingAction('connect')
			const connectOptions = {
				localPort: preferredPort,
				mode: lastGood.connectionMode,
				engineId: lastGood.engineId,
			}
			await runtime.connection.canConnect?.(profile, connectOptions)
			await runtime.connection.connect(profile, connectOptions)
			const connectedPort =
				(await runtime.connection.status()).localPort ?? preferredPort
			const nextGood: LastGoodConnection = {
				...lastGood,
				localPort: connectedPort,
				connectedAt: new Date().toISOString(),
			}
			await runtime.settingsStore.write({
				...(await runtime.settingsStore.read()),
				activeProfileId: profile.id,
				localPort: connectedPort,
				engineId: lastGood.engineId,
				connectionMode: lastGood.connectionMode,
				lastGoodConnection: nextGood,
			})
			setLocalPort(connectedPort)
			setLastGoodConnection(nextGood)
			await refresh()
			setMessage(translate('home.status.connected'))
		} catch (error) {
			const nextFailure = connectionFailure('connect', error, {
				canOpenSystemVpnSettings: Boolean(
					runtime.capabilities.vpn?.openSystemSettings,
				),
			})
			setFailure(nextFailure)
			setMessage(nextFailure.title)
		} finally {
			setPendingAction(null)
		}
	}, [localPort, profiles, refresh, runtime])

	const openSystemVpnSettings = useCallback(async () => {
		try {
			await runtime.capabilities.vpn?.openSystemSettings?.()
		} catch (error) {
			logger.warn(
				{
					action: 'vpn.open-system-settings',
					outcome: 'failure',
					errorType: error instanceof Error ? error.name : typeof error,
				},
				'Could not open system VPN settings',
			)
		}
	}, [logger, runtime.capabilities.vpn])

	const testSelected = useCallback(async () => {
		if (!selectedProfile) {
			setMessage(translate('home.errors.selectFirst'))
			return
		}

		const eventId = createAdActionEventId('profile-ping')
		try {
			setPendingAction('test')
			const result = await runtime.connection.test(selectedProfile)
			setLatency(result)
			setMessage(presentLatency(result).label)
			await recordAdAction(runtime.advertising?.gate, logger, {
				id: eventId,
				action: 'profile-ping',
				outcome: 'completed',
			})
		} catch {
			setMessage(translate('latency.failed'))
			await recordAdAction(runtime.advertising?.gate, logger, {
				id: eventId,
				action: 'profile-ping',
				outcome: 'failed',
			})
		} finally {
			setPendingAction(null)
		}
	}, [logger, runtime, selectedProfile])

	const selectProfile = useCallback(
		(profile: ConnectionProfile) => {
			const previousProfileId = selectedProfileId
			setSelectedProfileId(profile.id)
			void (async () => {
				try {
					const settings = await runtime.settingsStore.read()
					if (settings.activeProfileId !== profile.id) {
						await runtime.settingsStore.write({
							...settings,
							activeProfileId: profile.id,
						})
					}
				} catch (error) {
					logger.warn(
						{
							action: 'home.selection.persist',
							outcome: 'failure',
							errorType: error instanceof Error ? error.name : typeof error,
						},
						'Selected profile could not be persisted',
					)
				}
				try {
					await runtime.advertising?.gate.recordProfileSelection(
						previousProfileId,
						profile.id,
					)
				} catch (error) {
					logger.warn(
						{
							action: 'advertising.profile-gate.record',
							outcome: 'failure',
							errorType: error instanceof Error ? error.name : typeof error,
						},
						'Profile selection changed, but the advertising gate could not be recorded',
					)
				}
			})()
		},
		[logger, runtime.advertising, runtime.settingsStore, selectedProfileId],
	)

	const selectEngine = useCallback(
		async (nextEngineId: EngineId) => {
			if (!engineIds.includes(nextEngineId)) return
			if (isLiveConnectionState(connectionState)) return
			setEngineId(nextEngineId)
			const settings = await runtime.settingsStore.read()
			await runtime.settingsStore.write({
				...settings,
				engineId: nextEngineId,
			})
		},
		[connectionState, engineIds, runtime.settingsStore],
	)

	const canReconnectLastGood = Boolean(
		lastGoodConnection &&
			!isLiveConnectionState(connectionState) &&
			profiles.some((profile) => profile.id === lastGoodConnection.profileId) &&
			(lastGoodConnection.profileId !== selectedProfileId ||
				lastGoodConnection.engineId !== engineId),
	)

	return {
		smartConnect,
		state: {
			profiles,
			engineId,
			engineIds,
			selectedProfileId,
			selectedProfile,
			connectionState,
			connectionMode,
			connectionLabel: formatConnectionState(connectionState),
			engineStatus,
			localPort,
			egressIdentity,
			networkQuality,
			vpnSupported,
			systemProxySupported,
			isInitialized,
			initializationFailure,
			latency,
			message,
			failure,
			lastGoodConnection,
			canReconnectLastGood,
			connectUnavailableReason,
			pendingAction,
			isPending: pendingAction !== null,
			canConnect:
				canConnect(connectionState) &&
				Boolean(selectedProfile) &&
				connectUnavailableReason === null,
			canDisconnect: canDisconnect(connectionState),
			profileLabel,
		},
		actions: {
			selectProfile,
			selectEngine,
			connect,
			disconnect,
			testSelected,
			refresh,
			retryFailure,
			useFreePortAndConnect,
			switchEngineAndConnect,
			reconnectLastGood,
			openSystemVpnSettings,
			retestNetworkQuality,
		},
	}
}
