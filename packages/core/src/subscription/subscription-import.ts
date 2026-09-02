import { ProfileError } from '../errors.ts'
import type { ConnectionProfile } from '../profile/connection-profile.ts'
import {
	defaultProtocolRegistry,
	type ProtocolRegistry,
} from '../protocol/connection-protocol.ts'

export interface Subscription {
	readonly id: string
	readonly url: string
	readonly name?: string
	/** Protects the source and its owned profiles from destructive mutations. */
	readonly locked?: boolean
	readonly updatedAt?: string
	readonly credentialId?: string
	readonly metadata?: SubscriptionMetadata
}

export interface SubscriptionUsage {
	readonly uploadBytes?: number
	readonly downloadBytes?: number
	readonly totalBytes?: number
	readonly expiresAt?: string
}

export interface SubscriptionMetadata {
	readonly usage?: SubscriptionUsage
	readonly supportUrl?: string
	readonly profileUrl?: string
}

export interface SubscriptionFetchResult {
	readonly body: string
	readonly metadata?: SubscriptionMetadata
}

export interface SubscriptionFetcher {
	fetch(
		subscription: Subscription,
		options?: { readonly signal?: AbortSignal },
	): Promise<string>
	fetchWithMetadata?(
		subscription: Subscription,
		options?: { readonly signal?: AbortSignal },
	): Promise<SubscriptionFetchResult>
}

export interface SubscriptionStore {
	list(): Promise<readonly Subscription[]>
	save(subscription: Subscription): Promise<void>
	remove(id: string): Promise<void>
	replaceAll?(subscriptions: readonly Subscription[]): Promise<void>
}

export interface SubscriptionParser {
	parse(input: string): readonly ConnectionProfile[]
}

export type ImportSource = NonNullable<ConnectionProfile['metadata']>['source']

export interface ImportInput {
	readonly value: string
	readonly source?: ImportSource
}

export type ImportIssueKind = 'invalid' | 'unsupported'

export interface ImportIssue {
	readonly index: number
	readonly source: ImportSource
	readonly value: string
	readonly kind: ImportIssueKind
	readonly message: string
}

export interface ImportReport {
	readonly profiles: readonly ConnectionProfile[]
	readonly issues: readonly ImportIssue[]
}

export interface SubscriptionReportParser {
	parse(
		input: ImportInput,
		registry: ProtocolRegistry,
	): ImportReport | Promise<ImportReport>
}

const defaultSubscriptionReportParser: SubscriptionReportParser = {
	parse: parseImportedProfilesWithReport,
}

export class DefaultSubscriptionParser implements SubscriptionParser {
	constructor(
		private readonly registry: ProtocolRegistry = defaultProtocolRegistry,
	) {}

	parse(input: string): readonly ConnectionProfile[] {
		return parseImportedProfiles(
			{
				value: input,
				source: 'subscription',
			},
			this.registry,
		)
	}
}

export interface SubscriptionClock {
	now(): string
}

export interface SubscriptionRefreshResult {
	readonly subscription: Subscription
	readonly profiles: readonly ConnectionProfile[]
	readonly issues: readonly ImportIssue[]
}

export async function fetchSubscription(
	subscription: Subscription,
	fetcher: SubscriptionFetcher,
	parser: SubscriptionParser = new DefaultSubscriptionParser(),
): Promise<readonly ConnectionProfile[]> {
	const input = await fetcher.fetch(subscription)

	return parser.parse(input)
}

export async function refreshSubscription(
	subscription: Subscription,
	fetcher: SubscriptionFetcher,
	clock: SubscriptionClock = { now: () => new Date().toISOString() },
	registry: ProtocolRegistry = defaultProtocolRegistry,
	reportParser: SubscriptionReportParser = defaultSubscriptionReportParser,
): Promise<SubscriptionRefreshResult> {
	const fetched = fetcher.fetchWithMetadata
		? await fetcher.fetchWithMetadata(subscription)
		: { body: await fetcher.fetch(subscription) }
	const input = fetched.body
	const result = await reportParser.parse(
		{
			value: input,
			source: 'subscription',
		},
		registry,
	)
	const metadata = parseSubscriptionMetadataValue(fetched.metadata)
	const { metadata: _previousMetadata, ...subscriptionWithoutMetadata } =
		subscription

	return {
		subscription: {
			...subscriptionWithoutMetadata,
			updatedAt: clock.now(),
			...(metadata ? { metadata } : {}),
		},
		profiles: result.profiles.map((profile) => ({
			...profile,
			metadata: {
				...profile.metadata,
				subscriptionId: subscription.id,
			},
		})),
		issues: result.issues,
	}
}

export function parseSubscriptionMetadata(headers: {
	get(name: string): string | null
}): SubscriptionMetadata | undefined {
	const usage = parseSubscriptionUserInfo(
		boundedHeader(headers.get('subscription-userinfo')),
	)
	const supportUrl = parseOptionalHttpsUrl(
		boundedHeader(headers.get('support-url')),
	)
	const profileUrl = parseOptionalHttpsUrl(
		boundedHeader(headers.get('profile-web-page-url')),
	)

	if (!usage && !supportUrl && !profileUrl) return undefined

	return {
		...(usage ? { usage } : {}),
		...(supportUrl ? { supportUrl } : {}),
		...(profileUrl ? { profileUrl } : {}),
	}
}

export function parseSubscriptionMetadataValue(
	input: unknown,
): SubscriptionMetadata | undefined {
	if (!isPlainRecord(input)) return undefined

	const usage = isPlainRecord(input.usage)
		? parseSubscriptionUsageValue(input.usage)
		: undefined
	const supportUrl = parseOptionalHttpsUrl(input.supportUrl)
	const profileUrl = parseOptionalHttpsUrl(input.profileUrl)

	if (!usage && !supportUrl && !profileUrl) return undefined

	return {
		...(usage ? { usage } : {}),
		...(supportUrl ? { supportUrl } : {}),
		...(profileUrl ? { profileUrl } : {}),
	}
}

export function parseSubscriptionUserInfo(
	value: string | null | undefined,
): SubscriptionUsage | undefined {
	if (!value) return undefined

	const fields = new Map<string, number>()
	for (const part of value.split(';')) {
		const [rawKey, rawValue] = part.split('=', 2)
		const key = rawKey?.trim().toLowerCase()
		const normalizedValue = rawValue?.trim()
		const parsed =
			normalizedValue && /^\d+$/u.test(normalizedValue)
				? Number(normalizedValue)
				: Number.NaN
		if (key && Number.isSafeInteger(parsed)) fields.set(key, parsed)
	}

	const uploadBytes = fields.get('upload')
	const downloadBytes = fields.get('download')
	const totalBytes = fields.get('total')
	const expiresAtSeconds = fields.get('expire')
	const expiresAt = parseUnixSeconds(expiresAtSeconds)

	if (
		uploadBytes === undefined &&
		downloadBytes === undefined &&
		totalBytes === undefined &&
		!expiresAt
	) {
		return undefined
	}

	return {
		...(uploadBytes !== undefined ? { uploadBytes } : {}),
		...(downloadBytes !== undefined ? { downloadBytes } : {}),
		...(totalBytes !== undefined ? { totalBytes } : {}),
		...(expiresAt ? { expiresAt } : {}),
	}
}

function parseUnixSeconds(value: number | undefined) {
	if (!value) return undefined
	const date = new Date(value * 1_000)
	return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

function parseSubscriptionUsageValue(
	input: Record<string, unknown>,
): SubscriptionUsage | undefined {
	const uploadBytes = parseByteCount(input.uploadBytes)
	const downloadBytes = parseByteCount(input.downloadBytes)
	const totalBytes = parseByteCount(input.totalBytes)
	const expiresAt = parseIsoDate(input.expiresAt)

	if (
		uploadBytes === undefined &&
		downloadBytes === undefined &&
		totalBytes === undefined &&
		!expiresAt
	) {
		return undefined
	}

	return {
		...(uploadBytes !== undefined ? { uploadBytes } : {}),
		...(downloadBytes !== undefined ? { downloadBytes } : {}),
		...(totalBytes !== undefined ? { totalBytes } : {}),
		...(expiresAt ? { expiresAt } : {}),
	}
}

function parseByteCount(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0
		? value
		: undefined
}

function parseIsoDate(value: unknown): string | undefined {
	if (
		typeof value !== 'string' ||
		value.length > 64 ||
		!/^\d{4}-\d{2}-\d{2}T/u.test(value)
	)
		return undefined
	const timestamp = Date.parse(value)
	return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString()
}

function parseOptionalHttpsUrl(value: unknown): string | undefined {
	if (typeof value !== 'string' || !value || value.length > 2_048)
		return undefined
	try {
		const url = new URL(value)
		const hasSensitiveQuery = [...url.searchParams.keys()].some((key) =>
			/^(?:access[_-]?token|api[_-]?key|auth|authorization|password|secret|token)$/iu.test(
				key,
			),
		)
		return url.protocol === 'https:' &&
			!url.username &&
			!url.password &&
			!url.hash &&
			!hasSensitiveQuery
			? url.toString()
			: undefined
	} catch {
		return undefined
	}
}

function boundedHeader(value: string | null): string | null {
	return value && value.length <= 4_096 ? value : null
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function parseImportedProfiles(
	input: string | ImportInput,
	registry: ProtocolRegistry = defaultProtocolRegistry,
): readonly ConnectionProfile[] {
	const result = parseImportedProfilesWithReport(input, registry)

	if (
		result.profiles.length === 0 &&
		result.issues.some((issue) => issue.kind === 'invalid')
	) {
		const firstIssue = result.issues.find((issue) => issue.kind === 'invalid')

		throw new ProfileError(
			'invalid_profile',
			firstIssue?.message ?? 'No supported profiles found',
		)
	}

	return result.profiles
}

export function parseImportedProfilesWithReport(
	input: string | ImportInput,
	registry: ProtocolRegistry = defaultProtocolRegistry,
): ImportReport {
	const value = typeof input === 'string' ? input : input.value
	const source =
		typeof input === 'string' ? 'manual' : (input.source ?? 'manual')
	const lines = decodeImportLines(value)
	const profiles: ConnectionProfile[] = []
	const issues: ImportIssue[] = []

	for (const [index, line] of lines.entries()) {
		try {
			if (!isConnectionUrl(line)) {
				throw new ProfileError('invalid_profile', 'Unsupported connection URL')
			}

			profiles.push(
				...registry.parse(line).map((profile) => ({
					...profile,
					metadata: {
						...profile.metadata,
						source,
					},
				})),
			)
		} catch (error) {
			issues.push({
				index,
				source,
				value: redactImportValue(line),
				kind: isConnectionUrl(line) ? 'invalid' : 'unsupported',
				message:
					error instanceof Error ? error.message : 'Unsupported connection URL',
			})
		}
	}

	return {
		profiles,
		issues,
	}
}

export function decodeSubscriptionLines(input: string): readonly string[] {
	return decodeImportLines(input)
}

function decodeImportLines(input: string) {
	const trimmed = input.trim()

	if (!trimmed) {
		return []
	}

	const directLines = splitProfileLines(trimmed)

	if (directLines.some(isConnectionUrl)) {
		return directLines
	}

	const decoded = decodeBase64(trimmed)
	const decodedLines = splitProfileLines(decoded)

	if (!decodedLines.some(isConnectionUrl)) {
		return []
	}

	return decodedLines
}

function splitProfileLines(input: string) {
	return input
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.length > 0 && !line.startsWith('#'))
}

export function isHttpSubscriptionUrl(value: string): boolean {
	const trimmed = value.trim()

	if (!trimmed || trimmed.includes('\n') || trimmed.includes('\r')) {
		return false
	}

	if (isConnectionUrl(trimmed)) {
		return false
	}

	try {
		const url = new URL(trimmed)

		return url.protocol === 'https:'
	} catch {
		return false
	}
}

function isConnectionUrl(value: string) {
	return (
		value.startsWith('vless://') ||
		value.startsWith('vmess://') ||
		value.startsWith('trojan://') ||
		value.startsWith('ss://') ||
		value.startsWith('hysteria://') ||
		value.startsWith('hysteria2://') ||
		value.startsWith('hy2://') ||
		value.startsWith('ssh://')
	)
}

export function redactImportValue(value: string): string {
	if (!isConnectionUrl(value)) {
		return value
	}
	if (value.startsWith('vmess://')) {
		return 'vmess://[redacted]'
	}

	return value
		.replace(/^([a-z][a-z0-9+.-]*:\/\/)[^@/\s]+@/iu, '$1[redacted]@')
		.replace(/#.*$/u, '')
}

function decodeBase64(input: string) {
	try {
		const normalized = padBase64(input.replaceAll('-', '+').replaceAll('_', '/'))
		const binary = globalThis.atob(normalized)
		const bytes = new Uint8Array(binary.length)

		for (let index = 0; index < binary.length; index += 1) {
			bytes[index] = binary.charCodeAt(index)
		}

		return decodeUtf8(bytes)
	} catch {
		return input
	}
}

function padBase64(input: string) {
	const remainder = input.length % 4

	return remainder === 0 ? input : `${input}${'='.repeat(4 - remainder)}`
}

function decodeUtf8(bytes: Uint8Array) {
	let output = ''

	for (let index = 0; index < bytes.length; index += 1) {
		const byte = bytes[index]

		if (byte === undefined) {
			return ''
		}

		if (byte < 0x80) {
			output += String.fromCodePoint(byte)
		} else if (byte >= 0xc0 && byte < 0xe0) {
			const next = continuation(bytes, index + 1)
			output += String.fromCodePoint(((byte & 0x1f) << 6) | (next & 0x3f))
			index += 1
		} else if (byte >= 0xe0 && byte < 0xf0) {
			const next = continuation(bytes, index + 1)
			const last = continuation(bytes, index + 2)
			output += String.fromCodePoint(
				((byte & 0x0f) << 12) | ((next & 0x3f) << 6) | (last & 0x3f),
			)
			index += 2
		} else if (byte >= 0xf0 && byte < 0xf8) {
			const second = continuation(bytes, index + 1)
			const third = continuation(bytes, index + 2)
			const fourth = continuation(bytes, index + 3)
			output += String.fromCodePoint(
				((byte & 0x07) << 18) |
					((second & 0x3f) << 12) |
					((third & 0x3f) << 6) |
					(fourth & 0x3f),
			)
			index += 3
		} else {
			return ''
		}
	}

	return output
}

function continuation(bytes: Uint8Array, index: number) {
	const byte = bytes[index]

	if (byte === undefined || (byte & 0xc0) !== 0x80) {
		return 0
	}

	return byte
}
