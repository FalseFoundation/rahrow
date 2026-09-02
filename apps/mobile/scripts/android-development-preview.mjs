import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
	cpSync,
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import { dirname, join, posix, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptRoot = dirname(fileURLToPath(import.meta.url))
const mobileRoot = resolve(scriptRoot, '..')
const repositoryRoot = resolve(mobileRoot, '../..')
const androidAppRoot = join(mobileRoot, 'android', 'app')
const androidLibrariesRoot = join(androidAppRoot, 'libs')
const androidManifestPath = join(
	androidAppRoot,
	'src',
	'main',
	'assets',
	'rahrow',
	'native-runtime-manifest.json',
)
const androidCapacitorPluginsPath = join(
	androidAppRoot,
	'src',
	'main',
	'assets',
	'capacitor.plugins.json',
)
const androidDebugApk = join(
	androidAppRoot,
	'build',
	'outputs',
	'apk',
	'debug',
	'app-debug.apk',
)
const checksumPattern = /^[a-f0-9]{64}$/
const requiredEngineIds = ['xray', 'sing-box']

function sha256(path) {
	return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function run(command, args, { capture = false, cwd = repositoryRoot } = {}) {
	const result = spawnSync(command, args, {
		cwd,
		encoding: capture ? 'utf8' : undefined,
		stdio: capture ? 'pipe' : 'inherit',
	})
	if (result.error) throw result.error
	if (result.status !== 0) {
		const detail = capture ? `\n${result.stderr || result.stdout}` : ''
		throw new Error(`${command} exited with status ${result.status}${detail}`)
	}
	return capture ? result.stdout : ''
}

export function createAndroidBuildPlan() {
	return ['-PrahrowExcludeAdmob=true', ':app:assembleDebug']
}

export function createAndroidWebBuildPlan() {
	return ['build', '--mode', 'preview']
}

function zipEntries(path) {
	return run('unzip', ['-Z1', path], { capture: true })
		.split('\n')
		.map((entry) => entry.trim())
		.filter(Boolean)
}

function readZipEntry(path, entry) {
	return run('unzip', ['-p', path, entry], { capture: true })
}

function loadInputs(root = mobileRoot) {
	const pins = JSON.parse(
		readFileSync(join(root, 'native-runtime-pins.json'), 'utf8'),
	)
	if (pins.schemaVersion !== 2)
		throw new Error('Native runtime pins schemaVersion must be 2')
	const lockPath = join(root, 'native-runtime-lock.json')
	if (!existsSync(lockPath))
		throw new Error(
			'native-runtime-lock.json is missing; Android previews require pinned, checksummed AARs',
		)
	const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
	if (lock.schemaVersion !== 2)
		throw new Error('Native runtime lock schemaVersion must be 2')
	return { pins, lock }
}

export function validateAndroidRuntime({
	engineId,
	engine,
	pins,
	artifactRelativePath,
	artifactExists,
	checksum,
	lockEntry,
}) {
	if (!artifactExists) throw new Error(`${engineId} Android artifact is missing`)
	if (!lockEntry || !checksumPattern.test(lockEntry.sha256 ?? ''))
		throw new Error(`${engineId} Android checksum lock is missing or invalid`)
	if (checksum !== lockEntry.sha256)
		throw new Error(`${engineId} Android artifact checksum mismatch`)
	if (lockEntry.file !== artifactRelativePath)
		throw new Error(`${engineId} Android lock points to the wrong artifact`)
	for (const field of ['version', 'repository', 'revision']) {
		if (lockEntry.source?.[field] !== engine[field])
			throw new Error(`${engineId} Android ${field} provenance mismatch`)
	}
	if (lockEntry.toolchains?.go !== pins.buildToolchains?.go?.version)
		throw new Error(`${engineId} Android Go toolchain provenance mismatch`)
	if (JSON.stringify(lockEntry.recipe) !== JSON.stringify(engine.build?.android))
		throw new Error(`${engineId} Android build recipe provenance mismatch`)
	return true
}

export function validateHevAndroidRuntime({
	provider,
	pins,
	artifactRelativePath,
	artifactExists,
	checksum,
	lockEntry,
}) {
	const providerId = 'hev-socks5-tunnel'
	if (!artifactExists)
		throw new Error(`${providerId} Android artifact is missing`)
	if (!lockEntry || !checksumPattern.test(lockEntry.sha256 ?? ''))
		throw new Error(`${providerId} Android checksum lock is missing or invalid`)
	if (checksum !== lockEntry.sha256)
		throw new Error(`${providerId} Android artifact checksum mismatch`)
	if (lockEntry.file !== artifactRelativePath)
		throw new Error(`${providerId} Android lock points to the wrong artifact`)
	for (const field of ['version', 'repository', 'revision']) {
		if (lockEntry.source?.[field] !== provider[field])
			throw new Error(`${providerId} Android ${field} provenance mismatch`)
	}
	if (
		lockEntry.source?.license !== provider.license ||
		lockEntry.source?.sourceArchiveSha256 !== provider.sourceArchiveSha256 ||
		JSON.stringify(lockEntry.source?.submodules) !==
			JSON.stringify(provider.submodules)
	)
		throw new Error(`${providerId} Android source provenance mismatch`)
	if (
		lockEntry.toolchains?.androidNdk !== pins.buildToolchains?.androidNdk?.version
	)
		throw new Error(`${providerId} Android NDK provenance mismatch`)
	if (
		JSON.stringify(lockEntry.recipe) !== JSON.stringify(provider.build?.android)
	)
		throw new Error(`${providerId} Android build recipe provenance mismatch`)
	return true
}

export function collectAarNativeLibraries(entries, engineId, requiredAbis) {
	for (const required of ['AndroidManifest.xml', 'classes.jar']) {
		if (!entries.includes(required))
			throw new Error(`${engineId} AAR does not contain ${required}`)
	}
	const libraries = Object.fromEntries(requiredAbis.map((abi) => [abi, []]))
	for (const entry of entries) {
		const match = entry.match(/^(?:jni|libs)\/([^/]+)\/([^/]+\.so)$/)
		if (!match || !(match[1] in libraries)) continue
		libraries[match[1]].push(match[2])
	}
	for (const abi of requiredAbis) {
		libraries[abi] = [...new Set(libraries[abi])].sort()
		if (libraries[abi].length === 0)
			throw new Error(`${engineId} AAR has no native runtime for ${abi}`)
	}
	return libraries
}

export function assertUniqueNativeLibraries(engines) {
	const owners = new Map()
	for (const engine of engines) {
		for (const [abi, libraries] of Object.entries(engine.libraries)) {
			for (const library of libraries) {
				const key = `${abi}/${library}`
				const owner = owners.get(key)
				if (owner && owner !== engine.engineId)
					throw new Error(
						`Android native library collision: ${key} is supplied by ${owner} and ${engine.engineId}`,
					)
				owners.set(key, engine.engineId)
			}
		}
	}
	return true
}

export function validateAndroidProjectWiring(projectText, pins) {
	for (const engineId of requiredEngineIds) {
		const artifact = pins.engines?.[engineId]?.androidArtifact
		if (!artifact)
			throw new Error(`Android runtime pin is missing for ${engineId}`)
		const localArtifactReferences = [
			`file('libs/${artifact}')`,
			`files('libs/${artifact}')`,
		]
		if (
			!localArtifactReferences.some((reference) => projectText.includes(reference))
		)
			throw new Error(`Android app does not depend on libs/${artifact}`)
	}
	const singBoxArtifact = pins.engines?.['sing-box']?.androidArtifact
	if (
		!singBoxArtifact ||
		!projectText.includes(`implementation files('libs/${singBoxArtifact}')`)
	)
		throw new Error(
			`Android app must package the ${singBoxArtifact ?? 'sing-box AAR'} runtime API`,
		)
	const hevArtifact =
		pins.tunnelProviders?.['hev-socks5-tunnel']?.androidArtifact
	if (hevArtifact && !projectText.includes(`file('libs/${hevArtifact}')`))
		throw new Error('Android app must extract the pinned HEV runtime')
	return true
}

export function validateAndroidManifestContract(manifestText) {
	for (const permission of [
		'android.permission.ACCESS_NETWORK_STATE',
		'android.permission.CAMERA',
		'android.permission.POST_NOTIFICATIONS',
	]) {
		const pattern = new RegExp(
			`<uses-permission\\b[^>]*android:name=["']${permission.replaceAll('.', '\\.')}["'][^>]*\\/?>`,
		)
		if (!pattern.test(manifestText))
			throw new Error(`Android manifest must declare ${permission}`)
	}

	if (
		!/<uses-feature\b(?=[^>]*android:name=["']android\.hardware\.camera["'])(?=[^>]*android:required=["']false["'])[^>]*\/?>/.test(
			manifestText,
		)
	)
		throw new Error(
			'Android manifest must declare optional android.hardware.camera capability',
		)

	if (!manifestText.includes('android.permission.BIND_VPN_SERVICE'))
		throw new Error(
			'Android VPN services must require android.permission.BIND_VPN_SERVICE',
		)

	const portraitMainActivity =
		/<activity\b(?=[^>]*android:name=["']\.MainActivity["'])(?=[^>]*android:screenOrientation=["']portrait["'])[^>]*>/
	if (!portraitMainActivity.test(manifestText))
		throw new Error('Android MainActivity must remain in portrait orientation')

	return true
}

export function filterAndroidPreviewPlugins(plugins) {
	if (!Array.isArray(plugins))
		throw new Error('Android Capacitor plugin manifest must be an array')
	return plugins.filter(({ pkg }) => pkg !== '@capacitor-community/admob')
}

export function assertApkContents(entries, manifest) {
	if (!entries.includes('assets/rahrow/native-runtime-manifest.json'))
		throw new Error('APK lacks its native runtime provenance manifest')
	if (manifest.firstRunExecutableDownloads !== false)
		throw new Error('APK runtime manifest must prohibit executable downloads')
	for (const engine of manifest.engines ?? []) {
		for (const [abi, libraries] of Object.entries(engine.libraries ?? {})) {
			for (const library of libraries) {
				if (!entries.includes(`lib/${abi}/${library}`))
					throw new Error(
						`APK does not package ${engine.engineId} ${abi} runtime ${library}`,
					)
			}
		}
	}
	for (const provider of manifest.tunnelProviders ?? []) {
		for (const [abi, libraries] of Object.entries(provider.libraries ?? {})) {
			for (const library of libraries) {
				if (!entries.includes(`lib/${abi}/${library}`))
					throw new Error(
						`APK does not package ${provider.providerId} ${abi} runtime ${library}`,
					)
			}
		}
	}
	if (
		(manifest.engines ?? []).map(({ engineId }) => engineId).join(',') !==
		requiredEngineIds.join(',')
	)
		throw new Error(
			'APK runtime manifest does not declare exactly xray and sing-box',
		)
	return true
}

function inspectAndroidRuntimes(root = mobileRoot) {
	const { pins, lock } = loadInputs(root)
	const requiredAbis = pins.targets?.android
	if (
		!Array.isArray(requiredAbis) ||
		requiredAbis.length === 0 ||
		new Set(requiredAbis).size !== requiredAbis.length
	)
		throw new Error('Android ABI targets must be a non-empty unique list')

	const engines = requiredEngineIds.map((engineId) => {
		const engine = pins.engines?.[engineId]
		if (!engine) throw new Error(`Native runtime pins omit ${engineId}`)
		const artifactRelativePath = posix.join(
			'native-runtimes',
			engineId,
			engine.androidArtifact,
		)
		const artifactPath = join(root, artifactRelativePath)
		validateAndroidRuntime({
			engineId,
			engine,
			pins,
			artifactRelativePath,
			artifactExists: existsSync(artifactPath),
			checksum: existsSync(artifactPath) ? sha256(artifactPath) : undefined,
			lockEntry: lock.artifacts?.[engineId]?.android,
		})
		return {
			engineId,
			artifact: engine.androidArtifact,
			artifactPath,
			sha256: lock.artifacts[engineId].android.sha256,
			source: lock.artifacts[engineId].android.source,
			toolchains: lock.artifacts[engineId].android.toolchains,
			recipe: lock.artifacts[engineId].android.recipe,
			libraries: collectAarNativeLibraries(
				zipEntries(artifactPath),
				engineId,
				requiredAbis,
			),
		}
	})
	const providerId = 'hev-socks5-tunnel'
	const provider = pins.tunnelProviders?.[providerId]
	const tunnelProviders = provider
		? (() => {
				const providerArtifactRelativePath = posix.join(
					'native-runtimes',
					providerId,
					provider.androidArtifact,
				)
				const providerArtifactPath = join(root, providerArtifactRelativePath)
				validateHevAndroidRuntime({
					provider,
					pins,
					artifactRelativePath: providerArtifactRelativePath,
					artifactExists: existsSync(providerArtifactPath),
					checksum: existsSync(providerArtifactPath)
						? sha256(providerArtifactPath)
						: undefined,
					lockEntry: lock.tunnelProviders?.[providerId]?.android,
				})
				return [
					{
						engineId: providerId,
						providerId,
						artifact: provider.androidArtifact,
						artifactPath: providerArtifactPath,
						sha256: lock.tunnelProviders[providerId].android.sha256,
						source: lock.tunnelProviders[providerId].android.source,
						toolchains: lock.tunnelProviders[providerId].android.toolchains,
						recipe: lock.tunnelProviders[providerId].android.recipe,
						libraries: collectAarNativeLibraries(
							zipEntries(providerArtifactPath),
							providerId,
							requiredAbis,
						),
					},
				]
			})()
		: []
	assertUniqueNativeLibraries([...engines, ...tunnelProviders])
	return {
		schemaVersion: 1,
		platform: 'android',
		abis: requiredAbis,
		engines,
		tunnelProviders,
		firstRunExecutableDownloads: false,
	}
}

function checkProject() {
	const { pins } = loadInputs()
	const project = readFileSync(join(androidAppRoot, 'build.gradle'), 'utf8')
	const manifest = readFileSync(
		join(androidAppRoot, 'src', 'main', 'AndroidManifest.xml'),
		'utf8',
	)
	validateAndroidProjectWiring(project, pins)
	validateAndroidManifestContract(manifest)
	return inspectAndroidRuntimes()
}

function stageRuntimes() {
	const manifest = checkProject()
	mkdirSync(androidLibrariesRoot, { recursive: true })
	for (const engine of manifest.engines) {
		const destination = join(androidLibrariesRoot, engine.artifact)
		rmSync(destination, { force: true })
		cpSync(engine.artifactPath, destination)
		delete engine.artifactPath
	}
	for (const provider of manifest.tunnelProviders) {
		const destination = join(androidLibrariesRoot, provider.artifact)
		rmSync(destination, { force: true })
		cpSync(provider.artifactPath, destination)
		delete provider.artifactPath
	}
	mkdirSync(dirname(androidManifestPath), { recursive: true })
	writeFileSync(androidManifestPath, `${JSON.stringify(manifest, null, '\t')}\n`)
	console.log('Staged pinned Android runtimes and provenance metadata.')
	return manifest
}

function verifyApk(apkPath) {
	const expected = inspectAndroidRuntimes()
	const absoluteApk = resolve(apkPath)
	if (!existsSync(absoluteApk)) throw new Error(`APK is missing: ${absoluteApk}`)
	const entries = zipEntries(absoluteApk)
	const embedded = JSON.parse(
		readZipEntry(absoluteApk, 'assets/rahrow/native-runtime-manifest.json'),
	)
	const comparable = structuredClone(expected)
	for (const engine of comparable.engines) delete engine.artifactPath
	for (const provider of comparable.tunnelProviders) delete provider.artifactPath
	if (JSON.stringify(embedded) !== JSON.stringify(comparable))
		throw new Error(
			'APK native runtime provenance is stale or does not match pins',
		)
	assertApkContents(entries, embedded)
	console.log(
		`Verified self-contained Android APK: ${relative(repositoryRoot, absoluteApk)}`,
	)
}

function prepareWebApplication() {
	const vite = join(mobileRoot, 'node_modules', '.bin', 'vite')
	const capacitor = join(mobileRoot, 'node_modules', '.bin', 'capacitor')
	for (const executable of [vite, capacitor]) {
		if (!existsSync(executable))
			throw new Error(`Workspace dependency is not installed: ${executable}`)
	}
	run(vite, createAndroidWebBuildPlan(), { cwd: mobileRoot })
	run(capacitor, ['copy', 'android'], { cwd: mobileRoot })
	const plugins = JSON.parse(readFileSync(androidCapacitorPluginsPath, 'utf8'))
	writeFileSync(
		androidCapacitorPluginsPath,
		`${JSON.stringify(filterAndroidPreviewPlugins(plugins), null, '\t')}\n`,
	)
}

function buildDebug() {
	stageRuntimes()
	prepareWebApplication()
	const gradleWrapper = join(mobileRoot, 'android', 'gradlew')
	if (!existsSync(gradleWrapper))
		throw new Error(`Checked-in Gradle wrapper is missing: ${gradleWrapper}`)
	run(gradleWrapper, createAndroidBuildPlan(), {
		cwd: join(mobileRoot, 'android'),
	})
	verifyApk(androidDebugApk)
	console.log(
		`Installable Android development preview: ${relative(repositoryRoot, androidDebugApk)}`,
	)
	return androidDebugApk
}

function usage() {
	console.error(
		'Usage: android-development-preview.mjs <check-project|stage-runtimes|build-debug|verify-apk> [apk-path]',
	)
}

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const command = process.argv[2]
	if (command === 'check-project') checkProject()
	else if (command === 'stage-runtimes') stageRuntimes()
	else if (command === 'build-debug') buildDebug()
	else if (command === 'verify-apk') {
		if (!process.argv[3]) {
			usage()
			process.exitCode = 2
		} else verifyApk(process.argv[3])
	} else {
		usage()
		process.exitCode = 2
	}
}
