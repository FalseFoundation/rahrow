export const SUPPORTED_PROTOCOLS = [
	'vmess',
	'vless',
	'trojan',
	'shadowsocks',
	'wireguard',
	'socks',
	'hysteria',
	'http',
] as const

export type Protocol = (typeof SUPPORTED_PROTOCOLS)[number]

export function isProtocol(value: unknown): value is Protocol {
	return typeof value === 'string' && SUPPORTED_PROTOCOLS.includes(value as Protocol)
}
