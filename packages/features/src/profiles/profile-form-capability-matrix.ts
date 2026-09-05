import type {
	SecurityType,
	TransportType,
} from '@rahrow/core/profile/connection-profile.ts'
import type { Protocol } from '@rahrow/core/protocol/connection-protocol.ts'
import type { EngineId } from '@rahrow/core/runtime/proxy-engine.ts'

export type ProfilePlatform = 'desktop' | 'android' | 'ios'
export type ProfileFormCellStatus =
	| 'supported'
	| 'unsupported'
	| 'extension-only'
export type ProfileFormTransport = TransportType | 'none'

export interface ProfileFormCapability {
	readonly protocol: Protocol
	readonly engines: readonly EngineId[]
	readonly platforms: readonly ProfilePlatform[]
	readonly transports: readonly TransportType[]
	readonly security: readonly SecurityType[]
	readonly requiredFields: readonly string[]
	readonly optionalFields: readonly string[]
	readonly defaults: Readonly<Record<string, string | number | boolean>>
	readonly validation: readonly string[]
	readonly importExportFidelity: string
	readonly engineMapping: string
	readonly fixture: string
}

export interface ProfileFormMatrixCell {
	readonly protocol: Protocol
	readonly transport: ProfileFormTransport
	readonly security: SecurityType
	readonly engine: EngineId
	readonly platform: ProfilePlatform
	readonly status: ProfileFormCellStatus
	readonly requiredFields: readonly string[]
	readonly optionalFields: readonly string[]
	readonly defaults: Readonly<Record<string, string | number | boolean>>
	readonly validation: readonly string[]
	readonly importExportFidelity: string
	readonly engineMapping: string
	readonly fixture: string
}

const ALL_PLATFORMS = ['desktop', 'android', 'ios'] as const
const PORTABLE_TRANSPORTS = [
	'tcp',
	'ws',
	'grpc',
	'httpupgrade',
	'quic',
] as const
const PORTABLE_SECURITY = ['none', 'tls', 'reality'] as const

export const PROFILE_FORM_CAPABILITIES: readonly ProfileFormCapability[] = [
	portableCapability('vless', ['authentication.id'], 'vless-reality-grpc'),
	portableCapability('vmess', ['authentication.id'], 'vmess-tls-ws'),
	portableCapability('trojan', ['authentication.password'], 'trojan-tcp'),
	{
		protocol: 'shadowsocks',
		engines: ['xray', 'sing-box'],
		platforms: ALL_PLATFORMS,
		transports: [],
		security: ['none'],
		requiredFields: [
			'endpoint.host',
			'endpoint.port',
			'authentication.method',
			'authentication.password',
		],
		optionalFields: ['metadata.name', 'metadata.tags'],
		defaults: { 'security.type': 'none' },
		validation: ['AEAD method is supported', 'password is non-empty'],
		importExportFidelity:
			'SIP002 URI round trips semantically after normalization',
		engineMapping: 'Xray servers[] or sing-box Shadowsocks outbound',
		fixture: 'shadowsocks-aead',
	},
	{
		protocol: 'hysteria',
		engines: ['sing-box'],
		platforms: ALL_PLATFORMS,
		transports: [],
		security: ['tls'],
		requiredFields: [
			'endpoint.host',
			'endpoint.port',
			'authentication.password',
			'hysteria.upMbps',
			'hysteria.downMbps',
		],
		optionalFields: ['security.serverName', 'security.allowInsecure'],
		defaults: { 'security.type': 'tls' },
		validation: ['TLS is required', 'bandwidth values are positive'],
		importExportFidelity:
			'URI round trip is normalized; client policy remains local',
		engineMapping: 'sing-box Hysteria outbound',
		fixture: 'hysteria-tls',
	},
	{
		protocol: 'hysteria2',
		engines: ['sing-box'],
		platforms: ALL_PLATFORMS,
		transports: [],
		security: ['tls'],
		requiredFields: ['endpoint.host', 'endpoint.port', 'authentication.password'],
		optionalFields: [
			'security.serverName',
			'security.allowInsecure',
			'hysteria.upMbps',
			'hysteria.downMbps',
			'hysteria.obfsPassword',
		],
		defaults: { 'security.type': 'tls' },
		validation: ['TLS is required', 'optional bandwidth values are positive'],
		importExportFidelity:
			'URI round trip is normalized; client policy remains local',
		engineMapping: 'sing-box Hysteria2 outbound',
		fixture: 'hysteria2-obfs-tls',
	},
	{
		protocol: 'ssh',
		engines: ['sing-box'],
		platforms: ALL_PLATFORMS,
		transports: [],
		security: ['none'],
		requiredFields: [
			'endpoint.host',
			'endpoint.port',
			'authentication.username',
			'authentication.password',
			'authentication.hostKey',
		],
		optionalFields: ['metadata.name', 'metadata.tags'],
		defaults: { 'security.type': 'none' },
		validation: ['pinned host key is required'],
		importExportFidelity: 'URI round trip is normalized',
		engineMapping: 'sing-box SSH outbound',
		fixture: 'ssh-password-host-key',
	},
]

const ALL_TRANSPORTS: readonly ProfileFormTransport[] = [
	'none',
	...PORTABLE_TRANSPORTS,
]
const ALL_SECURITY: readonly SecurityType[] = ['none', 'tls', 'reality']
const ALL_ENGINES: readonly EngineId[] = ['xray', 'sing-box']

export const PROFILE_FORM_MATRIX: readonly ProfileFormMatrixCell[] =
	PROFILE_FORM_CAPABILITIES.flatMap((capability) =>
		ALL_TRANSPORTS.flatMap((transport) =>
			ALL_SECURITY.flatMap((security) =>
				ALL_ENGINES.flatMap((engine) =>
					ALL_PLATFORMS.map((platform) => {
						const transportSupported =
							transport === 'none' || capability.transports.includes(transport)
						const supported =
							capability.engines.includes(engine) &&
							capability.platforms.includes(platform) &&
							transportSupported &&
							capability.security.includes(security)
						return {
							protocol: capability.protocol,
							transport,
							security,
							engine,
							platform,
							status: supported ? 'supported' : 'unsupported',
							requiredFields: capability.requiredFields,
							optionalFields: capability.optionalFields,
							defaults: capability.defaults,
							validation: capability.validation,
							importExportFidelity: capability.importExportFidelity,
							engineMapping: supported
								? capability.engineMapping
								: 'No engine mapping for this combination',
							fixture: capability.fixture,
						}
					}),
				),
			),
		),
	)

export function profileFormCapability(
	protocol: Protocol,
): ProfileFormCapability {
	const capability = PROFILE_FORM_CAPABILITIES.find(
		(candidate) => candidate.protocol === protocol,
	)
	if (!capability) throw new Error(`Unsupported profile protocol: ${protocol}`)
	return capability
}

function portableCapability(
	protocol: 'vless' | 'vmess' | 'trojan',
	authenticationFields: readonly string[],
	fixture: string,
): ProfileFormCapability {
	return {
		protocol,
		engines: ['xray', 'sing-box'],
		platforms: ALL_PLATFORMS,
		transports: PORTABLE_TRANSPORTS,
		security: PORTABLE_SECURITY,
		requiredFields: ['endpoint.host', 'endpoint.port', ...authenticationFields],
		optionalFields: [
			'metadata.name',
			'metadata.tags',
			'transport',
			'security.serverName',
			'security.fingerprint',
			'security.allowInsecure',
		],
		defaults: { 'transport.type': 'tcp', 'security.type': 'none' },
		validation: [
			'endpoint and authentication fields are valid',
			'transport and security are represented by the selected engine',
		],
		importExportFidelity:
			'Share URI round trips semantically after normalization',
		engineMapping:
			'Xray streamSettings or sing-box transport/tls outbound fields',
		fixture,
	}
}
