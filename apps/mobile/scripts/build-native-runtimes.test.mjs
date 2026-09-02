import { describe, expect, it } from 'vitest'
import {
	createArtifactLockEntry,
	parseGoVersion,
	validateBuildRequest,
	validatePinnedToolchains,
} from './build-native-runtimes.mjs'

describe('native runtime build provenance', () => {
	it('requires an exact local Go toolchain and supports one-engine builds', () => {
		const pins = {
			schemaVersion: 2,
			buildToolchains: { go: { version: '1.26.7' } },
			engines: { xray: {}, 'sing-box': {} },
		}
		expect(validatePinnedToolchains(pins)).toBe(true)
		expect(parseGoVersion('go version go1.26.7 darwin/arm64')).toBe('1.26.7')
		expect(validateBuildRequest(pins, 'apple', 'xray')).toEqual({
			platform: 'apple',
			engineIds: ['xray'],
		})
	})

	it('rejects an unpinned toolchain and unknown build target', () => {
		expect(() =>
			validatePinnedToolchains({ schemaVersion: 1, engines: {} }),
		).toThrow('schemaVersion must be 2')
		expect(() =>
			validateBuildRequest(
				{
					schemaVersion: 2,
					buildToolchains: { go: { version: '1.26.7' } },
					engines: { xray: {}, 'sing-box': {} },
				},
				'windows',
				'all',
			),
		).toThrow('android or apple')
	})

	it('binds a lock entry to source, toolchain, and exact recipe', () => {
		const entry = createArtifactLockEntry({
			file: 'native-runtimes/xray/LibXray.xcframework.zip',
			sha256: 'a'.repeat(64),
			engine: {
				version: '26.7.28',
				repository: 'https://github.com/XTLS/libXray.git',
				revision: 'b'.repeat(40),
				build: { apple: ['python3', 'build/main.py', 'apple', 'go'] },
			},
			platform: 'apple',
			goVersion: '1.26.7',
		})
		expect(entry).toMatchObject({
			file: 'native-runtimes/xray/LibXray.xcframework.zip',
			sha256: 'a'.repeat(64),
			source: { revision: 'b'.repeat(40) },
			toolchains: { go: '1.26.7' },
			recipe: ['python3', 'build/main.py', 'apple', 'go'],
		})
	})
})
