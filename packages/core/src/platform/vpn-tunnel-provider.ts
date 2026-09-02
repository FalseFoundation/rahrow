import { ConnectionError, errorMessage, RahrowError } from '../errors.ts'
import type { ConnectionProfile } from '../profile/connection-profile.ts'
import type { EngineId, EngineStartSignal } from '../runtime/proxy-engine.ts'
import type { TunBackendId } from './tun-backend.ts'

export type VpnTunnelUnavailableReason =
	| 'unsupported-platform'
	| 'missing-permission'
	| 'missing-entitlement'
	| 'missing-provider'
	| 'missing-runtime'

export type VpnTunnelAvailability =
	| { readonly available: true }
	| {
			readonly available: false
			readonly reason: VpnTunnelUnavailableReason
			readonly detail: string
	  }

export type VpnTunnelState =
	| 'unavailable'
	| 'disconnected'
	| 'connecting'
	| 'connected'
	| 'disconnecting'
	| 'error'

export interface VpnTunnelStatus {
	readonly state: VpnTunnelState
	readonly profileId?: string
	readonly engineId?: EngineId
	readonly tunBackendId?: TunBackendId
	readonly detail?: string
}

export interface VpnTunnelStartInput {
	readonly profile: ConnectionProfile
	readonly engineId: EngineId
	readonly localPort?: number
	readonly signal?: EngineStartSignal
}

/** Platform edge that owns consent, TUN, routes, DNS, runtime execution, and teardown. */
export interface VpnTunnelProvider {
	availability(): Promise<VpnTunnelAvailability>
	start(input: VpnTunnelStartInput): Promise<void>
	stop(): Promise<void>
	status(): Promise<VpnTunnelStatus>
}

export class VpnTunnelCoordinator {
	#owner: VpnTunnelStartInput | undefined

	constructor(private readonly provider: VpnTunnelProvider) {}

	async connect(input: VpnTunnelStartInput): Promise<VpnTunnelStatus> {
		if (this.#owner) {
			throw new ConnectionError(
				'connection_invalid_state',
				`VPN tunnel is already owned by profile ${this.#owner.profile.id}`,
			)
		}

		const availability = await this.provider.availability()
		if (!availability.available) {
			throw new RahrowError('unsupported_capability', availability.detail)
		}

		try {
			await this.provider.start(input)
			const status = await this.provider.status()
			if (status.state !== 'connected') {
				throw new Error(status.detail ?? `VPN provider reported ${status.state}`)
			}
			this.#owner = input
			return redactStatus(status, input.profile)
		} catch (error) {
			await this.rollbackStart()
			throw new ConnectionError(
				'engine_start_failed',
				redactProfileSecrets(
					errorMessage(error, 'VPN tunnel failed to start'),
					input.profile,
				),
				{ cause: error },
			)
		}
	}

	async disconnect(): Promise<VpnTunnelStatus> {
		const owner = this.#owner
		if (!owner) {
			const current = await this.provider.status()
			if (['disconnected', 'unavailable'].includes(current.state)) return current
			try {
				await this.provider.stop()
				return this.provider.status()
			} catch (error) {
				throw new ConnectionError(
					'engine_stop_failed',
					errorMessage(error, 'VPN tunnel failed to stop'),
					{ cause: error },
				)
			}
		}

		try {
			await this.provider.stop()
			this.#owner = undefined
			return redactStatus(await this.provider.status(), owner.profile)
		} catch (error) {
			throw new ConnectionError(
				'engine_stop_failed',
				redactProfileSecrets(
					errorMessage(error, 'VPN tunnel failed to stop'),
					owner.profile,
				),
				{ cause: error },
			)
		}
	}

	async recover(): Promise<VpnTunnelStatus> {
		const status = await this.provider.status()
		if (!this.#owner && !['disconnected', 'unavailable'].includes(status.state)) {
			await this.provider.stop()
		}
		return this.status()
	}

	async status(): Promise<VpnTunnelStatus> {
		const status = await this.provider.status()
		return this.#owner ? redactStatus(status, this.#owner.profile) : status
	}

	private async rollbackStart() {
		this.#owner = undefined
		try {
			await this.provider.stop()
		} catch {
			// The original start failure is the actionable diagnostic.
		}
	}
}

function redactStatus(
	status: VpnTunnelStatus,
	profile: ConnectionProfile,
): VpnTunnelStatus {
	return status.detail
		? { ...status, detail: redactProfileSecrets(status.detail, profile) }
		: status
}

function redactProfileSecrets(value: string, profile: ConnectionProfile) {
	const secrets = [
		profile.authentication?.password,
		profile.authentication?.id,
		profile.security?.publicKey,
	].filter((secret): secret is string => Boolean(secret))

	return secrets.reduce(
		(redacted, secret) => redacted.replaceAll(secret, '[redacted]'),
		value,
	)
}
