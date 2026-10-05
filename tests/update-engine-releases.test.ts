import { describe, expect, it } from 'vitest'

import {
	artifactSpec,
	ensureAssetChecksums,
	nextNativePins,
	nextRuntimeManifest,
	selectOfficialRelease,
	sha256Digest,
	versionFromTag,
} from '../scripts/update-engine-releases.mjs'

const checksum = 'a'.repeat(64)

function asset(name: string) {
	return {
		name,
		digest: `sha256:${checksum}`,
		browser_download_url: `https://example.test/${name}`,
	}
}

describe('official engine release planning', () => {
	it('selects the newest release, including a newer pre-release', () => {
		const selected = selectOfficialRelease([
			{ tag_name: 'v26.3.27', prerelease: false },
			{ tag_name: 'v26.9.30', prerelease: true },
			{ tag_name: 'v26.10.0', draft: true, prerelease: false },
		])
		expect(selected.tag_name).toBe('v26.9.30')
		expect(
			selectOfficialRelease([
				{ tag_name: 'v26.9.30', prerelease: true },
				{ tag_name: 'v26.10.1', prerelease: false },
			]).tag_name,
		).toBe('v26.10.1')
	})

	it('strips the release tag prefix', () => {
		expect(versionFromTag('v1.13.19')).toBe('1.13.19')
		expect(sha256Digest('SHA256:ABCDEF')).toBeUndefined()
		expect(sha256Digest(`sha256:${checksum}`)).toBe(checksum)
	})

	it('maps Xray release assets onto the committed platform list', () => {
		const current = {
			schemaVersion: 1,
			engine: 'xray',
			version: '26.7.28',
			availability: 'bundled',
			binaryName: 'xray',
			environmentVariable: 'RAHROW_XRAY_BINARY',
			artifacts: [
				{
					platform: 'linux-x64',
					archiveName: 'Xray-linux-64.zip',
					executablePath: 'xray',
					checksum: { algorithm: 'sha256', value: 'b'.repeat(64) },
					url: 'https://example.test/old',
				},
			],
		}

		const next = nextRuntimeManifest(current, {
			tag_name: 'v26.8.1',
			assets: [asset('Xray-linux-64.zip'), asset('unrelated.zip')],
		})

		expect(next.version).toBe('26.8.1')
		expect(next.artifacts[0]).toMatchObject({
			archiveName: 'Xray-linux-64.zip',
			executablePath: 'xray',
			checksum: { algorithm: 'sha256', value: checksum },
			url: 'https://example.test/Xray-linux-64.zip',
		})
	})

	it('uses sing-box upstream archive names for each platform', () => {
		expect(artifactSpec('sing-box', '1.13.20', 'darwin-x64')).toEqual({
			archiveName: 'sing-box-1.13.20-darwin-amd64.tar.gz',
			executablePath: 'sing-box-1.13.20-darwin-amd64/sing-box',
		})
		expect(artifactSpec('sing-box', '1.13.20', 'windows-x64')).toEqual({
			archiveName: 'sing-box-1.13.20-windows-amd64.zip',
			executablePath: 'sing-box-1.13.20-windows-amd64/sing-box.exe',
		})
	})

	it('downloads a checksum only for a needed asset that has none', async () => {
		const fetched: string[] = []
		const release = await ensureAssetChecksums(
			{
				assets: [
					{
						name: 'needed.zip',
						browser_download_url: 'https://example.test/needed',
					},
					{
						name: 'ready.zip',
						digest: `sha256:${checksum}`,
						browser_download_url: 'https://example.test/ready',
					},
					{
						name: 'ignored.zip',
						browser_download_url: 'https://example.test/ignored',
					},
				],
			},
			['needed.zip', 'ready.zip'],
			async (url: string) => {
				fetched.push(url)
				return {
					ok: true,
					status: 200,
					arrayBuffer: async () => new TextEncoder().encode('payload').buffer,
				}
			},
		)

		expect(fetched).toEqual(['https://example.test/needed'])
		expect(release.assets[0].digest).toMatch(/^sha256:[a-f0-9]{64}$/u)
		expect(release.assets[1].digest).toBe(`sha256:${checksum}`)
		expect(release.assets[2].digest).toBeUndefined()
	})

	it('fails when an official archive is absent', () => {
		expect(() =>
			nextRuntimeManifest(
				{
					engine: 'xray',
					version: '1',
					artifacts: [{ platform: 'linux-x64' }],
				},
				{ tag_name: 'v2', assets: [asset('other.zip')] },
			),
		).toThrow(/missing Xray-linux-64.zip/)
	})

	it('updates engine source pins without touching tunnel providers', () => {
		const pins = nextNativePins(
			{
				schemaVersion: 2,
				tunnelProviders: { 'hev-socks5-tunnel': { version: '2.17.1' } },
				engines: {
					xray: {
						version: '26.7.28',
						ref: 'v26.7.28',
						revision: 'a'.repeat(40),
						build: { android: ['python3'] },
					},
				},
			},
			{ xray: { version: '26.8.1', revision: 'b'.repeat(40) } },
		)

		expect(pins.engines.xray).toMatchObject({
			version: '26.8.1',
			ref: 'v26.8.1',
			revision: 'b'.repeat(40),
			build: { android: ['python3'] },
		})
		expect(pins.tunnelProviders['hev-socks5-tunnel'].version).toBe('2.17.1')
	})
})
