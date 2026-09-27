import type { Vpn } from '@rahrow/core/platform/capabilities.ts'
import type {
	VpnTunnelAvailability,
	VpnTunnelProvider,
	VpnTunnelStartInput,
	VpnTunnelStatus,
} from '@rahrow/core/platform/vpn-tunnel-provider.ts'
import type { EngineId } from '@rahrow/core/runtime/proxy-engine.ts'
import { invoke } from '@tauri-apps/api/core'

import type { DesktopConnectionCommands } from './connection-commands.ts'
import type { DesktopTunnel } from './platform-capabilities.ts'

const DEFAULT_LOCAL_PORT = 10808
const MISSING_PROVIDER_DETAIL =
	'This build has no registered OS tunnel provider.'

type DesktopTunnelEngine = Pick<
	DesktopConnectionCommands,
	'connect' | 'disconnect' | 'status'
>

/**
 * Runs the selected engine unprivileged on a loopback SOCKS listener and lets
 * the native TUN edge capture system traffic into it.
 */
export class DesktopVpnTunnelProvider implements VpnTunnelProvider {
	private profileId: string | undefined
	private engineId: EngineId | undefined

	constructor(
		private readonly vpn: Vpn,
		private readonly engine: DesktopTunnelEngine,
		private readonly tunnel?: DesktopTunnel,
	) {}

	async availability(): Promise<VpnTunnelAvailability> {
		const status = await this.vpn.status()
		if (!status.supported) {
			return {
				available: false,
				reason: 'missing-provider',
				detail: status.detail ?? MISSING_PROVIDER_DETAIL,
			}
		}
		return this.tunnel
			? { available: true }
			: {
					available: false,
					reason: 'missing-provider',
					detail: MISSING_PROVIDER_DETAIL,
				}
	}

	async start(input: VpnTunnelStartInput): Promise<void> {
		if (input.signal?.aborted) throw new Error('VPN start was cancelled')
		if (!this.tunnel) throw new Error(MISSING_PROVIDER_DETAIL)

		const socksPort = input.localPort ?? DEFAULT_LOCAL_PORT
		const result = await this.engine.connect({
			profile: input.profile,
			engineId: input.engineId,
			mode: 'proxy',
			localPort: socksPort,
		})
		if (!result.ok) throw new Error(result.error.message)

		try {
			if (input.signal?.aborted) throw new Error('VPN start was cancelled')
			await waitForLoopbackSocks(socksPort, input.signal)
			await this.tunnel.start({
				socksPort,
				serverHost: input.profile.endpoint.host,
				serverPort: input.profile.endpoint.port,
			})
		} catch (error) {
			await this.engine.disconnect()
			throw error
		}
		this.profileId = input.profile.id
		this.engineId = input.engineId
	}

	async stop(): Promise<void> {
		let tunnelError: unknown
		try {
			await this.tunnel?.stop()
		} catch (error) {
			tunnelError = error
		}
		const result = await this.engine.disconnect()
		this.profileId = undefined
		this.engineId = undefined
		if (tunnelError) throw tunnelError
		if (!result.ok) throw new Error(result.error.message)
	}

	async status(): Promise<VpnTunnelStatus> {
		const status = await this.vpn.status()
		if (status.supported === false) {
			return { state: 'unavailable', detail: status.detail }
		}
		if (!status.connected) {
			return { state: 'disconnected', detail: status.detail }
		}
		const engine = await this.engine.status()
		if (!engine.ok || engine.data.engine.status !== 'running') {
			return {
				state: 'error',
				profileId: this.profileId,
				engineId: this.engineId,
				detail: engine.ok
					? (engine.data.connection?.error ??
						'The proxy engine stopped while the VPN tunnel was active.')
					: engine.error.message,
			}
		}
		return {
			state: 'connected',
			profileId: this.profileId,
			engineId: this.engineId,
			detail: status.detail,
		}
	}
}

/** TUN must not start until the engine SOCKS listener accepts connections. */
async function waitForLoopbackSocks(
	port: number,
	signal?: AbortSignal,
): Promise<void> {
	// Unit tests drive a fake engine without Tauri IPC.
	if (!('__TAURI_INTERNALS__' in globalThis)) return

	const deadline = Date.now() + 5_000
	let lastError = 'SOCKS listener did not become ready'
	while (Date.now() < deadline) {
		if (signal?.aborted) throw new Error('VPN start was cancelled')
		const probe = await invoke<{
			readonly reachable: boolean
			readonly error?: string
		}>('rahrow_tcp_probe', {
			host: '127.0.0.1',
			port,
		})
		if (probe.reachable) return
		lastError = probe.error ?? lastError
		await new Promise((resolve) => setTimeout(resolve, 50))
	}
	throw new Error(
		`Proxy engine is not listening on 127.0.0.1:${port}: ${lastError}`,
	)
}
