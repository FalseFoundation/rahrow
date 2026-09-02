import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { EngineError } from '@rahrow/core/errors.ts'
import { describe, expect, it } from 'vitest'

import {
	type EngineRuntimeManifest,
	parseEngineRuntimeManifest,
} from './engine-runtime-manifest.ts'

const checksum = 'a'.repeat(64)

describe('parseEngineRuntimeManifest', () => {
	it('accepts bundled metadata for each production engine', () => {
		const manifest = parseEngineRuntimeManifest({
			schemaVersion: 1,
			engine: 'sing-box',
			version: '1.13.19',
			availability: 'bundled',
			binaryName: 'sing-box',
			environmentVariable: 'RAHROW_SING_BOX_BINARY',
			artifacts: [
				{
					platform: 'darwin-arm64',
					archiveName: 'sing-box.tar.gz',
					executablePath: 'sing-box-1.13.19-darwin-arm64/sing-box',
					checksum: { algorithm: 'sha256', value: checksum },
					url: 'https://example.invalid/sing-box.tar.gz',
				},
			],
		})

		expect(manifest).toMatchObject<EngineRuntimeManifest>({
			engine: 'sing-box',
			binaryName: 'sing-box',
			environmentVariable: 'RAHROW_SING_BOX_BINARY',
			availability: 'bundled',
		})
	})

	it('rejects a binary name that does not belong to its engine', () => {
		expect(() =>
			parseEngineRuntimeManifest({
				schemaVersion: 1,
				engine: 'sing-box',
				version: '1.13.19',
				availability: 'host-provided',
				binaryName: 'xray',
				environmentVariable: 'RAHROW_SING_BOX_BINARY',
				artifacts: [],
			}),
		).toThrow(EngineError)
	})

	it('keeps both committed engine manifests production-bundled', () => {
		for (const engine of ['xray', 'sing-box'] as const) {
			const path = fileURLToPath(
				new URL(`../../../../engines/${engine}/runtime.json`, import.meta.url),
			)
			const manifest = parseEngineRuntimeManifest(
				JSON.parse(readFileSync(path, 'utf8')),
			)

			expect(manifest.engine).toBe(engine)
			expect(manifest.availability).toBe('bundled')
			expect(manifest.artifacts.map((artifact) => artifact.platform)).toEqual([
				'darwin-arm64',
				'darwin-x64',
				'linux-arm64',
				'linux-x64',
				'windows-x64',
			])
		}
	})
})
