import { join } from 'node:path'

import { EngineError } from '@rahrow/core/errors.ts'
import { describe, expect, it } from 'vitest'
import { parseEngineRuntimeManifest } from './engine-runtime-manifest.ts'
import { XRAY_BINARY_ENV } from './engine-runtime-resolver.ts'
import { ensureEngineRuntimeArtifact } from './ensure-engine-runtime.ts'

const helloBytes = new TextEncoder().encode('hello')
const helloSha256 =
	'2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
const runtimeDir = join('/runtime', 'xray')
const archivePath = join(runtimeDir, 'Xray-macos-arm64-v8a.zip')
const binaryPath = join(runtimeDir, 'darwin-arm64', 'xray')
const downloadUrl =
	'https://github.com/XTLS/Xray-core/releases/download/v26.3.27/Xray-macos-arm64-v8a.zip'

function bundledManifest(url = downloadUrl) {
	return parseEngineRuntimeManifest({
		schemaVersion: 1,
		engine: 'xray',
		version: '26.3.27',
		availability: 'bundled',
		binaryName: 'xray',
		environmentVariable: XRAY_BINARY_ENV,
		artifacts: [
			{
				platform: 'darwin-arm64',
				archiveName: 'Xray-macos-arm64-v8a.zip',
				executablePath: 'xray',
				checksum: {
					algorithm: 'sha256',
					value: helloSha256,
				},
				url,
			},
		],
	})
}

function memoryFiles(
	initial: Readonly<Record<string, Uint8Array | string>> = {},
) {
	const stored = new Map(
		Object.entries(initial).map(([path, contents]) => [
			path,
			typeof contents === 'string' ? new TextEncoder().encode(contents) : contents,
		]),
	)

	return {
		stored,
		exists(path: string) {
			return stored.has(path)
		},
		readFile(path: string) {
			const contents = stored.get(path)
			if (!contents) {
				throw new Error(`missing file: ${path}`)
			}

			return contents
		},
		async writeFile(path: string, bytes: Uint8Array) {
			stored.set(path, bytes)
		},
	}
}

describe('ensureEngineRuntimeArtifact', () => {
	it('skips download when the pinned archive and binary are already present', async () => {
		const files = memoryFiles({
			[archivePath]: helloBytes,
			[binaryPath]: helloBytes,
		})
		let downloads = 0

		const ensured = await ensureEngineRuntimeArtifact({
			manifest: bundledManifest(),
			platform: 'darwin-arm64',
			runtimeDir,
			files,
			hashSha256: async () => helloSha256,
			download: async () => {
				downloads += 1
				return helloBytes
			},
			extract: async () => {
				throw new Error('extract should not run')
			},
		})

		expect(ensured).toEqual({
			binaryPath,
			archivePath,
			downloaded: false,
			extracted: false,
		})
		expect(downloads).toBe(0)
	})

	it('downloads, verifies, and extracts the pinned artifact when the binary is missing', async () => {
		const files = memoryFiles()
		const extracted: string[] = []

		const ensured = await ensureEngineRuntimeArtifact({
			manifest: bundledManifest(),
			platform: 'darwin-arm64',
			runtimeDir,
			files,
			hashSha256: async () => helloSha256,
			download: async (url) => {
				expect(url).toBe(downloadUrl)
				return helloBytes
			},
			extract: async (archive, destinationDir) => {
				extracted.push(archive, destinationDir)
				await files.writeFile(binaryPath, helloBytes)
			},
		})

		expect(ensured).toEqual({
			binaryPath,
			archivePath,
			downloaded: true,
			extracted: true,
		})
		expect(files.stored.get(archivePath)).toEqual(helloBytes)
		expect(extracted).toEqual([archivePath, join(runtimeDir, 'darwin-arm64')])
	})

	it('extracts a present archive when only the binary is missing', async () => {
		const files = memoryFiles({
			[archivePath]: helloBytes,
		})
		let downloads = 0

		const ensured = await ensureEngineRuntimeArtifact({
			manifest: bundledManifest(),
			platform: 'darwin-arm64',
			runtimeDir,
			files,
			hashSha256: async () => helloSha256,
			download: async () => {
				downloads += 1
				return helloBytes
			},
			extract: async () => {
				await files.writeFile(binaryPath, helloBytes)
			},
		})

		expect(ensured.downloaded).toBe(false)
		expect(ensured.extracted).toBe(true)
		expect(ensured.binaryPath).toBe(binaryPath)
		expect(downloads).toBe(0)
	})

	it('replaces and re-extracts a stale archive when a pinned version changes', async () => {
		const staleBytes = new TextEncoder().encode('stale')
		const files = memoryFiles({
			[archivePath]: staleBytes,
			[binaryPath]: staleBytes,
		})
		let hashCalls = 0

		const ensured = await ensureEngineRuntimeArtifact({
			manifest: bundledManifest(),
			platform: 'darwin-arm64',
			runtimeDir,
			files,
			hashSha256: async (bytes) => {
				hashCalls += 1
				return bytes === helloBytes ? helloSha256 : 'b'.repeat(64)
			},
			download: async () => helloBytes,
			extract: async () => {
				await files.writeFile(binaryPath, helloBytes)
			},
		})

		expect(ensured.downloaded).toBe(true)
		expect(ensured.extracted).toBe(true)
		expect(files.stored.get(archivePath)).toEqual(helloBytes)
		expect(files.stored.get(binaryPath)).toEqual(helloBytes)
		expect(hashCalls).toBeGreaterThanOrEqual(2)
	})

	it('fails closed when the downloaded archive checksum does not match', async () => {
		await expect(
			ensureEngineRuntimeArtifact({
				manifest: bundledManifest(),
				platform: 'darwin-arm64',
				runtimeDir,
				files: memoryFiles(),
				hashSha256: async () => 'b'.repeat(64),
				download: async () => helloBytes,
				extract: async () => {
					throw new Error('extract should not run')
				},
			}),
		).rejects.toMatchObject({
			code: 'invalid_config',
			message: expect.stringContaining('checksum'),
		})
	})

	it('fails clearly when the artifact has no URL and the binary is missing', async () => {
		await expect(
			ensureEngineRuntimeArtifact({
				manifest: bundledManifest(''),
				platform: 'darwin-arm64',
				runtimeDir,
				files: memoryFiles(),
				hashSha256: async () => helloSha256,
				download: async () => helloBytes,
				extract: async () => undefined,
			}),
		).rejects.toBeInstanceOf(EngineError)

		await expect(
			ensureEngineRuntimeArtifact({
				manifest: parseEngineRuntimeManifest({
					schemaVersion: 1,
					engine: 'xray',
					version: '26.3.27',
					availability: 'bundled',
					binaryName: 'xray',
					environmentVariable: XRAY_BINARY_ENV,
					artifacts: [
						{
							platform: 'darwin-arm64',
							archiveName: 'Xray-macos-arm64-v8a.zip',
							executablePath: 'xray',
							checksum: {
								algorithm: 'sha256',
								value: helloSha256,
							},
						},
					],
				}),
				platform: 'darwin-arm64',
				runtimeDir,
				files: memoryFiles(),
				hashSha256: async () => helloSha256,
				download: async () => helloBytes,
				extract: async () => undefined,
			}),
		).rejects.toMatchObject({
			code: 'invalid_config',
			message: expect.stringMatching(
				new RegExp(`${XRAY_BINARY_ENV}|darwin-arm64`),
			),
		})
	})
})
