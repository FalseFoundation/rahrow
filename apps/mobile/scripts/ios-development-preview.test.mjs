import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
	assertProjectWiring,
	assertSafeLinkedLibraries,
	classifyRuntimeAvailability,
	collectMissingWebAssets,
	createXcodeBuildPlan,
	loadPreviewInputs,
	stabilizeCapAppSpmDependencyPaths,
	validatePreviewContract,
} from './ios-development-preview.mjs'

describe('iOS development preview contract', () => {
	it('rewrites pnpm-store CapApp-SPM paths onto package symlinks', () => {
		const source = `
.package(name: "CapacitorCommunityAdmob", path: "../../../../../node_modules/.pnpm/@capacitor-community+admob@8.0.0/node_modules/@capacitor-community/admob"),
.package(name: "CapacitorApp", path: "../../../../../node_modules/.pnpm/@capacitor+app@8.1.1_@capacitor+core@8.5.0/node_modules/@capacitor/app"),
`
		expect(stabilizeCapAppSpmDependencyPaths(source)).toContain(
			'path: "../../../node_modules/@capacitor-community/admob"',
		)
		expect(stabilizeCapAppSpmDependencyPaths(source)).toContain(
			'path: "../../../node_modules/@capacitor/app"',
		)
		expect(stabilizeCapAppSpmDependencyPaths(source)).not.toContain('.pnpm/')
	})

	it('keeps both pinned engines inside extensions and fails closed on Simulator', () => {
		const { contract, pins } = loadPreviewInputs()
		expect(validatePreviewContract(contract, pins)).toBe(true)
		expect(contract.extensions.map(({ engineId }) => engineId)).toEqual([
			'xray',
			'sing-box',
		])
		expect(contract.simulator.vpnAvailable).toBe(false)
	})

	it('requires a matching pinned checksum before staging a runtime', () => {
		expect(
			classifyRuntimeAvailability({
				archiveExists: true,
				lockEntry: { sha256: 'a'.repeat(64) },
				checksum: 'a'.repeat(64),
			}),
		).toEqual({ available: true })
		expect(
			classifyRuntimeAvailability({
				archiveExists: true,
				lockEntry: { sha256: 'a'.repeat(64) },
				checksum: 'b'.repeat(64),
			}),
		).toEqual({ available: false, reason: 'checksum-mismatch' })
	})

	it('rejects a runtime built from different source or toolchain provenance', () => {
		const expectedProvenance = {
			file: 'native-runtimes/xray/LibXray.xcframework.zip',
			version: '26.7.28',
			repository: 'https://github.com/XTLS/libXray.git',
			revision: 'a'.repeat(40),
			goVersion: '1.26.7',
			recipe: ['python3', 'build/main.py', 'apple', 'go'],
		}
		expect(
			classifyRuntimeAvailability({
				archiveExists: true,
				checksum: 'b'.repeat(64),
				expectedProvenance,
				lockEntry: {
					file: expectedProvenance.file,
					sha256: 'b'.repeat(64),
					source: {
						version: expectedProvenance.version,
						repository: expectedProvenance.repository,
						revision: 'c'.repeat(40),
					},
					toolchains: { go: expectedProvenance.goVersion },
					recipe: expectedProvenance.recipe,
				},
			}),
		).toEqual({ available: false, reason: 'provenance-mismatch' })
	})

	it('rejects external executable dependencies', () => {
		expect(() =>
			assertSafeLinkedLibraries(
				'App:\n\t/opt/homebrew/lib/libxray.dylib (compatibility version 1.0.0)',
				'/tmp/RahRow.app',
			),
		).toThrow('external dependency')
		expect(
			assertSafeLinkedLibraries(
				'App:\n\t/System/Library/Frameworks/Foundation.framework/Foundation (compatibility version 1.0.0)\n\t@rpath/LibXray.framework/LibXray (compatibility version 1.0.0)',
				'/tmp/RahRow.app',
			),
		).toBe(true)
	})

	it('requires both extension targets, products, identifiers, and embedding', () => {
		const { contract } = loadPreviewInputs()
		const project = `${contract.extensions
			.map(
				(extension) =>
					`${extension.target} ${extension.product} ${extension.bundleIdentifier}`,
			)
			.join('\n')}\nEmbed App Extensions`
		expect(assertProjectWiring(project, contract)).toBe(true)
		expect(() => assertProjectWiring('App', contract)).toThrow(
			'Xcode project is missing',
		)
	})

	it('detects unresolved local assets in generated web output', () => {
		const output = mkdtempSync(join(tmpdir(), 'rahrow-web-assets-'))
		mkdirSync(join(output, 'assets'))
		writeFileSync(
			join(output, 'assets', 'app.css'),
			'@font-face { src: url(./missing.woff2) }',
		)
		expect(collectMissingWebAssets(output)).toEqual(['assets/missing.woff2'])
		writeFileSync(join(output, 'assets', 'missing.woff2'), 'font')
		expect(collectMissingWebAssets(output)).toEqual([])
	})

	it('keeps device and Simulator signing and runtime policy distinct', () => {
		const simulator = createXcodeBuildPlan({
			platform: 'simulator',
			project: '/repo/App.xcodeproj',
			scheme: 'App',
			derivedData: '/artifacts/simulator',
			sourcePackages: '/artifacts/packages',
			moduleCache: '/artifacts/modules',
			nativeRuntimeRoot: '/artifacts/runtimes',
		})
		expect(simulator).toContain('CODE_SIGNING_ALLOWED=NO')
		expect(simulator).toContain('RAHROW_PREVIEW_FAIL_CLOSED=YES')

		const device = createXcodeBuildPlan({
			platform: 'device',
			project: '/repo/App.xcodeproj',
			scheme: 'App',
			derivedData: '/artifacts/device',
			sourcePackages: '/artifacts/packages',
			moduleCache: '/artifacts/modules',
			nativeRuntimeRoot: '/artifacts/runtimes',
			destination: 'platform=iOS,name=h',
		})
		expect(device).toContain('platform=iOS,name=h')
		expect(device).toContain('RAHROW_PREVIEW_FAIL_CLOSED=NO')
		expect(device).not.toContain('CODE_SIGNING_ALLOWED=NO')
	})
})
