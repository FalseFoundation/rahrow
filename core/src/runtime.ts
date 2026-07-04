import type { Protocol } from './protocols.ts'

export type RuntimeName = 'xray' | 'sing-box' | 'wireguard' | 'socks' | 'hysteria' | 'http' | 'mock'

export interface RuntimeCapabilities {
	readonly tunnel?: boolean
	readonly proxy?: boolean
	readonly udp?: boolean
	readonly tcp?: boolean
	readonly http?: boolean
	readonly diagnostics?: boolean
}

export interface RuntimeManifest {
	readonly name: RuntimeName
	readonly capabilities: RuntimeCapabilities
	readonly supportedProtocols: readonly Protocol[]
}

export interface RuntimeEndpoint {
	readonly host: string
	readonly port: number
	readonly protocol: Protocol
	readonly id?: string
}

export interface RuntimeConfig {
	readonly runtime: RuntimeName
	readonly endpoints: readonly RuntimeEndpoint[]
	readonly options?: Readonly<Record<string, unknown>>
}

export interface NormalizedRuntimeConfig extends RuntimeConfig {
	readonly options: Readonly<Record<string, unknown>>
}

export interface RuntimeHealth {
	readonly status: 'starting' | 'healthy' | 'unhealthy' | 'stopped'
	readonly checkedAt: string
	readonly detail?: string
}

export interface RuntimeAdapter {
	readonly manifest: RuntimeManifest
	start(config: NormalizedRuntimeConfig): Promise<void>
	stop(): Promise<void>
	health(): Promise<RuntimeHealth>
	transformConfig(config: NormalizedRuntimeConfig): Promise<unknown>
}
