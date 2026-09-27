import { createAdActionEventId } from '@rahrow/ads/ad-gate.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { recordAdAction } from '../ads/record-ad-action.ts'
import { translate } from '../app/app-i18n.tsx'
import { presentLatency } from '../app/latency-presentation.ts'
import {
	type ConnectionSnapshot,
	type LatencySnapshot,
	useAppRuntime,
} from '../app/runtime.tsx'
import {
	connectionFailure,
	type UserFacingFailure,
} from '../app/user-facing-failure.ts'
import { useSmartConnect } from '../smart-connect/useSmartConnect.ts'
import {
	canConnect,
	canDisconnect,
	connectionModeUnavailableReason,
	formatConnectionState,
	profileLabel,
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
	const [pendingAction, setPendingAction] = useState<
		'connect' | 'disconnect' | 'test' | 'refresh' | null
	>(null)
	const isMounted = useRef(true)
	const synchronization = useRef<Promise<void> | null>(null)
	const synchronizationQueued = useRef(false)
	const backgroundRefreshScheduled = useRef(false)
	const hasAuthoritativeState = useRef(false)

	const selectedProfile = useMemo(
		() => profiles.find((profile) => profile.id === selectedProfileId),
		[profiles, selectedProfileId],
	)
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
	const networkQuality = usePostConnectNetworkQuality({
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
		if (snapshot.profileId) setSelectedProfileId(snapshot.profileId)
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
			const activeProfileId = snapshot.profileId ?? settings.activeProfileId
			setSelectedProfileId(
				activeProfileId &&
					nextProfiles.some((profile) => profile.id === activeProfileId)
					? activeProfileId
					: (nextProfiles[0]?.id ?? ''),
			)
			setLocalPort(settings.localPort ?? 10808)
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
			await runtime.connection.connect(selectedProfile, {
				localPort,
				mode: connectionMode,
			})
			await runtime.settingsStore.write({
				...settings,
				activeProfileId: selectedProfile.id,
				localPort,
				engineId: settings.engineId ?? 'sing-box',
				connectionMode,
			})
			logger.info(
				{
					action: 'connection.connect',
					outcome: 'success',
					connectionMode,
					engineId: settings.engineId ?? 'sing-box',
					protocol: selectedProfile.protocol,
				},
				`Connected with ${settings.engineId ?? 'sing-box'} in ${connectionMode} mode`,
			)
			await refresh()
			setMessage(translate('home.status.connected'))
		} catch (error) {
			logger.warn(
				{
					action: 'connection.connect',
					outcome: 'failure',
					errorType: error instanceof Error ? error.name : typeof error,
				},
				'Connection attempt failed',
			)
			const nextFailure = connectionFailure('connect')
			setFailure(nextFailure)
			setMessage(nextFailure.title)
		} finally {
			setPendingAction(null)
		}
	}, [
		localPort,
		logger,
		refresh,
		runtime,
		selectedProfile,
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
			void runtime.advertising?.gate
				.recordProfileSelection(previousProfileId, profile.id)
				.catch((error) => {
					logger.warn(
						{
							action: 'advertising.profile-gate.record',
							outcome: 'failure',
							errorType: error instanceof Error ? error.name : typeof error,
						},
						'Profile selection changed, but the advertising gate could not be recorded',
					)
				})
		},
		[logger, runtime.advertising, selectedProfileId],
	)

	return {
		smartConnect,
		state: {
			profiles,
			engineId: runtime.engine.id,
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
			connect,
			disconnect,
			testSelected,
			refresh,
			retryFailure,
		},
	}
}
