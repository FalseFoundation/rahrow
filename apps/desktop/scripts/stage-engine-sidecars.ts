import { chmod, copyFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { arch, env, exit, platform } from 'node:process'
import { fileURLToPath } from 'node:url'

import { EngineError } from '@rahrow/core/errors.ts'
import type { BundledEngineId } from '@rahrow/engine/runtime/engine-runtime-manifest.ts'
import {
	defaultEngineRuntimeDir,
	detectEngineRuntimePlatform,
	loadEngineRuntimeManifest,
} from '@rahrow/engine/runtime/engine-runtime-resolver.ts'

import {
	engineRuntimePlatformFromTargetTriple,
	planDesktopEngineSidecarBundle,
} from '../src/lib/engine-sidecar.ts'
import {
	createNodeEngineRuntimeFiles,
	ensureEngineRuntime,
	sha256Hex,
} from './engine-runtime-fs.ts'

const desktopRoot = fileURLToPath(new URL('..', import.meta.url))
const binariesDir = join(desktopRoot, 'src-tauri', 'binaries')
const engines = [
	'xray',
	'sing-box',
] as const satisfies readonly BundledEngineId[]

async function main() {
	const runtimePlatform = resolvePlatform()
	const files = createNodeEngineRuntimeFiles()

	for (const engine of engines) {
		await ensureEngineRuntime(engine, runtimePlatform)
		const runtimeDir = defaultEngineRuntimeDir(engine)
		const manifest = await loadEngineRuntimeManifest(runtimeDir, files)
		const plan = await planDesktopEngineSidecarBundle({
			manifest,
			platform: runtimePlatform,
			runtimeDir,
			binariesDir,
			files,
			hashSha256: sha256Hex,
		})

		await mkdir(dirname(plan.sidecarPath), { recursive: true })
		await copyFile(plan.sourcePath, plan.sidecarPath)
		if (platform !== 'win32') await chmod(plan.sidecarPath, 0o755)
		await copyFile(
			join(dirname(plan.sourcePath), 'LICENSE'),
			join(binariesDir, `LICENSE-${engine}`),
		)
		if (engine === 'xray') {
			const sourceDir = dirname(plan.sourcePath)
			const assets =
				runtimePlatform === 'windows-x64'
					? ['geoip.dat', 'geosite.dat', 'wintun.dll', 'LICENSE-Wintun']
					: ['geoip.dat', 'geosite.dat']
			for (const asset of assets) {
				await copyFile(join(sourceDir, asset), join(binariesDir, asset))
			}
		}

		console.info(
			`Staged ${engine} ${plan.version} for ${plan.platform} at ${plan.sidecarPath}`,
		)
	}

	const { stageCliSidecar } = await import('./stage-cli-sidecar.ts')
	stageCliSidecar()
}

function resolvePlatform() {
	const targetTriple = env.TAURI_ENV_TARGET_TRIPLE?.trim()
	return targetTriple
		? engineRuntimePlatformFromTargetTriple(targetTriple)
		: detectEngineRuntimePlatform(platform, arch)
}

main().catch((error: unknown) => {
	const message =
		error instanceof EngineError
			? `${error.code}: ${error.message}`
			: error instanceof Error
				? error.message
				: 'Failed to stage engine sidecars'
	console.error(message)
	exit(1)
})
