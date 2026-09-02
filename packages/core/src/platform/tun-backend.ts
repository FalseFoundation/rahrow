export type TunBackendId = 'hev-socks5-tunnel' | 'engine-native'

export type TunBackendPlatform =
	| 'android'
	| 'ios'
	| 'linux'
	| 'macos'
	| 'windows'
	| 'cli'
	| 'proxy'

export interface TunBackend {
	readonly id: TunBackendId
	readonly name: string
}

export interface TunBackendSelectionInput {
	readonly platform: TunBackendPlatform
	readonly hevRuntime: 'verified' | 'missing'
	readonly nativeTunnel: boolean
	/** The proxy engine can exempt its outbound sockets from the TUN route. */
	readonly socketBypass: boolean
}

export const hevSocks5Tunnel: TunBackend = {
	id: 'hev-socks5-tunnel',
	name: 'HEV Socks5 Tunnel',
}

export const engineNativeTun: TunBackend = {
	id: 'engine-native',
	name: 'Engine native tunnel',
}

const hevDefaultPlatforms = new Set<TunBackendPlatform>([
	'android',
	'linux',
	'windows',
])

/**
 * Selects HEV only after the native release proves every leak-safety gate.
 * Apple stays on its engine-native Network Extension bridge until a supported
 * packet-flow/utun descriptor contract is verified on physical devices.
 */
export function defaultTunBackend(input: TunBackendSelectionInput): TunBackend {
	return hevDefaultPlatforms.has(input.platform) &&
		input.hevRuntime === 'verified' &&
		input.nativeTunnel &&
		input.socketBypass
		? hevSocks5Tunnel
		: engineNativeTun
}
