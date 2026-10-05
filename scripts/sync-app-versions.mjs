import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))

const PRODUCT_PACKAGE = 'apps/desktop/package.json'
const TAURI_CONFIG = 'apps/desktop/src-tauri/tauri.conf.json'
const ANDROID_GRADLE = 'apps/mobile/android/app/build.gradle'
const IOS_PBXPROJ = 'apps/mobile/ios/App/App.xcodeproj/project.pbxproj'

const SEMVER_PATTERN = /^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/

export function readProductVersion(root = repositoryRoot) {
	const manifest = JSON.parse(readFileSync(join(root, PRODUCT_PACKAGE), 'utf8'))
	if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
		throw new Error('Product version is missing from apps/desktop/package.json')
	}
	return manifest.version
}

export function versionCodeFromSemver(version) {
	const match = SEMVER_PATTERN.exec(version)
	if (!match) {
		throw new Error(
			`Product version must be semver major.minor.patch, got ${version}`,
		)
	}
	const major = Number(match[1])
	const minor = Number(match[2])
	const patch = Number(match[3])
	return major * 1_000_000 + minor * 1_000 + patch
}

export function productReleaseTag(version) {
	return `v${version}`
}

export function shouldTagProductRelease({ previousVersion, nextVersion }) {
	if (typeof nextVersion !== 'string' || nextVersion.length === 0) {
		throw new Error('Next product version is required')
	}
	return previousVersion !== nextVersion
}

function syncTauriVersion(root, version) {
	const path = join(root, TAURI_CONFIG)
	const config = JSON.parse(readFileSync(path, 'utf8'))
	config.version = version
	writeFileSync(path, `${JSON.stringify(config, null, '\t')}\n`)
}

function syncAndroidVersion(root, version, versionCode) {
	const path = join(root, ANDROID_GRADLE)
	const source = readFileSync(path, 'utf8')
	const withCode = source.replace(
		/versionCode\s+\d+/,
		`versionCode ${versionCode}`,
	)
	const withName = withCode.replace(
		/versionName\s+"[^"]*"/,
		`versionName "${version}"`,
	)
	if (withName === source) {
		throw new Error('Android versionCode/versionName fields were not updated')
	}
	writeFileSync(path, withName)
}

function syncIosVersion(root, version) {
	const path = join(root, IOS_PBXPROJ)
	const source = readFileSync(path, 'utf8')
	const next = source.replace(
		/MARKETING_VERSION = [^;]+;/g,
		`MARKETING_VERSION = ${version};`,
	)
	if (next === source) {
		throw new Error('iOS MARKETING_VERSION fields were not updated')
	}
	writeFileSync(path, next)
}

export function syncAppVersions(
	root = repositoryRoot,
	version = readProductVersion(root),
) {
	const versionCode = versionCodeFromSemver(version)
	syncTauriVersion(root, version)
	syncAndroidVersion(root, version, versionCode)
	syncIosVersion(root, version)
	return {
		version,
		versionCode,
		files: [TAURI_CONFIG, ANDROID_GRADLE, IOS_PBXPROJ],
	}
}

export function main(root = repositoryRoot) {
	const result = syncAppVersions(root)
	console.info(
		`Synced product version ${result.version} (versionCode ${result.versionCode}) into native manifests`,
	)
	return result
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	main()
}
