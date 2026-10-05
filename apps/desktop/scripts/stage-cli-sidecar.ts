import { spawnSync } from 'node:child_process'
import {
	chmodSync,
	copyFileSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { arch, env, exit, platform } from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

import type { EngineRuntimePlatform } from '@rahrow/engine/runtime/engine-runtime-manifest.ts'
import { detectEngineRuntimePlatform } from '@rahrow/engine/runtime/engine-runtime-resolver.ts'

import {
	desktopEngineSidecarTargetTriple,
	engineRuntimePlatformFromTargetTriple,
} from '../src/lib/engine-sidecar.ts'

const desktopRoot = fileURLToPath(new URL('..', import.meta.url))
const binariesDir = join(desktopRoot, 'src-tauri', 'binaries')
const cliEntry = join(desktopRoot, 'scripts/cli-sea-entry.ts')
const require = createRequire(import.meta.url)

export function desktopCliSidecarFileName(
	runtimePlatform: EngineRuntimePlatform,
) {
	const triple = desktopEngineSidecarTargetTriple(runtimePlatform)
	return runtimePlatform === 'windows-x64'
		? `rahrow-${triple}.exe`
		: `rahrow-${triple}`
}

export function planCliSidecarPaths(runtimePlatform: EngineRuntimePlatform) {
	const fileName = desktopCliSidecarFileName(runtimePlatform)
	return {
		platform: runtimePlatform,
		triple: desktopEngineSidecarTargetTriple(runtimePlatform),
		sidecarPath: join(binariesDir, fileName),
		windowsLauncherPath: join(binariesDir, 'rahrow.cmd'),
	}
}

export function buildCliSidecarBundle(outfile: string) {
	const esbuild = require('esbuild') as typeof import('esbuild')
	esbuild.buildSync({
		entryPoints: [cliEntry],
		outfile,
		bundle: true,
		platform: 'node',
		format: 'cjs',
		target: 'node24',
		logLevel: 'silent',
	})
}

function run(command: string, args: readonly string[]) {
	const result = spawnSync(command, args, {
		cwd: desktopRoot,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	})
	if (result.error) throw result.error
	if (result.status !== 0) {
		throw new Error(
			`${command} ${args.join(' ')} failed: ${result.stderr || result.stdout}`,
		)
	}
	return result.stdout
}

function readSeaFuse(nodeBinary: string) {
	const bytes = readFileSync(nodeBinary)
	const match = /NODE_SEA_FUSE_[0-9a-f]+/.exec(bytes.toString('latin1'))
	if (!match) {
		throw new Error(
			`Node binary is missing a NODE_SEA_FUSE sentinel: ${nodeBinary}`,
		)
	}
	return match[0]
}

function injectSeaBlob(
	nodeBinary: string,
	blobPath: string,
	outputPath: string,
) {
	copyFileSync(nodeBinary, outputPath)
	if (platform === 'darwin') {
		run('codesign', ['--remove-signature', outputPath])
	}
	const fuse = readSeaFuse(outputPath)
	const args = [
		'--yes',
		'postject',
		outputPath,
		'NODE_SEA_BLOB',
		blobPath,
		'--sentinel-fuse',
		fuse,
	]
	if (platform === 'darwin') {
		args.push('--macho-segment-name', 'NODE_SEA')
	}
	run('npx', args)
	if (platform !== 'win32') chmodSync(outputPath, 0o755)
}

export function writeWindowsCliLauncher(launcherPath: string, exeName: string) {
	writeFileSync(
		launcherPath,
		[`@echo off`, `"%~dp0${exeName}" %*`, ``].join('\r\n'),
	)
}

function resolveRuntimePlatform() {
	return env.TAURI_ENV_TARGET_TRIPLE?.trim()
		? engineRuntimePlatformFromTargetTriple(env.TAURI_ENV_TARGET_TRIPLE.trim())
		: detectEngineRuntimePlatform(platform, arch)
}

export function stageCliSidecar() {
	const runtimePlatform = resolveRuntimePlatform()
	const plan = planCliSidecarPaths(runtimePlatform)
	mkdirSync(binariesDir, { recursive: true })

	const workDir = join(binariesDir, '.cli-sea')
	rmSync(workDir, { recursive: true, force: true })
	mkdirSync(workDir, { recursive: true })
	const bundlePath = join(workDir, 'cli.cjs')
	const seaConfigPath = join(workDir, 'sea-config.json')
	const blobPath = join(workDir, 'sea-prep.blob')

	buildCliSidecarBundle(bundlePath)
	writeFileSync(
		seaConfigPath,
		`${JSON.stringify(
			{
				main: bundlePath,
				output: blobPath,
				disableExperimentalSEAWarning: true,
			},
			null,
			'\t',
		)}\n`,
	)
	run(process.execPath, ['--experimental-sea-config', seaConfigPath])
	injectSeaBlob(process.execPath, blobPath, plan.sidecarPath)

	if (runtimePlatform === 'windows-x64') {
		writeWindowsCliLauncher(
			plan.windowsLauncherPath,
			desktopCliSidecarFileName(runtimePlatform),
		)
	}

	rmSync(workDir, { recursive: true, force: true })
	console.info(`Staged CLI sidecar for ${plan.platform} at ${plan.sidecarPath}`)
	return plan
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	try {
		stageCliSidecar()
	} catch (error: unknown) {
		console.error(error instanceof Error ? error.message : error)
		exit(1)
	}
}
