import { spawn } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { arch, platform } from 'node:process'

import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { detectEngineRuntimePlatform } from '@rahrow/engine/runtime/engine-runtime-resolver.ts'
import { SingBoxConfigBuilder } from '@rahrow/engine/sing-box/sing-box-engine.ts'
import { XrayConfigBuilder } from '@rahrow/engine/xray/xray-engine.ts'
import { expect, it } from 'vitest'

import { desktopEngineSidecarFileName } from './engine-sidecar.ts'

const profile: ConnectionProfile = {
	id: 'release-validation',
	protocol: 'vless',
	endpoint: { host: 'example.com', port: 443 },
	authentication: {
		id: '11111111-1111-4111-8111-111111111111',
		flow: 'xtls-rprx-vision',
	},
	security: {
		type: 'tls',
		serverName: 'www.example.com',
		fingerprint: 'chrome',
	},
}

it.skipIf(process.env.RAHROW_VALIDATE_BUNDLED_ENGINES !== '1')(
	'accepts generated VPN/TUN and proxy configs in both bundled engines',
	async () => {
		const runtimePlatform = detectEngineRuntimePlatform(platform, arch)
		const binariesDir = join(
			import.meta.dirname,
			'..',
			'..',
			'src-tauri',
			'binaries',
		)
		const binaries = {
			xray: join(
				binariesDir,
				desktopEngineSidecarFileName('xray', runtimePlatform),
			),
			singBox: join(
				binariesDir,
				desktopEngineSidecarFileName('sing-box', runtimePlatform),
			),
		}
		const directory = await mkdtemp(join(tmpdir(), 'rahrow-engine-configs-'))

		try {
			for (const mode of ['vpn', 'proxy'] as const) {
				const xrayPath = join(directory, `xray-${mode}.json`)
				const singBoxPath = join(directory, `sing-box-${mode}.json`)
				await writeFile(
					xrayPath,
					JSON.stringify(new XrayConfigBuilder().build({ profile, mode }), null, 2),
				)
				await writeFile(
					singBoxPath,
					JSON.stringify(
						new SingBoxConfigBuilder().build({ profile, mode }),
						null,
						2,
					),
				)

				await expect(
					run(binaries.xray, ['run', '-test', '-config', xrayPath]),
				).resolves.toBeUndefined()
				await expect(
					run(binaries.singBox, ['check', '-c', singBoxPath]),
				).resolves.toBeUndefined()
			}
		} finally {
			await rm(directory, { recursive: true, force: true })
		}
	},
)

function run(command: string, args: readonly string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, { stdio: 'pipe' })
		let output = ''
		child.stdout.on('data', (chunk) => {
			output += String(chunk)
		})
		child.stderr.on('data', (chunk) => {
			output += String(chunk)
		})
		child.on('error', reject)
		child.on('exit', (code) => {
			if (code === 0) resolve()
			else reject(new Error(`${command} exited with ${code}: ${output}`))
		})
	})
}
