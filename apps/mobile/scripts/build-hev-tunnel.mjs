import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const mobileRoot = join(dirname(scriptPath), '..')

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: options.cwd,
		stdio: 'inherit',
		env: { ...process.env, ...options.env },
	})
	if (result.error) throw result.error
	if (result.status !== 0)
		throw new Error(`${command} exited with status ${result.status}`)
}

function output(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: options.cwd,
		encoding: 'utf8',
		env: { ...process.env, ...options.env },
	})
	if (result.error) throw result.error
	if (result.status !== 0)
		throw new Error(`${command} exited with status ${result.status}`)
	return result.stdout.trim()
}

function sha256(path) {
	return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function requireAndroidNdk(pins) {
	const sdkRoot = process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME
	const explicit = process.env.ANDROID_NDK_HOME
	const ndkRoot =
		explicit ||
		(sdkRoot && join(sdkRoot, 'ndk', pins.buildToolchains.androidNdk.version))
	if (!ndkRoot || !existsSync(join(ndkRoot, 'ndk-build')))
		throw new Error(
			`HEV requires local Android NDK ${pins.buildToolchains.androidNdk.version}; set ANDROID_NDK_HOME or ANDROID_SDK_ROOT`,
		)
	return ndkRoot
}

function clonePinned(provider, destination) {
	run('git', ['init', destination], { env: { GIT_TERMINAL_PROMPT: '0' } })
	run('git', ['-C', destination, 'remote', 'add', 'origin', provider.repository])
	run(
		'git',
		['-C', destination, 'fetch', '--depth=1', 'origin', provider.revision],
		{
			env: { GIT_TERMINAL_PROMPT: '0' },
		},
	)
	run('git', ['-C', destination, 'checkout', '--detach', 'FETCH_HEAD'])
	if (
		output('git', ['-C', destination, 'rev-parse', 'HEAD']) !== provider.revision
	)
		throw new Error('HEV source revision mismatch')
	run(
		'git',
		[
			'-C',
			destination,
			'submodule',
			'update',
			'--init',
			'--recursive',
			'--depth=1',
		],
		{
			env: { GIT_TERMINAL_PROMPT: '0' },
		},
	)
	for (const [submodule, revision] of Object.entries(
		provider.submodules ?? {},
	)) {
		if (
			output('git', ['-C', join(destination, submodule), 'rev-parse', 'HEAD']) !==
			revision
		)
			throw new Error(`HEV submodule revision mismatch: ${submodule}`)
	}
}

function stageLicenses(source, staging, provider) {
	const licenses = join(staging, 'META-INF', 'licenses')
	mkdirSync(licenses, { recursive: true })
	cpSync(join(source, 'LICENSE'), join(licenses, 'hev-socks5-tunnel-LICENSE'))
	for (const submodule of Object.keys(provider.submodules ?? {})) {
		const submoduleRoot = join(source, submodule)
		const license = readdirSync(submoduleRoot)
			.filter((entry) => /^(?:license|copying|notice)(?:[.-]|$)/i.test(entry))
			.find((entry) => statSync(join(submoduleRoot, entry)).isFile())
		if (!license)
			throw new Error(`HEV submodule license is missing: ${submodule}`)
		cpSync(
			join(submoduleRoot, license),
			join(licenses, `${submodule.replaceAll('/', '-')}-${license}`),
		)
	}
	writeFileSync(
		join(staging, 'META-INF', 'rahrow-hev-source.json'),
		`${JSON.stringify(
			{
				version: provider.version,
				repository: provider.repository,
				revision: provider.revision,
				submodules: provider.submodules,
			},
			null,
			'\t',
		)}\n`,
	)
}

function buildAndroid(source, provider, pins, destination) {
	const ndkRoot = requireAndroidNdk(pins)
	run(
		join(ndkRoot, 'ndk-build'),
		[
			`NDK_PROJECT_PATH=${source}`,
			`APP_BUILD_SCRIPT=${join(source, 'Android.mk')}`,
			`NDK_APPLICATION_MK=${join(source, 'Application.mk')}`,
			'APP_CFLAGS=-O3 -DPKGNAME=foundation/falsefoundation/rahrow -DCLSNAME=HevSocks5TunnelNative',
		],
		{ cwd: source },
	)

	const staging = join(source, 'rahrow-aar')
	mkdirSync(join(staging, 'jni'), { recursive: true })
	for (const abi of readdirSync(join(source, 'libs'))) {
		const library = join(source, 'libs', abi, 'libhev-socks5-tunnel.so')
		if (!existsSync(library)) continue
		const destination = join(staging, 'jni', abi)
		mkdirSync(destination, { recursive: true })
		cpSync(library, join(destination, 'libhev-socks5-tunnel.so'))
	}
	writeFileSync(
		join(staging, 'AndroidManifest.xml'),
		'<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="foundation.falsefoundation.rahrow.hev" />\n',
	)
	stageLicenses(source, staging, provider)
	const emptyClasses = join(source, 'rahrow-empty-classes')
	mkdirSync(emptyClasses)
	run('jar', ['cf', join(staging, 'classes.jar'), '.'], { cwd: emptyClasses })
	run('jar', ['cf', destination, '.'], { cwd: staging })
	return provider.build.android
}

function buildApple(source, provider, destination) {
	run(provider.build.apple[0], provider.build.apple.slice(1), { cwd: source })
	const framework = join(source, 'HevSocks5Tunnel.xcframework')
	if (!existsSync(framework))
		throw new Error('HEV did not produce its XCFramework')
	run('ditto', ['-c', '-k', '--keepParent', framework, destination])
	return provider.build.apple
}

function main(platform = process.argv[2]) {
	if (platform !== 'android' && platform !== 'apple')
		throw new Error('HEV platform must be android or apple')
	const pins = JSON.parse(
		readFileSync(join(mobileRoot, 'native-runtime-pins.json'), 'utf8'),
	)
	const provider = pins.tunnelProviders?.['hev-socks5-tunnel']
	if (!provider) throw new Error('HEV source pin is missing')
	const temporaryRoot = mkdtempSync(join(tmpdir(), 'rahrow-hev-'))
	try {
		const source = join(temporaryRoot, 'source')
		clonePinned(provider, source)
		const artifactName = provider[`${platform}Artifact`]
		const artifactRoot = join(mobileRoot, 'native-runtimes', 'hev-socks5-tunnel')
		mkdirSync(artifactRoot, { recursive: true })
		const artifactPath = join(artifactRoot, artifactName)
		const recipe =
			platform === 'android'
				? buildAndroid(source, provider, pins, artifactPath)
				: buildApple(source, provider, artifactPath)
		const lockPath = join(mobileRoot, 'native-runtime-lock.json')
		const lock = existsSync(lockPath)
			? JSON.parse(readFileSync(lockPath, 'utf8'))
			: { schemaVersion: 2, artifacts: {} }
		lock.tunnelProviders ??= {}
		lock.tunnelProviders['hev-socks5-tunnel'] ??= {}
		lock.tunnelProviders['hev-socks5-tunnel'][platform] = {
			file: ['native-runtimes', 'hev-socks5-tunnel', artifactName].join('/'),
			sha256: sha256(artifactPath),
			source: {
				version: provider.version,
				repository: provider.repository,
				revision: provider.revision,
				license: provider.license,
				sourceArchiveSha256: provider.sourceArchiveSha256,
				submodules: provider.submodules,
			},
			toolchains:
				platform === 'android'
					? { androidNdk: pins.buildToolchains.androidNdk.version }
					: { xcode: 'local-only' },
			recipe,
		}
		writeFileSync(lockPath, `${JSON.stringify(lock, null, '\t')}\n`)
	} finally {
		rmSync(temporaryRoot, { recursive: true, force: true })
	}
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) main()
