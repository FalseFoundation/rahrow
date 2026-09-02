import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type { Protocol } from '@rahrow/core/protocol/connection-protocol.ts'
import { parseImportedProfilesWithReport } from '@rahrow/core/subscription/subscription-import.ts'
import { describe, expect, it } from 'vitest'

import { SingBoxConfigBuilder } from '../sing-box/sing-box-engine.ts'
import { XrayConfigBuilder } from '../xray/xray-engine.ts'

const repositoryRoot =
	'https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions'

interface SubscriptionCorpusSource {
	readonly name: string
	readonly url: string
	readonly expectedProtocol?: Protocol
}

const allSubscription: SubscriptionCorpusSource = {
	name: 'all protocols',
	url: `${repositoryRoot}/v2ray/all_sub.txt`,
}

const superSubscription: SubscriptionCorpusSource = {
	name: 'super subscription',
	url: `${repositoryRoot}/v2ray/super-sub.txt`,
}

const protocolSubscriptions = [
	{
		name: 'Hysteria2',
		url: `${repositoryRoot}/filtered/subs/hysteria2.txt`,
		expectedProtocol: 'hysteria2',
	},
	{
		name: 'VMess',
		url: `${repositoryRoot}/filtered/subs/vmess.txt`,
		expectedProtocol: 'vmess',
	},
	{
		name: 'VLESS',
		url: `${repositoryRoot}/filtered/subs/vless.txt`,
		expectedProtocol: 'vless',
	},
	{
		name: 'Trojan',
		url: `${repositoryRoot}/filtered/subs/trojan.txt`,
		expectedProtocol: 'trojan',
	},
	{
		name: 'Shadowsocks',
		url: `${repositoryRoot}/filtered/subs/ss.txt`,
		expectedProtocol: 'shadowsocks',
	},
] as const satisfies readonly SubscriptionCorpusSource[]

const splitSubscriptions = Array.from(
	{ length: 39 },
	(_, index): SubscriptionCorpusSource => {
		const id = index + 1
		return {
			name: `split subscription ${id}`,
			url: `${repositoryRoot}/v2ray/subs/sub${id}.txt`,
		}
	},
)

const smokeSources: readonly SubscriptionCorpusSource[] = [
	superSubscription,
	splitSubscriptions[0] as SubscriptionCorpusSource,
	...protocolSubscriptions,
]

const fullSources: readonly SubscriptionCorpusSource[] = [
	allSubscription,
	superSubscription,
	...splitSubscriptions,
	...protocolSubscriptions,
]

const importGoldenMode = process.env.RAHROW_IMPORT_GOLDENS
const enabledSources = importGoldenMode === 'full' ? fullSources : smokeSources
const xrayProtocols = new Set<Protocol>([
	'vless',
	'vmess',
	'trojan',
	'shadowsocks',
])

describe('remote subscription import golden source catalog', () => {
	it('keeps the complete upstream source set addressable', () => {
		expect(splitSubscriptions).toHaveLength(39)
		expect(splitSubscriptions[0]?.url).toBe(
			`${repositoryRoot}/v2ray/subs/sub1.txt`,
		)
		expect(splitSubscriptions.at(-1)?.url).toBe(
			`${repositoryRoot}/v2ray/subs/sub39.txt`,
		)
		expect(
			protocolSubscriptions.map((source) => source.expectedProtocol),
		).toEqual(['hysteria2', 'vmess', 'vless', 'trojan', 'shadowsocks'])
		expect(fullSources).toHaveLength(46)
	})
})

describe.skipIf(importGoldenMode !== 'smoke' && importGoldenMode !== 'full')(
	'remote subscription import goldens',
	() => {
		it.each(enabledSources)(
			'imports $name and compiles every compatible profile',
			async (source) => {
				const body = await fetchSubscriptionCorpus(source)
				const report = parseImportedProfilesWithReport({
					value: body,
					source: 'subscription',
				})

				expect(report.profiles.length).toBeGreaterThan(0)
				if (source.expectedProtocol) {
					expect(
						report.profiles.some(
							(profile) => profile.protocol === source.expectedProtocol,
						),
					).toBe(true)
				}

				assertProfilesCompile(report.profiles, source.name)
			},
			60_000,
		)
	},
)

async function fetchSubscriptionCorpus(
	source: SubscriptionCorpusSource,
): Promise<string> {
	const response = await fetch(source.url, {
		headers: { accept: 'text/plain' },
		signal: AbortSignal.timeout(30_000),
	})
	if (!response.ok) {
		throw new Error(
			`Could not fetch ${source.name} corpus: HTTP ${response.status}`,
		)
	}

	const body = await response.text()
	const maximumCorpusBytes = 8 * 1024 * 1024
	if (Buffer.byteLength(body, 'utf8') > maximumCorpusBytes) {
		throw new Error(`${source.name} corpus exceeds ${maximumCorpusBytes} bytes`)
	}
	return body
}

function assertProfilesCompile(
	profiles: readonly ConnectionProfile[],
	sourceName: string,
): void {
	const singBox = new SingBoxConfigBuilder()
	const xray = new XrayConfigBuilder()
	const failures: string[] = []

	for (const profile of profiles) {
		try {
			singBox.build({ profile })
		} catch (error) {
			failures.push(`sing-box/${profile.protocol}: ${errorMessage(error)}`)
		}

		if (xrayProtocols.has(profile.protocol)) {
			try {
				xray.build({ profile })
			} catch (error) {
				failures.push(`xray/${profile.protocol}: ${errorMessage(error)}`)
			}
		}
	}

	if (failures.length > 0) {
		throw new Error(
			`${sourceName} produced ${failures.length} engine compilation failure(s):\n${failures
				.slice(0, 20)
				.join('\n')}`,
		)
	}
}

function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Unknown engine error'
}
