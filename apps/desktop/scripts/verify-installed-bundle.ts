import { execFile } from 'node:child_process'
import { lstat, readdir, readFile, realpath, stat } from 'node:fs/promises'
import { basename, relative, resolve, sep } from 'node:path'
import { arch, env, exit, platform } from 'node:process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

type DesktopBundlePlatform = 'linux' | 'macos' | 'windows'
type DesktopRuntimeTarget =
	| 'darwin-arm64'
	| 'darwin-x64'
	| 'linux-arm64'
	| 'linux-x64'
	| 'windows-x64'
type BundledEngine = 'sing-box' | 'xray'

interface TauriBundleConfig {
	readonly bundle?: {
		readonly externalBin?: readonly string[]
		readonly resources?: Readonly<Record<string, string>>
	}
}

interface RuntimeManifest {
	readonly engine: string
	readonly version: string
	readonly availability: string
	readonly artifacts: readonly { readonly platform: string }[]
}

interface BundleFile {
	readonly absolutePath: string
	readonly relativePath: string
	readonly size: number
	readonly mode: number
}

export interface InstalledDesktopBundleVerificationOptions {
	readonly bundlePath: string
	readonly target: DesktopRuntimeTarget
	readonly sidecarConfigPath?: string
	readonly windowsConfigPath?: string
	readonly runtimeManifestPaths?: Readonly<Record<BundledEngine, string>>
	readonly inspectEngineVersion?: (
		engine: BundledEngine,
		executablePath: string,
	) => Promise<string>
}

export interface InstalledDesktopBundleVerification {
	readonly bundlePath: string
	readonly target: DesktopRuntimeTarget
	readonly engines: Readonly<Record<BundledEngine, string>>
	readonly resources: readonly string[]
}

const execFileAsync = promisify(execFile)
const desktopRoot = fileURLToPath(new URL('..', import.meta.url))
const defaultSidecarConfigPath = resolve(
	desktopRoot,
	'src-tauri',
	'tauri.sidecar.json',
)
const defaultWindowsConfigPath = resolve(
	desktopRoot,
	'src-tauri',
	'tauri.windows.conf.json',
)
const defaultRuntimeManifestPaths: Readonly<Record<BundledEngine, string>> = {
	xray: fileURLToPath(
		new URL('../../../engines/xray/runtime.json', import.meta.url),
	),
	'sing-box': fileURLToPath(
		new URL('../../../engines/sing-box/runtime.json', import.meta.url),
	),
}
const requiredResources = [
	'binaries/geoip.dat',
	'binaries/geosite.dat',
	'binaries/LICENSE-xray',
	'binaries/LICENSE-sing-box',
	'../../../THIRD_PARTY_NOTICES.md',
] as const
const requiredWindowsResources = [
	'binaries/wintun.dll',
	'binaries/LICENSE-Wintun',
] as const

export async function verifyInstalledDesktopBundle(
	options: InstalledDesktopBundleVerificationOptions,
): Promise<InstalledDesktopBundleVerification> {
	const bundlePath = await requireBundleDirectory(options.bundlePath)
	const platformName = bundlePlatform(options.target)
	const sidecarConfig = await readConfig(
		options.sidecarConfigPath ?? defaultSidecarConfigPath,
	)
	const windowsConfig =
		platformName === 'windows'
			? await readConfig(options.windowsConfigPath ?? defaultWindowsConfigPath)
			: undefined
	const externalBins = requireStringArray(
		sidecarConfig.bundle?.externalBin,
		'bundle.externalBin',
	)
	const resources = {
		...requireResourceMap(sidecarConfig.bundle?.resources, 'bundle.resources'),
		...(windowsConfig
			? requireResourceMap(
					windowsConfig.bundle?.resources,
					'Windows bundle.resources',
				)
			: {}),
	}

	const files = await listBundleFiles(bundlePath)
	const manifestPaths =
		options.runtimeManifestPaths ?? defaultRuntimeManifestPaths
	const engineFiles = {} as Record<BundledEngine, string>
	for (const engine of ['xray', 'sing-box'] as const) {
		const externalBin = requireExternalBin(externalBins, engine)
		const manifest = await readRuntimeManifest(manifestPaths[engine])
		requireBundledTarget(manifest, engine, options.target)
		const installedName = `${basename(externalBin)}${
			platformName === 'windows' ? '.exe' : ''
		}`
		const executable = requireUniqueFile(files, installedName, engine)
		requireBinary(executable, platformName)
		const versionOutput = await (
			options.inspectEngineVersion ?? inspectEngineVersion
		)(engine, executable.absolutePath)
		if (!containsVersion(versionOutput, manifest.version)) {
			throw new Error(
				`${engine} in the installed bundle does not report pinned version ${manifest.version}`,
			)
		}
		engineFiles[engine] = executable.absolutePath
	}

	const installedResources: string[] = []
	for (const source of [
		...requiredResources,
		...(platformName === 'windows' ? requiredWindowsResources : []),
	]) {
		const destination = requireResourceDestination(resources, source)
		const resource = requireUniqueDestination(files, destination, source)
		if (resource.size === 0) {
			throw new Error(`Bundled resource ${destination} is empty`)
		}
		installedResources.push(resource.absolutePath)
	}

	return {
		bundlePath,
		target: options.target,
		engines: engineFiles,
		resources: installedResources,
	}
}

async function requireBundleDirectory(path: string): Promise<string> {
	const resolved = await realpath(path)
	const metadata = await stat(resolved)
	if (!metadata.isDirectory())
		throw new Error(`Bundle is not a directory: ${path}`)
	return resolved
}

async function readConfig(path: string): Promise<TauriBundleConfig> {
	const value: unknown = JSON.parse(await readFile(path, 'utf8'))
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`Invalid Tauri bundle config: ${path}`)
	}
	return value as TauriBundleConfig
}

function requireStringArray(
	value: readonly string[] | undefined,
	field: string,
): readonly string[] {
	if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
		throw new Error(`Tauri ${field} must be an array of paths`)
	}
	return value
}

function requireResourceMap(
	value: Readonly<Record<string, string>> | undefined,
	field: string,
): Readonly<Record<string, string>> {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`Tauri ${field} must be a resource map`)
	}
	for (const [source, destination] of Object.entries(value)) {
		if (!source || typeof destination !== 'string' || !destination) {
			throw new Error(`Tauri ${field} contains an invalid resource mapping`)
		}
		requireSafeDestination(destination)
	}
	return value
}

function requireExternalBin(
	externalBins: readonly string[],
	engine: BundledEngine,
): string {
	const matches = externalBins.filter((entry) => basename(entry) === engine)
	if (matches.length !== 1) {
		throw new Error(
			`Tauri bundle.externalBin must contain exactly one ${engine} sidecar`,
		)
	}
	return matches[0] as string
}

function requireResourceDestination(
	resources: Readonly<Record<string, string>>,
	source: string,
): string {
	const destination = resources[source]
	if (!destination) {
		throw new Error(`Tauri bundle is not configured to include ${source}`)
	}
	requireSafeDestination(destination)
	return destination
}

function requireSafeDestination(destination: string): void {
	const normalized = destination.replaceAll('\\', '/')
	if (
		normalized.startsWith('/') ||
		/^[a-zA-Z]:\//.test(normalized) ||
		normalized.split('/').includes('..')
	) {
		throw new Error(`Unsafe Tauri resource destination: ${destination}`)
	}
}

async function readRuntimeManifest(path: string): Promise<RuntimeManifest> {
	const value: unknown = JSON.parse(await readFile(path, 'utf8'))
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		throw new Error(`Invalid engine runtime manifest: ${path}`)
	}
	const manifest = value as Partial<RuntimeManifest>
	if (
		typeof manifest.engine !== 'string' ||
		typeof manifest.version !== 'string' ||
		typeof manifest.availability !== 'string' ||
		!Array.isArray(manifest.artifacts)
	) {
		throw new Error(`Invalid engine runtime manifest: ${path}`)
	}
	return manifest as RuntimeManifest
}

function requireBundledTarget(
	manifest: RuntimeManifest,
	engine: BundledEngine,
	target: DesktopRuntimeTarget,
): void {
	if (manifest.engine !== engine || manifest.availability !== 'bundled') {
		throw new Error(
			`${engine} runtime manifest does not advertise a bundled runtime`,
		)
	}
	if (!manifest.artifacts.some((artifact) => artifact.platform === target)) {
		throw new Error(`${engine} has no pinned artifact for ${target}`)
	}
}

async function listBundleFiles(root: string): Promise<readonly BundleFile[]> {
	const files: BundleFile[] = []
	const pending = [root]
	while (pending.length > 0) {
		const directory = pending.pop()
		if (!directory) continue
		for (const entry of await readdir(directory, { withFileTypes: true })) {
			const absolutePath = resolve(directory, entry.name)
			const metadata = await lstat(absolutePath)
			if (metadata.isSymbolicLink()) continue
			if (metadata.isDirectory()) pending.push(absolutePath)
			else if (metadata.isFile()) {
				files.push({
					absolutePath,
					relativePath: relative(root, absolutePath).split(sep).join('/'),
					size: metadata.size,
					mode: metadata.mode,
				})
			}
		}
	}
	return files
}

function requireUniqueFile(
	files: readonly BundleFile[],
	name: string,
	description: string,
): BundleFile {
	const matches = files.filter((file) => basename(file.relativePath) === name)
	if (matches.length !== 1) {
		throw new Error(
			`Installed bundle must contain exactly one ${description} file named ${name}`,
		)
	}
	return matches[0] as BundleFile
}

function requireUniqueDestination(
	files: readonly BundleFile[],
	destination: string,
	description: string,
): BundleFile {
	const normalized = destination.replaceAll('\\', '/')
	const matches = files.filter(
		(file) =>
			file.relativePath === normalized ||
			file.relativePath.endsWith(`/${normalized}`),
	)
	if (matches.length !== 1) {
		throw new Error(
			`Installed bundle must contain exactly one ${description} resource at ${destination}`,
		)
	}
	return matches[0] as BundleFile
}

function requireBinary(
	file: BundleFile,
	platformName: DesktopBundlePlatform,
): void {
	if (file.size === 0)
		throw new Error(`Bundled engine is empty: ${file.relativePath}`)
	if (platformName !== 'windows' && (file.mode & 0o111) === 0) {
		throw new Error(`Bundled engine is not executable: ${file.relativePath}`)
	}
}

function containsVersion(output: string, version: string): boolean {
	const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
	return new RegExp(`(^|[^0-9])${escaped}([^0-9]|$)`).test(output)
}

async function inspectEngineVersion(
	_engine: BundledEngine,
	executablePath: string,
): Promise<string> {
	const result = await execFileAsync(executablePath, ['version'], {
		cwd: resolve(executablePath, '..'),
		env: { ...env, PATH: '' },
		maxBuffer: 1024 * 1024,
		timeout: 10_000,
		windowsHide: true,
	})
	return `${result.stdout}\n${result.stderr}`
}

function bundlePlatform(target: DesktopRuntimeTarget): DesktopBundlePlatform {
	if (target.startsWith('darwin-')) return 'macos'
	if (target.startsWith('linux-')) return 'linux'
	return 'windows'
}

function detectHostTarget(): DesktopRuntimeTarget {
	if (platform === 'darwin' && arch === 'arm64') return 'darwin-arm64'
	if (platform === 'darwin' && arch === 'x64') return 'darwin-x64'
	if (platform === 'linux' && arch === 'arm64') return 'linux-arm64'
	if (platform === 'linux' && arch === 'x64') return 'linux-x64'
	if (platform === 'win32' && arch === 'x64') return 'windows-x64'
	throw new Error(`Unsupported desktop verifier host: ${platform}/${arch}`)
}

function readCliArgs(args: readonly string[]): {
	readonly bundlePath: string
	readonly target: DesktopRuntimeTarget
} {
	const bundleIndex = args.indexOf('--bundle')
	const targetIndex = args.indexOf('--target')
	const bundlePath = bundleIndex >= 0 ? args[bundleIndex + 1] : undefined
	const target = targetIndex >= 0 ? args[targetIndex + 1] : detectHostTarget()
	const supportedTargets: readonly string[] = [
		'darwin-arm64',
		'darwin-x64',
		'linux-arm64',
		'linux-x64',
		'windows-x64',
	]
	if (!bundlePath || !target || !supportedTargets.includes(target)) {
		throw new Error(
			'Usage: verify-installed-bundle.ts --bundle <installed-app-directory> [--target darwin-arm64|darwin-x64|linux-arm64|linux-x64|windows-x64]',
		)
	}
	return { bundlePath, target: target as DesktopRuntimeTarget }
}

async function main(): Promise<void> {
	const result = await verifyInstalledDesktopBundle(
		readCliArgs(process.argv.slice(2)),
	)
	console.info(
		`Verified self-contained ${result.target} bundle: ${result.bundlePath}`,
	)
	console.info('Bundled engines: xray, sing-box')
}

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	main().catch((error: unknown) => {
		console.error(
			error instanceof Error
				? error.message
				: 'Installed bundle verification failed',
		)
		exit(1)
	})
}
