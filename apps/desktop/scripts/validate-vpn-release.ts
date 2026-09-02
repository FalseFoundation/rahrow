import { readFile } from 'node:fs/promises'
import { exit } from 'node:process'
import { fileURLToPath } from 'node:url'

import {
	type DesktopVpnReleaseChannel,
	type DesktopVpnReleaseEvidence,
	evaluateDesktopVpnRelease,
	parseDesktopVpnReleaseEvidence,
} from '../src/lib/vpn-release-gates.ts'

const evidencePath = fileURLToPath(
	new URL('../src-tauri/vpn-release-evidence.json', import.meta.url),
)

async function main() {
	const channel = readChannel(process.argv.slice(2))
	const rawEvidence: unknown = JSON.parse(await readFile(evidencePath, 'utf8'))
	if (!Array.isArray(rawEvidence)) {
		throw new Error('Desktop VPN evidence must be an array')
	}
	const evidence: readonly DesktopVpnReleaseEvidence[] = rawEvidence.map(
		parseDesktopVpnReleaseEvidence,
	)

	if (evidence.length !== 3) {
		throw new Error('Desktop VPN evidence must cover macOS, Windows, and Linux')
	}
	const platforms = [...new Set(evidence.map((item) => item.platform))].sort()
	if (platforms.join(',') !== 'linux,macos,windows') {
		throw new Error('Desktop VPN evidence must cover macOS, Windows, and Linux')
	}

	let eligible = true
	for (const platformEvidence of evidence) {
		const result = evaluateDesktopVpnRelease(platformEvidence, channel)
		eligible &&= result.eligible
		const readiness = result.vpnReleaseReady ? 'ready' : 'blocked'
		console.info(`${platformEvidence.platform}: VPN release ${readiness}`)
		for (const blocker of result.blockers) console.info(`- ${blocker}`)
	}

	if (!eligible) exit(1)
}

function readChannel(args: readonly string[]): DesktopVpnReleaseChannel {
	const channelIndex = args.indexOf('--channel')
	const channel = channelIndex >= 0 ? args[channelIndex + 1] : undefined
	if (channel === 'unsigned' || channel === 'production') return channel
	throw new Error('Usage: validate-vpn-release.ts --channel unsigned|production')
}

main().catch((error: unknown) => {
	console.error(
		error instanceof Error ? error.message : 'VPN release gate failed',
	)
	exit(1)
})
