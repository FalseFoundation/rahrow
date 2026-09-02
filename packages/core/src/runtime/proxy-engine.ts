import type { ConnectionMode } from '../connection/connection-mode.ts'
import type { ConnectionProfile } from '../profile/connection-profile.ts'
import type { Protocol } from '../protocol/connection-protocol.ts'

export type EngineId = 'xray' | 'sing-box' | (string & {})

export type EngineStatus =
	| 'stopped'
	| 'starting'
	| 'running'
	| 'stopping'
	| 'error'

export interface EngineStartInput {
	readonly profile: ConnectionProfile
	/** Optional selector consumed by composite engines before delegating start. */
	readonly engineId?: EngineId
	readonly mode?: ConnectionMode
	readonly localPort?: number
	readonly options?: Readonly<Record<string, unknown>>
	readonly signal?: EngineStartSignal
}

export interface EngineStartSignal {
	readonly aborted: boolean
	readonly reason?: unknown
}

export interface LatencyResult {
	readonly profileId: string
	readonly reachable: boolean
	readonly checkedAt: string
	readonly latencyMs?: number
	readonly error?: string
}

export interface EngineHealth {
	readonly status: EngineStatus
	readonly checkedAt: string
	readonly detail?: string
}

export interface EngineManifest {
	readonly id: EngineId
	readonly supportedProtocols: readonly Protocol[]
}

export interface ProxyEngine {
	readonly id: EngineId
	readonly manifest: EngineManifest
	start(input: EngineStartInput): Promise<void>
	stop(): Promise<void>
	restart(input: EngineStartInput): Promise<void>
	status(): Promise<EngineHealth>
	test(profile: ConnectionProfile): Promise<LatencyResult>
}
