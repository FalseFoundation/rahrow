import { chmod, mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { verifyInstalledDesktopBundle } from './verify-installed-bundle.ts'

const versions = { xray: '26.7.28', 'sing-box': '1.13.19' } as const

describe('installed desktop bundle verification', () => {
	it('accepts a self-contained macOS bundle with both pinned engines', async () => {
		const fixture = await createFixture('macos')

		await expect(verifyFixture(fixture, 'darwin-arm64')).resolves.toMatchObject({
			target: 'darwin-arm64',
		})
	})

	it('fails closed when an advertised engine is absent', async () => {
		const fixture = await createFixture('macos', { omit: 'sing-box' })

		await expect(verifyFixture(fixture, 'darwin-arm64')).rejects.toThrow(
			'exactly one sing-box file',
		)
	})

	it('fails when a bundled engine does not report its pinned version', async () => {
		const fixture = await createFixture('macos')

		await expect(
			verifyFixture(fixture, 'darwin-arm64', async (engine) =>
				engine === 'xray' ? 'Xray 1.0.0' : `sing-box ${versions[engine]}`,
			),
		).rejects.toThrow(
			'xray in the installed bundle does not report pinned version',
		)
	})

	it('requires configured Wintun files in Windows bundles', async () => {
		const fixture = await createFixture('windows', { omit: 'wintun.dll' })

		await expect(verifyFixture(fixture, 'windows-x64')).rejects.toThrow(
			'binaries/wintun.dll resource',
		)
	})

	it('requires bundled engine licenses and notices', async () => {
		const fixture = await createFixture('macos', { omit: 'LICENSE-sing-box' })

		await expect(verifyFixture(fixture, 'darwin-arm64')).rejects.toThrow(
			'binaries/LICENSE-sing-box resource',
		)
	})

	it('does not accept a symlink as a bundled engine', async () => {
		const fixture = await createFixture('macos', { omit: 'xray' })
		await symlink(
			'/usr/bin/true',
			join(fixture.bundlePath, 'Contents/MacOS/xray'),
		)

		await expect(verifyFixture(fixture, 'darwin-arm64')).rejects.toThrow(
			'exactly one xray file',
		)
	})

	it('requires Tauri to package both engines even if loose files exist', async () => {
		const fixture = await createFixture('macos', {
			externalBins: ['binaries/xray'],
		})

		await expect(verifyFixture(fixture, 'darwin-arm64')).rejects.toThrow(
			'bundle.externalBin must contain exactly one sing-box sidecar',
		)
	})
})

interface Fixture {
	readonly bundlePath: string
	readonly sidecarConfigPath: string
	readonly windowsConfigPath: string
	readonly runtimeManifestPaths: Readonly<Record<'xray' | 'sing-box', string>>
}

async function createFixture(
	platform: 'macos' | 'windows',
	options: {
		readonly omit?: 'LICENSE-sing-box' | 'sing-box' | 'wintun.dll' | 'xray'
		readonly externalBins?: readonly string[]
	} = {},
): Promise<Fixture> {
	const root = await mkdtemp(join(tmpdir(), 'rahrow-desktop-bundle-'))
	const bundlePath = join(root, 'RahRow')
	const executableDirectory =
		platform === 'macos' ? join(bundlePath, 'Contents', 'MacOS') : bundlePath
	const resourceDirectory =
		platform === 'macos' ? join(bundlePath, 'Contents', 'Resources') : bundlePath
	await mkdir(executableDirectory, { recursive: true })
	await mkdir(resourceDirectory, { recursive: true })

	for (const engine of ['xray', 'sing-box'] as const) {
		if (options.omit === engine) continue
		const path = join(
			executableDirectory,
			`${engine}${platform === 'windows' ? '.exe' : ''}`,
		)
		await writeFile(path, platform === 'windows' ? 'MZfixture' : 'fixture')
		if (platform !== 'windows') await chmod(path, 0o755)
	}

	for (const resource of [
		'geoip.dat',
		'geosite.dat',
		'LICENSE-xray',
		'LICENSE-sing-box',
		'THIRD_PARTY_NOTICES.md',
		...(platform === 'windows' ? ['wintun.dll', 'LICENSE-Wintun'] : []),
	]) {
		if (options.omit === resource) continue
		await writeFile(join(resourceDirectory, resource), `fixture ${resource}`)
	}

	const sidecarConfigPath = join(root, 'tauri.sidecar.json')
	await writeFile(
		sidecarConfigPath,
		JSON.stringify({
			bundle: {
				externalBin: options.externalBins ?? ['binaries/xray', 'binaries/sing-box'],
				resources: {
					'binaries/geoip.dat': 'geoip.dat',
					'binaries/geosite.dat': 'geosite.dat',
					'binaries/LICENSE-xray': 'LICENSE-xray',
					'binaries/LICENSE-sing-box': 'LICENSE-sing-box',
					'../../../THIRD_PARTY_NOTICES.md': 'THIRD_PARTY_NOTICES.md',
				},
			},
		}),
	)
	const windowsConfigPath = join(root, 'tauri.windows.conf.json')
	await writeFile(
		windowsConfigPath,
		JSON.stringify({
			bundle: {
				resources: {
					'binaries/wintun.dll': 'wintun.dll',
					'binaries/LICENSE-Wintun': 'LICENSE-Wintun',
				},
			},
		}),
	)

	const runtimeManifestPaths = {} as Record<'xray' | 'sing-box', string>
	for (const engine of ['xray', 'sing-box'] as const) {
		const path = join(root, `${engine}-runtime.json`)
		await writeFile(
			path,
			JSON.stringify({
				engine,
				version: versions[engine],
				availability: 'bundled',
				artifacts: [{ platform: 'darwin-arm64' }, { platform: 'windows-x64' }],
			}),
		)
		runtimeManifestPaths[engine] = path
	}

	return {
		bundlePath,
		sidecarConfigPath,
		windowsConfigPath,
		runtimeManifestPaths,
	}
}

function verifyFixture(
	fixture: Fixture,
	target: 'darwin-arm64' | 'windows-x64',
	inspectEngineVersion: (
		engine: 'xray' | 'sing-box',
	) => Promise<string> = async (engine) => `${engine} ${versions[engine]}`,
) {
	return verifyInstalledDesktopBundle({
		...fixture,
		target,
		inspectEngineVersion,
	})
}
