import { parseEngineRuntimeManifest } from '@rahrow/engine/runtime/engine-runtime-manifest.ts'
import { describe, expect, it } from 'vitest'

import {
	desktopEngineSidecarFileName,
	planDesktopEngineSidecarBundle,
} from './engine-sidecar.ts'

const bytes = new TextEncoder().encode('archive')
const checksum = 'a'.repeat(64)

describe('desktop engine sidecar packaging', () => {
	it('uses distinct Tauri sidecar names for both bundled engines', () => {
		expect(desktopEngineSidecarFileName('xray', 'darwin-arm64')).toBe(
			'xray-aarch64-apple-darwin',
		)
		expect(desktopEngineSidecarFileName('sing-box', 'windows-x64')).toBe(
			'sing-box-x86_64-pc-windows-msvc.exe',
		)
	})

	it('plans a verified sing-box artifact beside the Xray sidecar', async () => {
		const manifest = parseEngineRuntimeManifest({
			schemaVersion: 1,
			engine: 'sing-box',
			version: '1.13.19',
			availability: 'bundled',
			binaryName: 'sing-box',
			environmentVariable: 'RAHROW_SING_BOX_BINARY',
			artifacts: [
				{
					platform: 'linux-x64',
					archiveName: 'sing-box.tar.gz',
					executablePath: 'sing-box-1.13.19-linux-amd64/sing-box',
					checksum: { algorithm: 'sha256', value: checksum },
				},
			],
		})
		const binaryPath =
			'/runtime/sing-box/linux-x64/sing-box-1.13.19-linux-amd64/sing-box'

		await expect(
			planDesktopEngineSidecarBundle({
				manifest,
				platform: 'linux-x64',
				runtimeDir: '/runtime/sing-box',
				binariesDir: '/app/binaries',
				files: {
					exists: (path) => path === binaryPath,
					readFile: () => bytes,
				},
				hashSha256: async () => checksum,
			}),
		).resolves.toMatchObject({
			sourcePath: binaryPath,
			sidecarPath: '/app/binaries/sing-box-x86_64-unknown-linux-gnu',
			engine: 'sing-box',
			version: '1.13.19',
		})
	})
})
