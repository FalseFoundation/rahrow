import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptPath = fileURLToPath(import.meta.url)
const mobileRoot = join(dirname(scriptPath), '..')

export function parseGoVersion(value) {
	return value.match(/\bgo(\d+\.\d+(?:\.\d+)?)\b/)?.[1]
}

export function validatePinnedToolchains(pins) {
	if (pins.schemaVersion !== 2)
		throw new Error('Native runtime pins schemaVersion must be 2')
	if (!/^\d+\.\d+\.\d+$/.test(pins.buildToolchains?.go?.version ?? ''))
		throw new Error('Native runtime pins require an exact Go toolchain version')
	return true
}

export function validateBuildRequest(pins, platform, engineSelector = 'all') {
	validatePinnedToolchains(pins)
	if (platform !== 'android' && platform !== 'apple')
		throw new Error('Native runtime platform must be android or apple')
	const available = Object.keys(pins.engines ?? {})
	const engineIds = engineSelector === 'all' ? available : [engineSelector]
	if (
		engineIds.length === 0 ||
		engineIds.some((engineId) => !available.includes(engineId))
	)
		throw new Error(`Unknown native engine selector: ${engineSelector}`)
	return { platform, engineIds }
}

export function createArtifactLockEntry({
	file,
	sha256,
	engine,
	platform,
	goVersion,
}) {
	return {
		file,
		sha256,
		source: {
			version: engine.version,
			repository: engine.repository,
			revision: engine.revision,
		},
		toolchains: { go: goVersion },
		recipe: [...engine.build[platform]],
	}
}

function run(command, args, cwd, environment = {}) {
	const result = spawnSync(command, args, {
		cwd,
		stdio: 'inherit',
		env: { ...process.env, ...environment },
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

function main(args = process.argv.slice(2)) {
	const pins = JSON.parse(
		readFileSync(join(mobileRoot, 'native-runtime-pins.json'), 'utf8'),
	)
	const { platform, engineIds } = validateBuildRequest(
		pins,
		args[0],
		args[1] ?? 'all',
	)
	const requiredGoVersion = pins.buildToolchains.go.version
	const buildEnvironment = { GOTOOLCHAIN: 'local' }
	const installedGoVersion = parseGoVersion(
		output('go', ['version'], { env: buildEnvironment }),
	)
	if (installedGoVersion !== requiredGoVersion)
		throw new Error(
			`Native runtimes require Go ${requiredGoVersion}; found ${installedGoVersion ?? 'an unknown version'}. GOTOOLCHAIN=local prevents implicit executable downloads.`,
		)
	output('git', ['--version'])
	if (engineIds.includes('xray')) output('python3', ['--version'])

	const temporaryRoot = mkdtempSync(join(tmpdir(), 'rahrow-native-runtimes-'))
	const built = {}
	try {
		for (const engineId of engineIds) {
			const engine = pins.engines[engineId]
			const source = join(temporaryRoot, engineId)
			run('git', ['init', source], undefined, { GIT_TERMINAL_PROMPT: '0' })
			run(
				'git',
				['-C', source, 'remote', 'add', 'origin', engine.repository],
				undefined,
				{ GIT_TERMINAL_PROMPT: '0' },
			)
			run(
				'git',
				['-C', source, 'fetch', '--depth=1', 'origin', engine.revision],
				undefined,
				{ GIT_TERMINAL_PROMPT: '0' },
			)
			run('git', ['-C', source, 'checkout', '--detach', 'FETCH_HEAD'])
			if (output('git', ['-C', source, 'rev-parse', 'HEAD']) !== engine.revision)
				throw new Error(`${engineId} source revision mismatch`)
			const recipe = engine.build[platform]
			run(recipe[0], recipe.slice(1), source, buildEnvironment)

			const artifactName = engine[`${platform}Artifact`]
			const upstreamName =
				platform === 'android' ? artifactName : artifactName.replace(/\.zip$/, '')
			const upstreamPath = join(source, upstreamName)
			if (!existsSync(upstreamPath))
				throw new Error(`${engineId} did not produce ${upstreamName}`)
			const destination = join(mobileRoot, 'native-runtimes', engineId)
			const artifactPath = join(destination, artifactName)
			mkdirSync(destination, { recursive: true })
			if (platform === 'android') cpSync(upstreamPath, artifactPath)
			else run('ditto', ['-c', '-k', '--keepParent', upstreamPath, artifactPath])
			built[engineId] = {
				[platform]: createArtifactLockEntry({
					file: ['native-runtimes', engineId, artifactName].join('/'),
					sha256: sha256(artifactPath),
					engine,
					platform,
					goVersion: requiredGoVersion,
				}),
			}
		}

		const lockPath = join(mobileRoot, 'native-runtime-lock.json')
		const lock = existsSync(lockPath)
			? JSON.parse(readFileSync(lockPath, 'utf8'))
			: { schemaVersion: 2, artifacts: {} }
		lock.schemaVersion = 2
		for (const [engineId, artifact] of Object.entries(built))
			lock.artifacts[engineId] = {
				...lock.artifacts[engineId],
				...artifact,
			}
		writeFileSync(lockPath, `${JSON.stringify(lock, null, '\t')}\n`)
	} finally {
		rmSync(temporaryRoot, { recursive: true, force: true })
	}
}

if (process.argv[1] && resolve(process.argv[1]) === scriptPath) main()
