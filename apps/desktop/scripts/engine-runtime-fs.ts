import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { access, chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { arch, platform } from 'node:process'

import { EngineError } from '@rahrow/core/errors.ts'
import type {
	BundledEngineId,
	EngineRuntimePlatform,
} from '@rahrow/engine/runtime/engine-runtime-manifest.ts'
import {
	defaultEngineRuntimeDir,
	detectEngineRuntimePlatform,
	loadEngineRuntimeManifest,
} from '@rahrow/engine/runtime/engine-runtime-resolver.ts'
import {
	type EngineRuntimeWritableFileAccess,
	ensureEngineRuntimeArtifact,
} from '@rahrow/engine/runtime/ensure-engine-runtime.ts'

export function sha256Hex(bytes: Uint8Array): string {
	return createHash('sha256').update(bytes).digest('hex')
}

export function createNodeEngineRuntimeFiles(): EngineRuntimeWritableFileAccess {
	return {
		async exists(path) {
			try {
				await access(path)
				return true
			} catch {
				return false
			}
		},
		readFile: (path) => readFile(path),
		async writeFile(path, bytes) {
			await mkdir(dirname(path), { recursive: true })
			await writeFile(path, bytes)
		},
	}
}

export async function downloadEngineArchive(url: string): Promise<Uint8Array> {
	const response = await fetch(url, { redirect: 'follow' })
	if (!response.ok) {
		throw new EngineError(
			'invalid_config',
			`Failed to download engine runtime from ${url}: HTTP ${response.status}`,
		)
	}
	return new Uint8Array(await response.arrayBuffer())
}

export async function extractEngineArchive(
	archivePath: string,
	destinationDir: string,
): Promise<void> {
	await mkdir(destinationDir, { recursive: true })
	if (archivePath.endsWith('.tar.gz') || archivePath.endsWith('.tgz')) {
		await runCommand('tar', ['-xzf', archivePath, '-C', destinationDir])
		return
	}
	if (platform === 'win32') {
		await runCommand('tar', ['-xf', archivePath, '-C', destinationDir])
		return
	}
	await runCommand('unzip', ['-o', archivePath, '-d', destinationDir])
}

export async function makeEngineExecutable(path: string): Promise<void> {
	if (platform !== 'win32') await chmod(path, 0o755)
	if (platform !== 'darwin') return
	try {
		await runCommand('xattr', ['-d', 'com.apple.quarantine', path])
	} catch {
		// Quarantine may already be absent.
	}
}

export async function ensureHostEngineRuntime(engine: BundledEngineId) {
	return ensureEngineRuntime(engine, detectEngineRuntimePlatform(platform, arch))
}

export async function ensureEngineRuntime(
	engine: BundledEngineId,
	runtimePlatform: EngineRuntimePlatform,
) {
	const files = createNodeEngineRuntimeFiles()
	const runtimeDir = defaultEngineRuntimeDir(engine)
	const manifest = await loadEngineRuntimeManifest(runtimeDir, files)
	return ensureEngineRuntimeArtifact({
		manifest,
		platform: runtimePlatform,
		runtimeDir,
		files,
		hashSha256: sha256Hex,
		download: downloadEngineArchive,
		extract: extractEngineArchive,
		makeExecutable: makeEngineExecutable,
	})
}

function runCommand(command: string, args: readonly string[]): Promise<void> {
	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: ['ignore', 'inherit', 'inherit'],
		})
		child.on('error', reject)
		child.on('exit', (code) => {
			if (code === 0) resolve()
			else reject(new Error(`${command} ${args.join(' ')} exited with ${code}`))
		})
	})
}
