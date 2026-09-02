import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), '..')
const pins = JSON.parse(
	readFileSync(join(mobileRoot, 'native-runtime-pins.json'), 'utf8'),
)
const lockPath = join(mobileRoot, 'native-runtime-lock.json')
const revisionPattern = /^[a-f0-9]{40}$/
const checksumPattern = /^[a-f0-9]{64}$/

if (pins.schemaVersion !== 2)
	throw new Error('Native runtime pins schemaVersion must be 2')
if (!/^\d+\.\d+\.\d+$/.test(pins.buildToolchains?.go?.version ?? ''))
	throw new Error('Native runtime pins require an exact Go toolchain version')
for (const engineId of ['xray', 'sing-box']) {
	const engine = pins.engines[engineId]
	if (!engine || !revisionPattern.test(engine.revision)) {
		throw new Error(`${engineId} must pin an exact 40-character Git revision`)
	}
}
for (const [providerId, provider] of Object.entries(
	pins.tunnelProviders ?? {},
)) {
	if (!revisionPattern.test(provider.revision))
		throw new Error(`${providerId} must pin an exact 40-character Git revision`)
	if (!provider.license || !provider.sourceArchiveSha256?.match(checksumPattern))
		throw new Error(
			`${providerId} must pin its license and source archive checksum`,
		)
	for (const [submodule, revision] of Object.entries(
		provider.submodules ?? {},
	)) {
		if (!revisionPattern.test(revision))
			throw new Error(
				`${providerId} submodule ${submodule} must pin an exact Git revision`,
			)
	}
}

if (process.argv.includes('--pins-only')) {
	console.log('Native runtime source pins are valid.')
	process.exit(0)
}

if (!existsSync(lockPath)) {
	throw new Error(
		'native-runtime-lock.json is missing; build and checksum every native artifact before release',
	)
}
const lock = JSON.parse(readFileSync(lockPath, 'utf8'))
if (lock.schemaVersion !== 2)
	throw new Error('Native runtime lock schemaVersion must be 2')
for (const [engineId, engine] of Object.entries(pins.engines)) {
	for (const platform of ['android', 'apple']) {
		const artifactName = engine[`${platform}Artifact`]
		const expected = lock.artifacts?.[engineId]?.[platform]
		if (!expected || !checksumPattern.test(expected.sha256)) {
			throw new Error(
				`${engineId} ${platform} artifact checksum is missing or invalid`,
			)
		}
		const canonicalFile = ['native-runtimes', engineId, artifactName].join('/')
		if (expected.file !== canonicalFile)
			throw new Error(`${engineId} ${platform} artifact path is not canonical`)
		if (
			expected.source?.version !== engine.version ||
			expected.source?.repository !== engine.repository ||
			expected.source?.revision !== engine.revision
		)
			throw new Error(`${engineId} ${platform} source provenance mismatch`)
		if (expected.toolchains?.go !== pins.buildToolchains.go.version)
			throw new Error(`${engineId} ${platform} Go toolchain provenance mismatch`)
		if (
			JSON.stringify(expected.recipe) !== JSON.stringify(engine.build[platform])
		)
			throw new Error(`${engineId} ${platform} build recipe provenance mismatch`)
		const artifactPath = join(mobileRoot, expected.file)
		if (!existsSync(artifactPath))
			throw new Error(`Native artifact is missing: ${artifactPath}`)
		const actual = createHash('sha256')
			.update(readFileSync(artifactPath))
			.digest('hex')
		if (actual !== expected.sha256)
			throw new Error(`${engineId} ${platform} artifact checksum mismatch`)
	}
}
for (const [providerId, provider] of Object.entries(
	pins.tunnelProviders ?? {},
)) {
	for (const platform of provider.requiredArtifacts ?? []) {
		const artifactName = provider[`${platform}Artifact`]
		const expected = lock.tunnelProviders?.[providerId]?.[platform]
		if (!expected || !checksumPattern.test(expected.sha256))
			throw new Error(
				`${providerId} ${platform} artifact checksum is missing or invalid`,
			)
		const canonicalFile = ['native-runtimes', providerId, artifactName].join('/')
		if (expected.file !== canonicalFile)
			throw new Error(`${providerId} ${platform} artifact path is not canonical`)
		if (
			expected.source?.version !== provider.version ||
			expected.source?.repository !== provider.repository ||
			expected.source?.revision !== provider.revision ||
			expected.source?.license !== provider.license ||
			expected.source?.sourceArchiveSha256 !== provider.sourceArchiveSha256 ||
			JSON.stringify(expected.source?.submodules) !==
				JSON.stringify(provider.submodules)
		)
			throw new Error(`${providerId} ${platform} source provenance mismatch`)
		const artifactPath = join(mobileRoot, expected.file)
		if (!existsSync(artifactPath))
			throw new Error(`Native artifact is missing: ${artifactPath}`)
		const actual = createHash('sha256')
			.update(readFileSync(artifactPath))
			.digest('hex')
		if (actual !== expected.sha256)
			throw new Error(`${providerId} ${platform} artifact checksum mismatch`)
	}
}
console.log('Pinned native runtime artifacts and checksums are valid.')
