export type ConnectionMode = 'vpn' | 'proxy'

export const defaultConnectionMode: ConnectionMode = 'vpn'

export function resolveConnectionMode(
	mode: ConnectionMode | undefined,
): ConnectionMode {
	return mode ?? defaultConnectionMode
}
