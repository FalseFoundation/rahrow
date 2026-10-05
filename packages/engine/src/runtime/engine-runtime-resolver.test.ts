import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { EngineError } from '@rahrow/core/errors.ts'
import { describe, expect, it } from 'vitest'

import {
	type EngineRuntimeManifest,
	parseEngineRuntimeManifest,
} from './engine-runtime-manifest.ts'
import {
	defaultEngineRuntimeDir,
	detectEngineRuntimePlatform,
	type EngineRuntimeFileAccess,
	loadEngineRuntimeManifest,
	resolveEngineRuntimeBinary,
	XRAY_BINARY_ENV,
} from './engine-runtime-resolver.ts'

const helloBytes = new TextEncoder().encode('hello')
const helloSha256 =
	'2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
const runtimeDir = join('/runtime', 'xray')

function bundledManifest(): EngineRuntimeManifest {
	return parseEngineRuntimeManifest({
		schemaVersion: 1,
		engine: 'xray',
		version: '26.3.27',
		availability: 'bundled',
		binaryName: 'xray',
		environmentVariable: XRAY_BINARY_ENV,
		artifacts: [
			{
				platform: 'linux-x64',
				archiveName: 'Xray-linux-64.zip',
				executablePath: 'xray',
				checksum: {
					algorithm: 'sha256',
					value: helloSha256,
				},
				url: 'https://github.com/XTLS/Xray-core/releases/download/v26.3.27/Xray-linux-64.zip',
			},
		],
	})
}

function hostProvidedManifest(): EngineRuntimeManifest {
	return parseEngineRuntimeManifest({
		schemaVersion: 1,
		engine: 'xray',
		version: 'host-provided',
		availability: 'host-provided',
		binaryName: 'xray',
		environmentVariable: XRAY_BINARY_ENV,
		artifacts: [],
	})
}

function memoryFiles(
	files: Readonly<Record<string, Uint8Array | string>>,
): EngineRuntimeFileAccess {
	const stored = new Map(
		Object.entries(files).map(([path, contents]) => [
			path,
			typeof contents === 'string' ? new TextEncoder().encode(contents) : contents,
		]),
	)

	return {
		exists(path) {
			return stored.has(path)
		},
		readFile(path) {
			const contents = stored.get(path)
			if (!contents) {
				throw new Error(`missing file: ${path}`)
			}

			return contents
		},
	}
}

describe('detectEngineRuntimePlatform', () => {
	it('maps Node platform and arch pairs onto the runtime manifest platforms', () => {
		expect(detectEngineRuntimePlatform('darwin', 'arm64')).toBe('darwin-arm64')
		expect(detectEngineRuntimePlatform('darwin', 'x64')).toBe('darwin-x64')
		expect(detectEngineRuntimePlatform('linux', 'arm64')).toBe('linux-arm64')
		expect(detectEngineRuntimePlatform('linux', 'x64')).toBe('linux-x64')
		expect(detectEngineRuntimePlatform('win32', 'x64')).toBe('windows-x64')
	})

	it('fails clearly for unsupported platforms instead of guessing', () => {
		expect(() => detectEngineRuntimePlatform('freebsd', 'x64')).toThrow(
			EngineError,
		)
	})
})

describe('resolveEngineRuntimeBinary', () => {
	it('uses an explicit RAHROW_XRAY_BINARY path without searching PATH', async () => {
		const binaryPath = join(runtimeDir, 'custom', 'xray')
		const resolved = await resolveEngineRuntimeBinary({
			manifest: bundledManifest(),
			env: { [XRAY_BINARY_ENV]: binaryPath },
			platform: 'linux-x64',
			runtimeDir,
			files: memoryFiles({ [binaryPath]: helloBytes }),
			hashSha256: async () => 'should-not-be-used',
		})

		expect(resolved).toEqual({
			binaryPath,
			source: 'env',
			version: '26.3.27',
			platform: 'linux-x64',
		})
	})

	it('rejects PATH-style binary names so production cannot silently guess', async () => {
		await expect(
			resolveEngineRuntimeBinary({
				manifest: hostProvidedManifest(),
				env: { [XRAY_BINARY_ENV]: 'xray', PATH: '/usr/bin' },
				platform: 'linux-x64',
				runtimeDir,
				files: memoryFiles({}),
				hashSha256: async () => helloSha256,
			}),
		).rejects.toMatchObject({
			code: 'invalid_config',
			message: expect.stringContaining(XRAY_BINARY_ENV),
		})
	})

	it('fails when the explicit env path does not exist', async () => {
		await expect(
			resolveEngineRuntimeBinary({
				manifest: hostProvidedManifest(),
				env: { [XRAY_BINARY_ENV]: join(runtimeDir, 'missing', 'xray') },
				platform: 'linux-x64',
				runtimeDir,
				files: memoryFiles({}),
				hashSha256: async () => helloSha256,
			}),
		).rejects.toMatchObject({
			code: 'invalid_config',
			message: expect.stringContaining(XRAY_BINARY_ENV),
		})
	})

	it('resolves a bundled artifact relative to the runtime directory and verifies its checksum', async () => {
		const archivePath = join(runtimeDir, 'Xray-linux-64.zip')
		const binaryPath = join(runtimeDir, 'linux-x64', 'xray')
		const resolved = await resolveEngineRuntimeBinary({
			manifest: bundledManifest(),
			env: {},
			platform: 'linux-x64',
			runtimeDir,
			files: memoryFiles({
				[archivePath]: helloBytes,
				[binaryPath]: new Uint8Array([1, 2, 3]),
			}),
			hashSha256: async (bytes) =>
				bytes === helloBytes || Buffer.from(bytes).equals(Buffer.from(helloBytes))
					? helloSha256
					: 'mismatch',
		})

		expect(resolved).toEqual({
			binaryPath,
			source: 'bundled-artifact',
			version: '26.3.27',
			platform: 'linux-x64',
		})
	})

	it('verifies the executable checksum when only the extracted binary is present', async () => {
		const binaryPath = join(runtimeDir, 'linux-x64', 'xray')
		const resolved = await resolveEngineRuntimeBinary({
			manifest: bundledManifest(),
			env: {},
			platform: 'linux-x64',
			runtimeDir,
			files: memoryFiles({
				[binaryPath]: helloBytes,
			}),
			hashSha256: async () => helloSha256,
		})

		expect(resolved.binaryPath).toBe(binaryPath)
		expect(resolved.source).toBe('bundled-artifact')
	})

	it('fails on checksum mismatch for bundled artifacts', async () => {
		const binaryPath = join(runtimeDir, 'linux-x64', 'xray')

		await expect(
			resolveEngineRuntimeBinary({
				manifest: bundledManifest(),
				env: {},
				platform: 'linux-x64',
				runtimeDir,
				files: memoryFiles({
					[binaryPath]: helloBytes,
				}),
				hashSha256: async () => 'b'.repeat(64),
			}),
		).rejects.toMatchObject({
			code: 'invalid_config',
			message: expect.stringContaining('checksum'),
		})
	})

	it('fails clearly when a bundled binary is missing and never searches PATH', async () => {
		await expect(
			resolveEngineRuntimeBinary({
				manifest: bundledManifest(),
				env: { PATH: '/usr/bin' },
				platform: 'linux-x64',
				runtimeDir,
				files: memoryFiles({}),
				hashSha256: async () => helloSha256,
			}),
		).rejects.toMatchObject({
			code: 'invalid_config',
			message: expect.stringMatching(
				new RegExp(`${XRAY_BINARY_ENV}|linux-x64|26\\.3\\.27`),
			),
		})
	})

	it('requires RAHROW_XRAY_BINARY for host-provided manifests', async () => {
		await expect(
			resolveEngineRuntimeBinary({
				manifest: hostProvidedManifest(),
				env: {},
				platform: 'darwin-arm64',
				runtimeDir,
				files: memoryFiles({}),
				hashSha256: async () => helloSha256,
			}),
		).rejects.toMatchObject({
			code: 'invalid_config',
			message: expect.stringContaining(XRAY_BINARY_ENV),
		})
	})
})

describe('default Xray runtime metadata', () => {
	it('points at engines/xray in the repository', () => {
		expect(defaultEngineRuntimeDir('xray').replaceAll('\\', '/')).toMatch(
			/engines\/xray$/,
		)
	})

	it('loads the committed runtime.json as a bundled pin with platform artifacts', () => {
		const manifestPath = fileURLToPath(
			new URL('../../../../engines/xray/runtime.json', import.meta.url),
		)
		const manifest = parseEngineRuntimeManifest(
			JSON.parse(readFileSync(manifestPath, 'utf8')),
		)

		expect(manifest.version.length).toBeGreaterThan(0)
		expect(manifest.availability).toBe('bundled')
		for (const artifact of manifest.artifacts) {
			expect(artifact.url).toContain(`/v${manifest.version}/`)
			expect(artifact.checksum.value).toMatch(/^[a-f0-9]{64}$/u)
		}
		expect(manifest.artifacts.map((artifact) => artifact.platform)).toEqual([
			'darwin-arm64',
			'darwin-x64',
			'linux-arm64',
			'linux-x64',
			'windows-x64',
		])
	})

	it('loads a runtime.json file through the injected file access', async () => {
		const manifestPath = join(runtimeDir, 'runtime.json')
		const manifest = await loadEngineRuntimeManifest(runtimeDir, {
			exists: (path) => path === manifestPath,
			readFile: () => new TextEncoder().encode(JSON.stringify(bundledManifest())),
		})

		expect(manifest.version).toBe('26.3.27')
		expect(manifest.availability).toBe('bundled')
	})
})
