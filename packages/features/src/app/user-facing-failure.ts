import { translate } from './app-i18n.tsx'

export type RecoverableOperation = 'connect' | 'disconnect'

export const SETTINGS_DEEP_LINK_DRAWERS = [
	'diagnostics',
	'engine',
	'connection-mode',
	'proxy',
] as const

export type SettingsDeepLinkDrawer = (typeof SETTINGS_DEEP_LINK_DRAWERS)[number]

export type ConnectFailureKind =
	| 'portInUse'
	| 'engineMissing'
	| 'vpnPermission'
	| 'elevation'
	| 'systemProxyBusy'
	| 'modeUnavailable'
	| 'unknown'

/** What the primary toast button does. `retry` re-runs the failed operation. */
export type FailureRecovery =
	| { readonly kind: 'retry' }
	| { readonly kind: 'settings'; readonly drawer: SettingsDeepLinkDrawer }
	| { readonly kind: 'systemVpnSettings' }
	| { readonly kind: 'useFreePort'; readonly port: number }
	| { readonly kind: 'switchEngine'; readonly engineId: 'xray' | 'sing-box' }
	| { readonly kind: 'reconnectLastGood' }

export interface UserFacingFailure {
	readonly operation: RecoverableOperation
	readonly kind: ConnectFailureKind
	readonly title: string
	readonly description: string
	readonly retryLabel: string
	readonly recovery: FailureRecovery
	readonly recoveryLabel: string
}

const RETRY: FailureRecovery = { kind: 'retry' }

export function connectionFailure(
	operation: RecoverableOperation,
	cause?: unknown,
	options: {
		readonly canOpenSystemVpnSettings?: boolean
		readonly freeLocalPort?: number
		readonly occupyingApp?: string
		readonly alternateEngineId?: 'xray' | 'sing-box'
		readonly canReconnectLastGood?: boolean
	} = {},
): UserFacingFailure {
	const retryLabel = translate('common.tryAgain')
	if (operation === 'disconnect') {
		return {
			operation,
			kind: 'unknown',
			title: translate('connectionFailure.disconnect.title'),
			description: translate('connectionFailure.disconnect.description'),
			retryLabel,
			recovery: RETRY,
			recoveryLabel: retryLabel,
		}
	}

	const kind = classifyConnectFailure(cause)
	const recovery = connectRecovery(kind, options)
	const occupyingApp =
		options.occupyingApp ?? occupyingLocalProxyFromCause(cause)
	const descriptionKey =
		kind === 'portInUse' && recovery.kind === 'useFreePort' && occupyingApp
			? 'connectionFailure.connect.portInUseNamedWithFree'
			: kind === 'portInUse' && recovery.kind === 'useFreePort'
				? 'connectionFailure.connect.portInUseWithFree'
				: kind === 'portInUse' && occupyingApp
					? 'connectionFailure.connect.portInUseNamed'
					: kind === 'engineMissing' && recovery.kind === 'switchEngine'
						? 'connectionFailure.connect.engineMissingWithAlternate'
						: `connectionFailure.connect.${kind === 'unknown' ? 'description' : kind}`

	return {
		operation,
		kind,
		title: translate('connectionFailure.connect.title'),
		description: translate(descriptionKey, {
			port: recovery.kind === 'useFreePort' ? recovery.port : undefined,
			app: occupyingApp,
			engine:
				recovery.kind === 'switchEngine'
					? recovery.engineId === 'sing-box'
						? 'sing-box'
						: 'Xray'
					: undefined,
		}),
		retryLabel,
		recovery,
		recoveryLabel: recoveryLabel(recovery, retryLabel),
	}
}

export function classifyConnectFailure(cause: unknown): ConnectFailureKind {
	const code =
		typeof cause === 'object' && cause !== null && 'code' in cause
			? String((cause as { code: unknown }).code)
			: ''
	const message = cause instanceof Error ? cause.message : String(cause ?? '')
	if (!message.trim() && !code) return 'unknown'

	if (
		/address already in use|EADDRINUSE|local port \d+ is already in use/i.test(
			message,
		)
	) {
		return 'portInUse'
	}
	if (
		/Always-on VPN|did not allow RahRow to start a VPN|VPN permission was denied/i.test(
			message,
		)
	) {
		return 'vpnPermission'
	}
	if (
		/VPN mode is unavailable|not installed on this system|permission policy is missing|no registered OS tunnel provider|not available on mobile|System proxy fallback is not available/i.test(
			message,
		)
	) {
		return 'modeUnavailable'
	}
	if (
		/writable by other users|pkexec|VPN permission was not granted|not authorized to create the VPN/i.test(
			message,
		)
	) {
		return 'elevation'
	}
	if (/System proxy is already enabled/i.test(message)) return 'systemProxyBusy'
	if (
		code === 'engine_not_found' ||
		code === 'missing-native-plugin' ||
		/engine is not available|sidecar was not found|not bundled|runtime could not load|runtime is missing|Unsupported VPN engine|missing-native-plugin/i.test(
			message,
		)
	) {
		return 'engineMissing'
	}
	return 'unknown'
}

function connectRecovery(
	kind: ConnectFailureKind,
	options: {
		readonly canOpenSystemVpnSettings?: boolean
		readonly freeLocalPort?: number
		readonly alternateEngineId?: 'xray' | 'sing-box'
		readonly canReconnectLastGood?: boolean
	},
): FailureRecovery {
	switch (kind) {
		case 'portInUse':
			return typeof options.freeLocalPort === 'number'
				? { kind: 'useFreePort', port: options.freeLocalPort }
				: { kind: 'settings', drawer: 'proxy' }
		case 'engineMissing':
			return options.alternateEngineId
				? { kind: 'switchEngine', engineId: options.alternateEngineId }
				: { kind: 'settings', drawer: 'engine' }
		case 'modeUnavailable':
			return { kind: 'settings', drawer: 'connection-mode' }
		case 'vpnPermission':
			return options.canOpenSystemVpnSettings
				? { kind: 'systemVpnSettings' }
				: RETRY
		default:
			return options.canReconnectLastGood ? { kind: 'reconnectLastGood' } : RETRY
	}
}

function recoveryLabel(recovery: FailureRecovery, retryLabel: string): string {
	if (recovery.kind === 'useFreePort') {
		return translate('connectionFailure.actions.useFreePort', {
			port: recovery.port,
		})
	}
	if (recovery.kind === 'switchEngine') {
		return translate('connectionFailure.actions.switchEngine', {
			engine: recovery.engineId === 'sing-box' ? 'sing-box' : 'Xray',
		})
	}
	if (recovery.kind === 'reconnectLastGood') {
		return translate('connectionFailure.actions.reconnectLastGood')
	}
	if (recovery.kind === 'systemVpnSettings') {
		return translate('connectionFailure.actions.systemVpnSettings')
	}
	if (recovery.kind === 'settings') {
		return translate(`connectionFailure.actions.${recovery.drawer}`)
	}
	return retryLabel
}

/** Busy port mentioned in a native error, otherwise the caller's preferred port. */
export function busyLocalPortFromCause(
	cause: unknown,
	fallback: number,
): number {
	const message = cause instanceof Error ? cause.message : String(cause ?? '')
	const match = message.match(/local port (\d+)/i)
	if (!match) return fallback
	const port = Number(match[1])
	return Number.isFinite(port) && port >= 1 && port <= 65535 ? port : fallback
}

/** Named local proxy from a native "already in use by …" error, when present. */
export function occupyingLocalProxyFromCause(
	cause: unknown,
): string | undefined {
	const message = cause instanceof Error ? cause.message : String(cause ?? '')
	const match = message.match(/already in use by ([^.]+)\./i)
	const name = match?.[1]?.trim()
	return name ? name : undefined
}
