import type { Protocol } from '../protocol/connection-protocol.ts'

export interface Endpoint {
	readonly host: string
	readonly port: number
}

export type TransportType = 'tcp' | 'ws' | 'grpc' | 'httpupgrade' | 'quic'
export type HeaderType = 'none' | 'http'
export type PacketEncoding = 'none' | 'packet' | 'xudp'

export interface Transport {
	readonly type: TransportType
	readonly path?: string
	readonly host?: string
	readonly serviceName?: string
	readonly headerType?: HeaderType
	readonly mux?: boolean
	readonly packetEncoding?: PacketEncoding
}

export type SecurityType = 'none' | 'tls' | 'reality'

export interface Security {
	readonly type: SecurityType
	readonly serverName?: string
	readonly fingerprint?: string
	readonly publicKey?: string
	readonly shortId?: string
	readonly spiderX?: string
	readonly alpn?: readonly string[]
	readonly allowInsecure?: boolean
}

export interface Authentication {
	readonly id?: string
	readonly username?: string
	readonly password?: string
	readonly hostKey?: string
	readonly method?: ShadowsocksMethod
	readonly flow?: string
	readonly encryption?: string
}

export interface HysteriaOptions {
	readonly upMbps?: number
	readonly downMbps?: number
	readonly obfsPassword?: string
}

export const SHADOWSOCKS_METHODS = [
	'aes-128-gcm',
	'aes-192-gcm',
	'aes-256-gcm',
	'chacha20-ietf-poly1305',
	'xchacha20-ietf-poly1305',
	'2022-blake3-aes-128-gcm',
	'2022-blake3-aes-256-gcm',
	'2022-blake3-chacha20-poly1305',
] as const

export type ShadowsocksMethod = (typeof SHADOWSOCKS_METHODS)[number]

export interface ProfileMetadata {
	readonly name?: string
	readonly source?:
		| 'manual'
		| 'url'
		| 'subscription'
		| 'clipboard'
		| 'share'
		| 'qr'
		| 'file'
	readonly tags?: readonly string[]
	readonly subscriptionId?: string
	readonly extensions?: {
		readonly uriQuery?: Readonly<Record<string, readonly string[]>>
		readonly vmessJson?: Readonly<Record<string, string>>
	}
}

export interface ConnectionProfile {
	readonly id: string
	readonly protocol: Protocol
	readonly endpoint: Endpoint
	readonly transport?: Transport
	readonly security?: Security
	readonly authentication?: Authentication
	readonly hysteria?: HysteriaOptions
	readonly metadata?: ProfileMetadata
}
