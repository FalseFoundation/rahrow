import {
	type Connection,
	ConnectionController,
	SystemClock,
} from '@rahrow/core/connection/connection-controller.ts'
import type { ConnectionMode } from '@rahrow/core/connection/connection-mode.ts'
import { RahrowError } from '@rahrow/core/errors.ts'
import type { Logger } from '@rahrow/core/logging/logger.ts'
import { silentLogger } from '@rahrow/core/logging/silent-logger.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { parseConnectionProfile } from '@rahrow/core/profile/profile-schema.ts'
import type {
	EngineHealth,
	EngineId,
	LatencyResult,
	ProxyEngine,
} from '@rahrow/core/runtime/proxy-engine.ts'
import { createEngineRegistry } from '@rahrow/engine/registry/engine-registry.ts'
import { SelectedEngine } from '@rahrow/engine/registry/selected-engine.ts'
import {
	type SingBoxConfig,
	SingBoxConfigBuilder,
	SingBoxEngine,
	type SingBoxProcess,
} from '@rahrow/engine/sing-box/sing-box-engine.ts'
import {
	type XrayConfig,
	XrayConfigBuilder,
	XrayEngine,
	type XrayLatencyProbe,
	type XrayProcess,
} from '@rahrow/engine/xray/xray-engine.ts'
import { invoke } from '@tauri-apps/api/core'

export interface DesktopConnectInput {
	readonly profile: unknown
	readonly engineId?: EngineId
	readonly mode?: ConnectionMode
	readonly localPort?: number
	readonly options?: Readonly<Record<string, unknown>>
}

export interface DesktopCommandError {
	readonly code: string
	readonly message: string
}

export type DesktopCommandResult<T> =
	| { readonly ok: true; readonly data: T }
	| { readonly ok: false; readonly error: DesktopCommandError }

export interface DesktopConnectionStatus {
	readonly connection?: Connection
	readonly engine: EngineHealth
}

export interface DesktopNativeEngineStatus {
	readonly running: boolean
}

export interface DesktopNativeTcpProbeResult {
	readonly reachable: boolean
	readonly latencyMs?: number
	readonly error?: string
}

export interface DesktopNativeCommands {
	startXray(config: XrayConfig): Promise<void>
	stopXray(): Promise<void>
	statusXray(): Promise<DesktopNativeEngineStatus>
	startSingBox?(config: SingBoxConfig): Promise<void>
	stopSingBox?(): Promise<void>
	statusSingBox?(): Promise<DesktopNativeEngineStatus>
	probeTcp(host: string, port: number): Promise<DesktopNativeTcpProbeResult>
}

export type TauriInvoke = <T>(
	command: string,
	args?: Record<string, unknown>,
) => Promise<T>

// Native start/stop. Engine binaries resolve from explicit RahRow overrides or
// the pinned sidecars staged from engines/*/runtime.json — never PATH search.
export class TauriXrayProcess implements XrayProcess {
	constructor(private readonly native: DesktopNativeCommands) {}

	async start(config: XrayConfig): Promise<void> {
		await this.native.startXray(config)
	}

	async stop(): Promise<void> {
		await this.native.stopXray()
	}
}

export class TauriSingBoxProcess implements SingBoxProcess {
	constructor(private readonly native: DesktopNativeCommands) {}

	async start(config: SingBoxConfig): Promise<void> {
		if (!this.native.startSingBox) {
			throw new RahrowError(
				'unsupported_capability',
				'sing-box is not available in this desktop runtime',
			)
		}

		await this.native.startSingBox(config)
	}

	async stop(): Promise<void> {
		await this.native.stopSingBox?.()
	}
}

export class TauriEngineLatencyProbe implements XrayLatencyProbe {
	constructor(
		private readonly native: DesktopNativeCommands,
		private readonly clock = new SystemClock(),
	) {}

	async test(profile: ConnectionProfile): Promise<LatencyResult> {
		const result = await this.native.probeTcp(
			profile.endpoint.host,
			profile.endpoint.port,
		)

		return {
			profileId: profile.id,
			reachable: result.reachable,
			checkedAt: this.clock.now(),
			latencyMs: result.latencyMs,
			error: result.error,
		}
	}
}

export class DesktopConnectionCommands {
	constructor(
		private readonly controller: ConnectionController,
		private readonly engine: ProxyEngine,
	) {}

	async connect(
		input: DesktopConnectInput,
	): Promise<DesktopCommandResult<Connection>> {
		return this.run(async () =>
			this.controller.connect({
				...input,
				profile: parseConnectionProfile(input.profile),
			}),
		)
	}

	async disconnect(): Promise<DesktopCommandResult<Connection | undefined>> {
		return this.run(() => this.controller.disconnect())
	}

	async restart(
		input?: DesktopConnectInput,
	): Promise<DesktopCommandResult<Connection>> {
		return this.run(async () => {
			const activeProfile = this.controller.current?.profile
			const profile = input ? parseConnectionProfile(input.profile) : activeProfile

			if (!profile) {
				throw new RahrowError(
					'connection_invalid_state',
					'No active profile is available',
				)
			}

			return this.controller.reconfigure({
				...input,
				profile,
			})
		})
	}

	async status(): Promise<DesktopCommandResult<DesktopConnectionStatus>> {
		return this.run(async () => ({
			connection: this.controller.current,
			engine: await this.engine.status(),
		}))
	}

	async latency(
		profile?: unknown,
	): Promise<DesktopCommandResult<LatencyResult>> {
		return this.run(() => {
			const parsedProfile =
				profile === undefined
					? undefined
					: (parseConnectionProfile(profile) as ConnectionProfile)

			return this.controller.test(parsedProfile)
		})
	}

	private async run<T>(
		command: () => Promise<T>,
	): Promise<DesktopCommandResult<T>> {
		try {
			return {
				ok: true,
				data: await command(),
			}
		} catch (error) {
			return {
				ok: false,
				error: toDesktopCommandError(error),
			}
		}
	}
}

export function createTauriNativeCommands(
	invokeFn: TauriInvoke = invoke as TauriInvoke,
): DesktopNativeCommands {
	return {
		startXray(config) {
			return invokeFn('rahrow_xray_start', { config })
		},
		stopXray() {
			return invokeFn('rahrow_xray_stop')
		},
		statusXray() {
			return invokeFn<DesktopNativeEngineStatus>('rahrow_xray_status')
		},
		startSingBox(config) {
			return invokeFn('rahrow_sing_box_start', { config })
		},
		stopSingBox() {
			return invokeFn('rahrow_sing_box_stop')
		},
		statusSingBox() {
			return invokeFn<DesktopNativeEngineStatus>('rahrow_sing_box_status')
		},
		probeTcp(host, port) {
			return invokeFn<DesktopNativeTcpProbeResult>('rahrow_tcp_probe', {
				host,
				port,
			})
		},
	}
}

export function createDesktopConnectionStack(
	native: DesktopNativeCommands = createTauriNativeCommands(),
	options: {
		readonly logger?: Logger
		readonly selectEngine?: () => EngineId | Promise<EngineId>
	} = {},
) {
	const logger = options.logger ?? silentLogger
	const xray = new XrayEngine(
		new TauriXrayProcess(native),
		new XrayConfigBuilder(),
		new TauriEngineLatencyProbe(native),
		new SystemClock(),
		logger,
	)
	const singBox = new SingBoxEngine(
		new TauriSingBoxProcess(native),
		new SingBoxConfigBuilder(),
		new TauriEngineLatencyProbe(native),
		new SystemClock(),
		logger,
	)
	const registry = createEngineRegistry([xray, singBox])
	const engine = new SelectedEngine(
		registry,
		options.selectEngine ?? (() => 'xray'),
	)

	return {
		engine,
		registry,
		commands: new DesktopConnectionCommands(
			new ConnectionController(engine, new SystemClock(), { logger }),
			engine,
		),
	}
}

export function createDesktopConnectionCommands(
	native: DesktopNativeCommands = createTauriNativeCommands(),
): DesktopConnectionCommands {
	return createDesktopConnectionStack(native).commands
}

export const desktopConnectionCommands = createDesktopConnectionCommands()

function toDesktopCommandError(error: unknown): DesktopCommandError {
	if (error instanceof RahrowError) {
		return {
			code: error.code,
			message: error.message,
		}
	}

	if (error instanceof Error) {
		return {
			code: 'desktop_command_failed',
			message: error.message,
		}
	}

	return {
		code: 'desktop_command_failed',
		message: 'Unknown desktop command error',
	}
}
