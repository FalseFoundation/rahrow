import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	realpathSync,
	rmSync,
	statSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptRoot = dirname(fileURLToPath(import.meta.url))
const mobileRoot = resolve(scriptRoot, '..')
const repositoryRoot = resolve(mobileRoot, '../..')
const artifactsRoot = join(repositoryRoot, '.artifacts')
const nativeStageRoot = join(artifactsRoot, 'ios-native-runtimes')
const simulatorPreviewRoot = join(artifactsRoot, 'ios-simulator')
const devicePreviewRoot = join(artifactsRoot, 'ios-device')
const projectPath = join(mobileRoot, 'ios', 'App', 'App.xcodeproj')
let developerDirectory

export function loadPreviewInputs(root = mobileRoot) {
	return {
		contract: JSON.parse(
			readFileSync(join(root, 'ios-development-preview.json'), 'utf8'),
		),
		pins: JSON.parse(
			readFileSync(join(root, 'native-runtime-pins.json'), 'utf8'),
		),
	}
}

export function validatePreviewContract(contract, pins) {
	if (contract.schemaVersion !== 1)
		throw new Error('iOS preview contract schemaVersion must be 1')
	if (contract.application?.bundleIdentifier !== 'foundation.false.rahrow')
		throw new Error('iOS preview application bundle identifier is invalid')
	if (contract.simulator?.vpnAvailable !== false)
		throw new Error('The iOS Simulator preview must advertise VPN as unavailable')
	if (!contract.simulator.detail?.includes('fail closed'))
		throw new Error('The iOS Simulator limitation must explicitly fail closed')
	if (
		pins.schemaVersion !== 2 ||
		!/^\d+\.\d+\.\d+$/.test(pins.buildToolchains?.go?.version ?? '')
	)
		throw new Error('The iOS preview requires schema 2 native runtime pins')

	const extensions = new Map(
		contract.extensions?.map((extension) => [extension.engineId, extension]),
	)
	for (const engineId of ['xray', 'sing-box']) {
		const engine = pins.engines?.[engineId]
		const extension = extensions.get(engineId)
		if (!engine || !extension)
			throw new Error(`Missing iOS preview declaration for ${engineId}`)
		if (engine.appleArtifact !== `${extension.framework}.zip`)
			throw new Error(`${engineId} framework does not match its pinned artifact`)
		if (
			!extension.bundleIdentifier.startsWith(
				`${contract.application.bundleIdentifier}.`,
			)
		)
			throw new Error(
				`${engineId} extension is outside the application bundle namespace`,
			)
	}
	if (extensions.size !== 2)
		throw new Error('The iOS preview must declare exactly the supported engines')
	return true
}

export function classifyRuntimeAvailability({
	archiveExists,
	lockEntry,
	checksum,
	expectedProvenance,
}) {
	if (!archiveExists) return { available: false, reason: 'artifact-missing' }
	if (!lockEntry) return { available: false, reason: 'checksum-lock-missing' }
	if (!/^[a-f0-9]{64}$/.test(lockEntry.sha256 ?? ''))
		return { available: false, reason: 'checksum-lock-invalid' }
	if (checksum !== lockEntry.sha256)
		return { available: false, reason: 'checksum-mismatch' }
	if (
		expectedProvenance &&
		(lockEntry.file !== expectedProvenance.file ||
			lockEntry.source?.version !== expectedProvenance.version ||
			lockEntry.source?.repository !== expectedProvenance.repository ||
			lockEntry.source?.revision !== expectedProvenance.revision ||
			lockEntry.toolchains?.go !== expectedProvenance.goVersion ||
			JSON.stringify(lockEntry.recipe) !==
				JSON.stringify(expectedProvenance.recipe))
	)
		return { available: false, reason: 'provenance-mismatch' }
	return { available: true }
}

export function assertSafeLinkedLibraries(output, bundleRoot) {
	const forbiddenPrefixes = ['/opt/homebrew/', '/usr/local/', '/nix/store/']
	for (const line of output.split('\n').slice(1)) {
		const dependency = line.trim().split(' ')[0]
		if (!dependency) continue
		if (forbiddenPrefixes.some((prefix) => dependency.startsWith(prefix)))
			throw new Error(`Bundle links an external dependency: ${dependency}`)
		if (
			dependency.startsWith('/') &&
			!dependency.startsWith('/System/Library/') &&
			!dependency.startsWith('/usr/lib/') &&
			!dependency.startsWith(bundleRoot)
		)
			throw new Error(`Bundle links an unowned absolute dependency: ${dependency}`)
	}
	return true
}

export function assertProjectWiring(projectText, contract) {
	for (const extension of contract.extensions) {
		for (const required of [
			extension.target,
			extension.product,
			extension.bundleIdentifier,
		]) {
			if (!projectText.includes(required))
				throw new Error(`Xcode project is missing ${required}`)
		}
	}
	if (!projectText.includes('Embed App Extensions'))
		throw new Error('Xcode project does not embed its packet-tunnel extensions')
	return true
}

function sha256(path) {
	return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function readOptionalJson(path) {
	return existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : undefined
}

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		cwd: options.cwd ?? repositoryRoot,
		encoding: options.capture ? 'utf8' : undefined,
		stdio: options.capture ? 'pipe' : 'inherit',
		env: {
			...process.env,
			...(developerDirectory ? { DEVELOPER_DIR: developerDirectory } : {}),
			...options.env,
		},
	})
	if (result.error) throw result.error
	if (result.status !== 0) {
		const detail = options.capture ? `\n${result.stderr || result.stdout}` : ''
		throw new Error(`${command} exited with status ${result.status}${detail}`)
	}
	return options.capture ? result.stdout.trim() : ''
}

function requireFullXcode() {
	const candidates = [
		process.env.DEVELOPER_DIR,
		'/Applications/Xcode.app/Contents/Developer',
	].filter(Boolean)
	for (const candidate of candidates) {
		const result = spawnSync('xcodebuild', ['-version'], {
			encoding: 'utf8',
			env: { ...process.env, DEVELOPER_DIR: candidate },
		})
		if (result.status === 0) {
			developerDirectory = candidate
			return
		}
	}
	const selected = spawnSync('xcodebuild', ['-version'], { encoding: 'utf8' })
	if (selected.status === 0) return
	else
		throw new Error(
			'Full Xcode is required to build the local Simulator application. Select it with xcode-select; signing credentials are not required.',
		)
}

function ensureInside(path, root) {
	const normalizedRoot = `${resolve(root)}${sep}`
	if (!`${resolve(path)}${sep}`.startsWith(normalizedRoot))
		throw new Error(`Refusing to write outside ${root}: ${path}`)
}

function findNamedDirectory(root, name) {
	if (!existsSync(root)) return undefined
	const pending = [root]
	while (pending.length > 0) {
		const directory = pending.shift()
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			if (!entry.isDirectory()) continue
			const path = join(directory, entry.name)
			if (entry.name === name) return path
			pending.push(path)
		}
	}
	return undefined
}

function validateFrameworkSlices(frameworkPath, engineId) {
	const infoPath = join(frameworkPath, 'Info.plist')
	if (!existsSync(infoPath))
		throw new Error(`${engineId} XCFramework has no Info.plist`)
	const json = run('plutil', ['-convert', 'json', '-o', '-', infoPath], {
		capture: true,
	})
	const info = JSON.parse(json)
	const libraries = info.AvailableLibraries ?? []
	const deviceArchitectures = new Set()
	const simulatorArchitectures = new Set()
	for (const library of libraries) {
		if (library.SupportedPlatform !== 'ios') continue
		const destination =
			library.SupportedPlatformVariant === 'simulator'
				? simulatorArchitectures
				: deviceArchitectures
		for (const architecture of library.SupportedArchitectures ?? [])
			destination.add(architecture)
	}
	if (!deviceArchitectures.has('arm64'))
		throw new Error(`${engineId} XCFramework lacks the iOS arm64 device slice`)
	for (const architecture of ['arm64', 'x86_64']) {
		if (!simulatorArchitectures.has(architecture))
			throw new Error(
				`${engineId} XCFramework lacks the iOS Simulator ${architecture} slice`,
			)
	}
}

function stageNativeRuntimes({ required }) {
	const { contract, pins } = loadPreviewInputs()
	validatePreviewContract(contract, pins)
	const lock = readOptionalJson(join(mobileRoot, 'native-runtime-lock.json'))
	const statuses = []
	mkdirSync(nativeStageRoot, { recursive: true })

	for (const extension of contract.extensions) {
		const engine = pins.engines[extension.engineId]
		const archivePath = join(
			mobileRoot,
			'native-runtimes',
			extension.engineId,
			engine.appleArtifact,
		)
		const lockEntry = lock?.artifacts?.[extension.engineId]?.apple
		const status = classifyRuntimeAvailability({
			archiveExists: existsSync(archivePath),
			lockEntry,
			checksum: existsSync(archivePath) ? sha256(archivePath) : undefined,
			expectedProvenance: {
				file: ['native-runtimes', extension.engineId, engine.appleArtifact].join(
					'/',
				),
				version: engine.version,
				repository: engine.repository,
				revision: engine.revision,
				goVersion: pins.buildToolchains.go.version,
				recipe: engine.build.apple,
			},
		})
		statuses.push({ engineId: extension.engineId, ...status })
		if (!status.available) {
			if (required)
				throw new Error(
					`${extension.engineId} Apple runtime is unavailable (${status.reason}); device previews require pinned, checksummed XCFrameworks`,
				)
			continue
		}

		const engineStage = join(nativeStageRoot, extension.engineId)
		ensureInside(engineStage, artifactsRoot)
		rmSync(engineStage, { recursive: true, force: true })
		mkdirSync(engineStage, { recursive: true })
		const temporary = mkdtempSync(join(tmpdir(), 'rahrow-ios-runtime-'))
		try {
			run('ditto', ['-x', '-k', archivePath, temporary])
			const framework = findNamedDirectory(temporary, extension.framework)
			if (!framework)
				throw new Error(
					`${extension.engineId} archive does not contain ${extension.framework}`,
				)
			validateFrameworkSlices(framework, extension.engineId)
			cpSync(framework, join(engineStage, extension.framework), {
				recursive: true,
			})
		} finally {
			rmSync(temporary, { recursive: true, force: true })
		}
	}
	writeFileSync(
		join(nativeStageRoot, 'availability.json'),
		`${JSON.stringify({ schemaVersion: 1, runtimes: statuses }, null, '\t')}\n`,
	)
	return statuses
}

function stageSimulatorStubRuntimes(contract, statuses) {
	const unavailable = new Set(
		statuses
			.filter((status) => !status.available)
			.map((status) => status.engineId),
	)
	if (unavailable.size === 0) return

	const sdk = run('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-path'], {
		capture: true,
	})
	for (const extension of contract.extensions) {
		if (!unavailable.has(extension.engineId)) continue
		const engineStage = join(nativeStageRoot, extension.engineId)
		ensureInside(engineStage, artifactsRoot)
		rmSync(engineStage, { recursive: true, force: true })
		mkdirSync(engineStage, { recursive: true })
		const temporary = mkdtempSync(join(tmpdir(), 'rahrow-ios-stub-'))
		try {
			const engineName = extension.engineId.replaceAll('-', '_')
			const symbol = `rahrow_${engineName}_simulator_unavailable`
			const source = join(temporary, 'stub.c')
			const headers = join(temporary, 'Headers')
			mkdirSync(headers, { recursive: true })
			writeFileSync(source, `void ${symbol}(void) {}\n`)
			writeFileSync(
				join(headers, `RahRow${engineName}SimulatorStub.h`),
				`void ${symbol}(void);\n`,
			)
			const libraries = []
			for (const architecture of ['arm64', 'x86_64']) {
				const object = join(temporary, `${architecture}.o`)
				const library = join(temporary, `${architecture}.a`)
				run('xcrun', [
					'clang',
					'-target',
					`${architecture}-apple-ios15.0-simulator`,
					'-isysroot',
					sdk,
					'-c',
					source,
					'-o',
					object,
				])
				run('xcrun', ['libtool', '-static', '-o', library, object])
				libraries.push(library)
			}
			const universal = join(
				temporary,
				`lib${extension.framework.slice(0, -12)}.a`,
			)
			run('xcrun', ['lipo', '-create', ...libraries, '-output', universal])
			run('xcodebuild', [
				'-create-xcframework',
				'-library',
				universal,
				'-headers',
				headers,
				'-output',
				join(engineStage, extension.framework),
			])
		} finally {
			rmSync(temporary, { recursive: true, force: true })
		}
	}
}

function checkProject({ requireRuntimes }) {
	const { contract, pins } = loadPreviewInputs()
	validatePreviewContract(contract, pins)
	const projectFile = join(projectPath, 'project.pbxproj')
	if (!existsSync(projectFile)) throw new Error('iOS Xcode project is missing')
	assertProjectWiring(readFileSync(projectFile, 'utf8'), contract)
	return stageNativeRuntimes({ required: requireRuntimes })
}

export function collectMissingWebAssets(distRoot) {
	const missing = new Set()
	const documents = []
	const pending = [distRoot]
	while (pending.length > 0) {
		const current = pending.shift()
		for (const entry of readdirSync(current, { withFileTypes: true })) {
			const path = join(current, entry.name)
			if (entry.isDirectory()) pending.push(path)
			else if (/\.(?:css|html)$/.test(entry.name)) documents.push(path)
		}
	}
	for (const document of documents) {
		const contents = readFileSync(document, 'utf8')
		const references = [
			...contents.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g),
			...contents.matchAll(/(?:src|href)=["']([^"']+)["']/g),
		]
		for (const match of references) {
			const reference = match[1].split(/[?#]/, 1)[0]
			if (
				!reference ||
				reference.startsWith('data:') ||
				reference.startsWith('http:') ||
				reference.startsWith('https:') ||
				reference.startsWith('#')
			)
				continue
			const asset = reference.startsWith('/')
				? join(distRoot, reference.slice(1))
				: resolve(dirname(document), reference)
			if (!existsSync(asset)) missing.add(relative(distRoot, asset))
		}
	}
	return [...missing].sort()
}

export function stabilizeCapAppSpmDependencyPaths(source) {
	return source.replace(
		/path:\s*"\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/node_modules\/\.pnpm\/[^"]+\/node_modules\/((?:@[^"/]+\/)?[^"/]+)"/g,
		'path: "../../../node_modules/$1"',
	)
}

function rewriteCapAppSpmPackagePaths() {
	const packageSwiftPath = join(
		mobileRoot,
		'ios',
		'App',
		'CapApp-SPM',
		'Package.swift',
	)
	if (!existsSync(packageSwiftPath))
		throw new Error(`CapApp-SPM Package.swift is missing: ${packageSwiftPath}`)
	const source = readFileSync(packageSwiftPath, 'utf8')
	const next = stabilizeCapAppSpmDependencyPaths(source)
	if (next !== source) writeFileSync(packageSwiftPath, next)
}

function prepareWebApplication() {
	const vite = join(mobileRoot, 'node_modules', '.bin', 'vite')
	const capacitor = join(mobileRoot, 'node_modules', '.bin', 'capacitor')
	for (const executable of [vite, capacitor]) {
		if (!existsSync(executable))
			throw new Error(`Workspace dependency is not installed: ${executable}`)
	}
	run(vite, ['build'], { cwd: mobileRoot })
	const missingAssets = collectMissingWebAssets(join(mobileRoot, 'dist'))
	if (missingAssets.length > 0)
		throw new Error(
			`Vite output references assets that are not bundled:\n${missingAssets.join('\n')}`,
		)
	run(capacitor, ['copy', 'ios'], { cwd: mobileRoot })
	rewriteCapAppSpmPackagePaths()
}

export function createXcodeBuildPlan({
	platform,
	project,
	scheme,
	derivedData,
	sourcePackages,
	moduleCache,
	nativeRuntimeRoot,
	destination,
	allowProvisioningUpdates = false,
}) {
	if (platform !== 'simulator' && platform !== 'device')
		throw new Error('Xcode build platform must be simulator or device')
	const isSimulator = platform === 'simulator'
	const args = [
		'-project',
		project,
		'-scheme',
		scheme,
		'-configuration',
		'Debug',
		'-sdk',
		isSimulator ? 'iphonesimulator' : 'iphoneos',
		'-destination',
		destination ??
			(isSimulator ? 'generic/platform=iOS Simulator' : 'generic/platform=iOS'),
		'-derivedDataPath',
		derivedData,
		'-clonedSourcePackagesDirPath',
		sourcePackages,
		'COMPILER_INDEX_STORE_ENABLE=NO',
		`CLANG_MODULE_CACHE_PATH=${moduleCache}`,
		`SWIFTPM_MODULECACHE_OVERRIDE=${moduleCache}`,
		`RAHROW_PREVIEW_FAIL_CLOSED=${isSimulator ? 'YES' : 'NO'}`,
		`RAHROW_RUNTIME_ADAPTER_READY=${isSimulator ? 'NO' : 'YES'}`,
		`RAHROW_NATIVE_RUNTIME_ROOT=${nativeRuntimeRoot}`,
	]
	if (isSimulator) args.push('CODE_SIGNING_ALLOWED=NO')
	else if (allowProvisioningUpdates) args.push('-allowProvisioningUpdates')
	args.push('build')
	return args
}

function buildSimulator() {
	requireFullXcode()
	const { contract } = loadPreviewInputs()
	const statuses = checkProject({ requireRuntimes: false })
	stageSimulatorStubRuntimes(contract, statuses)
	const derivedData = join(simulatorPreviewRoot, 'DerivedData')
	const sourcePackages = join(simulatorPreviewRoot, 'SourcePackages')
	const moduleCache = join(simulatorPreviewRoot, 'ModuleCache')
	ensureInside(derivedData, artifactsRoot)
	rmSync(simulatorPreviewRoot, { recursive: true, force: true })
	mkdirSync(simulatorPreviewRoot, { recursive: true })
	mkdirSync(sourcePackages, { recursive: true })
	mkdirSync(moduleCache, { recursive: true })
	prepareWebApplication()

	run(
		'xcodebuild',
		createXcodeBuildPlan({
			platform: 'simulator',
			project: projectPath,
			scheme: contract.application.scheme,
			derivedData,
			sourcePackages,
			moduleCache,
			nativeRuntimeRoot: nativeStageRoot,
		}),
	)

	const productsRoot = join(derivedData, 'Build', 'Products')
	const builtApp = findNamedDirectory(productsRoot, contract.application.product)
	if (!builtApp)
		throw new Error(`xcodebuild did not produce ${contract.application.product}`)
	const artifact = join(simulatorPreviewRoot, contract.application.artifact)
	cpSync(builtApp, artifact, { recursive: true })

	const metadataRoot = join(artifact, 'RahRowPreview')
	mkdirSync(metadataRoot, { recursive: true })
	for (const source of contract.metadata) {
		const sourcePath = join(repositoryRoot, source)
		const mobileSourcePath = join(mobileRoot, source)
		const selected = existsSync(sourcePath) ? sourcePath : mobileSourcePath
		if (!existsSync(selected))
			throw new Error(`Preview metadata is missing: ${source}`)
		cpSync(selected, join(metadataRoot, basename(source)))
	}
	writeFileSync(
		join(metadataRoot, 'preview-capabilities.json'),
		`${JSON.stringify(
			{
				schemaVersion: 1,
				platform: 'ios-simulator',
				vpnAvailable: false,
				detail: contract.simulator.detail,
				runtimes: statuses,
				firstRunExecutableDownloads: false,
			},
			null,
			'\t',
		)}\n`,
	)
	verifyBundle(artifact, { requireRuntimes: false })
	console.log(`Installable Simulator preview: ${artifact}`)
}

function buildDevice(destination = process.env.RAHROW_IOS_DESTINATION) {
	requireFullXcode()
	const { contract } = loadPreviewInputs()
	checkProject({ requireRuntimes: true })
	const derivedData = join(devicePreviewRoot, 'DerivedData')
	const sourcePackages = join(devicePreviewRoot, 'SourcePackages')
	const moduleCache = join(devicePreviewRoot, 'ModuleCache')
	ensureInside(derivedData, artifactsRoot)
	rmSync(devicePreviewRoot, { recursive: true, force: true })
	mkdirSync(devicePreviewRoot, { recursive: true })
	mkdirSync(sourcePackages, { recursive: true })
	mkdirSync(moduleCache, { recursive: true })
	prepareWebApplication()

	run(
		'xcodebuild',
		createXcodeBuildPlan({
			platform: 'device',
			project: projectPath,
			scheme: contract.application.scheme,
			derivedData,
			sourcePackages,
			moduleCache,
			nativeRuntimeRoot: nativeStageRoot,
			destination,
			allowProvisioningUpdates:
				process.env.RAHROW_XCODE_ALLOW_PROVISIONING_UPDATES === '1',
		}),
	)

	const builtApp = findNamedDirectory(
		join(derivedData, 'Build', 'Products'),
		contract.application.product,
	)
	if (!builtApp)
		throw new Error(`xcodebuild did not produce ${contract.application.product}`)
	const artifact = join(devicePreviewRoot, contract.application.artifact)
	run('ditto', [builtApp, artifact])
	verifyBundle(artifact, { requireRuntimes: true })
	console.log(`Installable signed device preview: ${artifact}`)
	return artifact
}

function installDevice(device, bundle = join(devicePreviewRoot, 'RahRow.app')) {
	if (!device)
		throw new Error(
			'Provide an iOS device name or identifier, for example: install-device h',
		)
	verifyBundle(bundle, { requireRuntimes: true })
	run('xcrun', [
		'devicectl',
		'device',
		'install',
		'app',
		'--device',
		device,
		bundle,
	])
}

function plistValue(path, key) {
	return run('plutil', ['-extract', key, 'raw', '-o', '-', path], {
		capture: true,
	})
}

function listMachOBinaries(root) {
	const binaries = []
	const pending = [root]
	while (pending.length > 0) {
		const current = pending.shift()
		for (const entry of readdirSync(current, { withFileTypes: true })) {
			const path = join(current, entry.name)
			if (entry.isDirectory()) pending.push(path)
			else if (entry.isFile() && statSync(path).mode & 0o111) binaries.push(path)
		}
	}
	return binaries
}

function verifyBundle(bundlePath, { requireRuntimes }) {
	const { contract, pins } = loadPreviewInputs()
	validatePreviewContract(contract, pins)
	const app = realpathSync(bundlePath)
	const appInfo = join(app, 'Info.plist')
	if (
		plistValue(appInfo, 'CFBundleIdentifier') !==
		contract.application.bundleIdentifier
	)
		throw new Error(
			'Built application bundle identifier does not match the contract',
		)

	for (const extension of contract.extensions) {
		const appex = join(app, 'PlugIns', extension.product)
		if (!existsSync(appex))
			throw new Error(`Application does not embed ${extension.product}`)
		if (
			plistValue(join(appex, 'Info.plist'), 'CFBundleIdentifier') !==
			extension.bundleIdentifier
		)
			throw new Error(`${extension.product} has the wrong bundle identifier`)
		if (requireRuntimes) {
			const embeddedFramework = join(
				appex,
				'Frameworks',
				extension.framework.replace('.xcframework', '.framework'),
			)
			if (!existsSync(embeddedFramework))
				throw new Error(
					`${extension.product} does not embed ${extension.framework}`,
				)
		}
	}

	const capabilities = join(app, 'RahRowPreview', 'preview-capabilities.json')
	if (!requireRuntimes) {
		if (!existsSync(capabilities))
			throw new Error('Simulator bundle lacks fail-closed capability metadata')
		const preview = JSON.parse(readFileSync(capabilities, 'utf8'))
		if (
			preview.vpnAvailable !== false ||
			preview.firstRunExecutableDownloads !== false
		)
			throw new Error('Simulator bundle advertises an unsafe runtime capability')
	}

	for (const binary of listMachOBinaries(app)) {
		const fileType = run('file', ['-b', binary], { capture: true })
		if (!fileType.includes('Mach-O')) continue
		assertSafeLinkedLibraries(
			run('otool', ['-L', binary], { capture: true }),
			app,
		)
	}
	console.log(
		`Verified self-contained ${requireRuntimes ? 'device' : 'Simulator'} bundle: ${relative(repositoryRoot, app)}`,
	)
}

function usage() {
	console.error(
		'Usage: ios-development-preview.mjs <check-project|stage-runtimes|build-simulator|build-device|install-device|verify-bundle> [destination|device|path] [--device]',
	)
}

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const command = process.argv[2]
	if (command === 'check-project') checkProject({ requireRuntimes: false })
	else if (command === 'stage-runtimes') stageNativeRuntimes({ required: true })
	else if (command === 'build-simulator') buildSimulator()
	else if (command === 'build-device') buildDevice(process.argv[3])
	else if (command === 'install-device') installDevice(process.argv[3])
	else if (command === 'verify-bundle') {
		const path = process.argv[3]
		if (!path) {
			usage()
			process.exitCode = 2
		} else
			verifyBundle(resolve(path), {
				requireRuntimes: process.argv.includes('--device'),
			})
	} else {
		usage()
		process.exitCode = 2
	}
}
