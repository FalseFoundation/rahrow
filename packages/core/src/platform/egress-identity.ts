import type { ConnectionMode } from '../connection/connection-mode.ts'

export type EgressIdentityProviderId = 'cloudflare' | 'ipify'
export const MAX_EGRESS_IDENTITY_BYTES = 4_096

export interface EgressIdentityObservation {
	readonly ip: string
	readonly countryCode?: string
	readonly provider: EgressIdentityProviderId
}

export interface EgressIdentityObserveInput {
	readonly mode: ConnectionMode
	readonly proxyUrl?: string
	readonly signal?: AbortSignal
}

export interface EgressIdentity {
	observe(input: EgressIdentityObserveInput): Promise<EgressIdentityObservation>
}

export interface EgressIdentityRequest {
	readonly url: string
	readonly mode: ConnectionMode
	readonly proxyUrl?: string
	readonly signal: AbortSignal
	readonly maxBytes?: number
	readonly responseMode?: 'text' | 'byte-count'
}

export interface EgressIdentityResponse {
	readonly status: number
	readonly body: string
	readonly bytesRead?: number
}

export type EgressIdentityRequester = (
	input: EgressIdentityRequest,
) => Promise<EgressIdentityResponse>

const providers: readonly {
	readonly id: EgressIdentityProviderId
	readonly url: string
	readonly parse: (
		body: string,
	) => Omit<EgressIdentityObservation, 'provider'> | null
}[] = [
	{
		id: 'cloudflare',
		url: 'https://www.cloudflare.com/cdn-cgi/trace',
		parse: parseCloudflareTrace,
	},
	{
		id: 'ipify',
		url: 'https://api64.ipify.org?format=json',
		parse: parseIpify,
	},
]

export async function readBoundedEgressResponse(
	response: Response,
): Promise<string> {
	const declaredSize = Number(response.headers.get('content-length'))
	if (
		Number.isFinite(declaredSize) &&
		declaredSize > MAX_EGRESS_IDENTITY_BYTES
	) {
		throw new Error('External IP response is too large')
	}
	if (!response.body) return ''

	const reader = response.body.getReader()
	const chunks: Uint8Array[] = []
	let size = 0
	try {
		while (true) {
			const result = await reader.read()
			if (result.done) break
			size += result.value.byteLength
			if (size > MAX_EGRESS_IDENTITY_BYTES) {
				await reader.cancel()
				throw new Error('External IP response is too large')
			}
			chunks.push(result.value)
		}
	} finally {
		reader.releaseLock()
	}

	const bytes = new Uint8Array(size)
	let offset = 0
	for (const chunk of chunks) {
		bytes.set(chunk, offset)
		offset += chunk.byteLength
	}
	return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

const isoCountryCodes = new Set(
	'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW'.split(
		' ',
	),
)

export class EgressIdentityUnavailableError extends Error {
	constructor() {
		super('External IP is unavailable')
		this.name = 'EgressIdentityUnavailableError'
	}
}

export function createEgressIdentity(input: {
	readonly request: EgressIdentityRequester
	readonly timeoutMs?: number
}): EgressIdentity {
	const timeoutMs = input.timeoutMs ?? 4_000
	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
		throw new Error('External IP timeout must be a positive number')
	}

	return {
		async observe(observeInput) {
			if (observeInput.signal?.aborted) throw abortReason(observeInput.signal)
			if (observeInput.mode === 'proxy' && !observeInput.proxyUrl?.trim().length) {
				throw new EgressIdentityUnavailableError()
			}

			for (const provider of providers) {
				try {
					const response = await requestWithDeadline({
						request: input.request,
						url: provider.url,
						mode: observeInput.mode,
						proxyUrl: observeInput.proxyUrl,
						signal: observeInput.signal,
						timeoutMs,
					})
					if (response.status < 200 || response.status >= 300) continue
					const observation = provider.parse(response.body)
					if (observation) return { ...observation, provider: provider.id }
				} catch {
					if (observeInput.signal?.aborted) {
						throw abortReason(observeInput.signal)
					}
				}
			}

			throw new EgressIdentityUnavailableError()
		},
	}
}

function parseCloudflareTrace(
	body: string,
): Omit<EgressIdentityObservation, 'provider'> | null {
	if (body.length > 4_096) return null
	const fields = new Map<string, string>()
	for (const line of body.split('\n')) {
		const separator = line.indexOf('=')
		if (separator <= 0) continue
		fields.set(line.slice(0, separator), line.slice(separator + 1).trim())
	}
	const ip = validIp(fields.get('ip'))
	if (!ip) return null
	const countryCode = validCountryCode(fields.get('loc'))
	return countryCode ? { ip, countryCode } : { ip }
}

function parseIpify(
	body: string,
): Omit<EgressIdentityObservation, 'provider'> | null {
	if (body.length > 4_096) return null
	try {
		const value: unknown = JSON.parse(body)
		if (!value || typeof value !== 'object') return null
		const ip = validIp(Reflect.get(value, 'ip'))
		return ip ? { ip } : null
	} catch {
		return null
	}
}

function validCountryCode(value: unknown): string | null {
	if (typeof value !== 'string') return null
	const normalized = value.trim().toUpperCase()
	return isIsoCountryCode(normalized) ? normalized : null
}

export function isIsoCountryCode(value: string): boolean {
	return isoCountryCodes.has(value)
}

function validIp(value: unknown): string | null {
	if (typeof value !== 'string') return null
	const normalized = value.trim()
	if (isIpv4(normalized) || isIpv6(normalized)) return normalized
	return null
}

function isIpv4(value: string): boolean {
	const octets = value.split('.')
	return (
		octets.length === 4 &&
		octets.every(
			(octet) =>
				/^\d{1,3}$/u.test(octet) &&
				Number(octet) <= 255 &&
				(octet === '0' || !octet.startsWith('0')),
		)
	)
}

function isIpv6(value: string): boolean {
	if (!value.includes(':') || value.includes('%')) return false
	if ((value.match(/::/gu) ?? []).length > 1) return false
	const compressed = value.includes('::')
	const parts = value.split(':')
	const nonEmpty = parts.filter(Boolean)
	let units = 0
	for (const [index, part] of nonEmpty.entries()) {
		if (part.includes('.')) {
			if (index !== nonEmpty.length - 1 || !isIpv4(part)) return false
			units += 2
			continue
		}
		if (!/^[0-9a-f]{1,4}$/iu.test(part)) return false
		units += 1
	}
	return compressed ? units < 8 : units === 8
}

async function requestWithDeadline(input: {
	readonly request: EgressIdentityRequester
	readonly url: string
	readonly mode: ConnectionMode
	readonly proxyUrl?: string
	readonly signal?: AbortSignal
	readonly timeoutMs: number
}): Promise<EgressIdentityResponse> {
	const controller = new AbortController()
	const onAbort = () => controller.abort(abortReason(input.signal))
	input.signal?.addEventListener('abort', onAbort, { once: true })
	const timeout = setTimeout(
		() => controller.abort(new Error('External IP request timed out')),
		input.timeoutMs,
	)
	try {
		return await input.request({
			url: input.url,
			mode: input.mode,
			...(input.proxyUrl ? { proxyUrl: input.proxyUrl } : {}),
			signal: controller.signal,
		})
	} finally {
		clearTimeout(timeout)
		input.signal?.removeEventListener('abort', onAbort)
	}
}

function abortReason(signal: AbortSignal | undefined): unknown {
	return signal?.reason ?? new Error('External IP request canceled')
}
