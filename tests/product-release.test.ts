import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import {
	productReleaseTag,
	readProductVersion,
	shouldTagProductRelease,
	syncAppVersions,
	versionCodeFromSemver,
} from '../scripts/sync-app-versions.mjs'

const tempRoots: string[] = []

afterEach(() => {
	for (const root of tempRoots.splice(0)) {
		rmSync(root, { force: true, recursive: true })
	}
})

function fixtureRoot() {
	const root = mkdtempSync(join(tmpdir(), 'rahrow-product-release-'))
	tempRoots.push(root)
	mkdirSync(join(root, 'apps/desktop'), { recursive: true })
	mkdirSync(join(root, 'apps/desktop/src-tauri'), { recursive: true })
	mkdirSync(join(root, 'apps/mobile/android/app'), { recursive: true })
	mkdirSync(join(root, 'apps/mobile/ios/App/App.xcodeproj'), {
		recursive: true,
	})
	writeFileSync(
		join(root, 'apps/desktop/package.json'),
		JSON.stringify({ name: '@rahrow/desktop', version: '1.2.3' }),
	)
	writeFileSync(
		join(root, 'apps/desktop/src-tauri/tauri.conf.json'),
		JSON.stringify({ productName: 'RahRow', version: '0.0.0' }, null, '\t'),
	)
	writeFileSync(
		join(root, 'apps/mobile/android/app/build.gradle'),
		[
			'android {',
			'    defaultConfig {',
			'        versionCode 1',
			'        versionName "1.0"',
			'    }',
			'}',
			'',
		].join('\n'),
	)
	writeFileSync(
		join(root, 'apps/mobile/ios/App/App.xcodeproj/project.pbxproj'),
		[
			'MARKETING_VERSION = 1.0;',
			'CURRENT_PROJECT_VERSION = 1;',
			'MARKETING_VERSION = 1.0;',
			'',
		].join('\n'),
	)
	return root
}

describe('product release version planning', () => {
	it('reads the desktop package as the product version source', () => {
		const root = fixtureRoot()
		expect(readProductVersion(root)).toBe('1.2.3')
	})

	it('derives a monotonic Android versionCode from semver', () => {
		expect(versionCodeFromSemver('1.2.3')).toBe(1_002_003)
		expect(versionCodeFromSemver('0.0.0')).toBe(0)
		expect(() => versionCodeFromSemver('not-a-version')).toThrow(/semver/i)
	})

	it('syncs Tauri, Android, and iOS native version fields', () => {
		const root = fixtureRoot()
		const result = syncAppVersions(root, '2.4.5')

		expect(result).toEqual({
			version: '2.4.5',
			versionCode: 2_004_005,
			files: [
				'apps/desktop/src-tauri/tauri.conf.json',
				'apps/mobile/android/app/build.gradle',
				'apps/mobile/ios/App/App.xcodeproj/project.pbxproj',
			],
		})

		const tauri = JSON.parse(
			readFileSync(join(root, 'apps/desktop/src-tauri/tauri.conf.json'), 'utf8'),
		)
		expect(tauri.version).toBe('2.4.5')

		const gradle = readFileSync(
			join(root, 'apps/mobile/android/app/build.gradle'),
			'utf8',
		)
		expect(gradle).toContain('versionCode 2004005')
		expect(gradle).toContain('versionName "2.4.5"')

		const pbxproj = readFileSync(
			join(root, 'apps/mobile/ios/App/App.xcodeproj/project.pbxproj'),
			'utf8',
		)
		expect(pbxproj.match(/MARKETING_VERSION = 2\.4\.5;/g)).toHaveLength(2)
		expect(pbxproj).not.toContain('MARKETING_VERSION = 1.0;')
	})

	it('builds a v-prefixed release tag only when the product version advances', () => {
		expect(productReleaseTag('1.2.3')).toBe('v1.2.3')
		expect(
			shouldTagProductRelease({
				previousVersion: '1.2.3',
				nextVersion: '1.2.3',
			}),
		).toBe(false)
		expect(
			shouldTagProductRelease({
				previousVersion: '1.2.3',
				nextVersion: '1.3.0',
			}),
		).toBe(true)
		expect(
			shouldTagProductRelease({
				previousVersion: undefined,
				nextVersion: '0.1.0',
			}),
		).toBe(true)
	})
})
