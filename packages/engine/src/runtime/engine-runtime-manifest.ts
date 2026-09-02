import { EngineError } from '@rahrow/core/errors.ts'
import type { EngineId } from '@rahrow/core/runtime/proxy-engine.ts'

export type BundledEngineId = Extract<EngineId, 'xray' | 'sing-box'>
export type EngineRuntimeAvailability = 'host-provided' | 'bundled'
export type EngineRuntimeChecksumAlgorithm = 'sha256'
export type EngineRuntimePlatform =
	| 'darwin-arm64'
	| 'darwin-x64'
	| 'linux-arm64'
	| 'linux-x64'
	| 'windows-x64'

export interface EngineRuntimeChecksum {
	readonly algorithm: EngineRuntimeChecksumAlgorithm
	readonly value: string
}

export interface EngineRuntimeArtifact {
	readonly platform: EngineRuntimePlatform
	readonly archiveName: string
	readonly executablePath: string
	readonly checksum: EngineRuntimeChecksum
	readonly url?: string
}

export interface EngineRuntimeManifest {
	readonly schemaVersion: 1
	readonly engine: BundledEngineId
	readonly version: string
	readonly availability: EngineRuntimeAvailability
	readonly binaryName: BundledEngineId
	readonly environmentVariable: string
	readonly artifacts: readonly EngineRuntimeArtifact[]
}

const platforms = new Set<EngineRuntimePlatform>([
	'darwin-arm64',
	'darwin-x64',
	'linux-arm64',
	'linux-x64',
	'windows-x64',
])
const engineEnvironmentVariables = {
	xray: 'RAHROW_XRAY_BINARY',
	'sing-box': 'RAHROW_SING_BOX_BINARY',
} as const satisfies Record<BundledEngineId, string>
const checksumPattern = /^[a-f0-9]{64}$/

export function parseEngineRuntimeManifest(
	input: unknown,
): EngineRuntimeManifest {
	const manifest = record(input, 'Engine runtime manifest must be an object')
	const schemaVersion = manifest.schemaVersion
	const engine = manifest.engine
	const version = manifest.version
	const availability = manifest.availability
	const binaryName = manifest.binaryName
	const environmentVariable = manifest.environmentVariable
	const artifacts = manifest.artifacts

	if (schemaVersion !== 1) {
		throw new EngineError(
			'invalid_config',
			'Engine runtime manifest schemaVersion must be 1',
		)
	}

	if (engine !== 'xray' && engine !== 'sing-box') {
		throw new EngineError('invalid_config', 'Engine runtime id is unsupported')
	}

	if (binaryName !== engine) {
		throw new EngineError(
			'invalid_config',
			`Runtime binaryName must match engine ${engine}`,
		)
	}

	if (environmentVariable !== engineEnvironmentVariables[engine]) {
		throw new EngineError(
			'invalid_config',
			`Runtime environmentVariable for ${engine} must be ${engineEnvironmentVariables[engine]}`,
		)
	}

	if (typeof version !== 'string' || version.trim().length === 0) {
		throw new EngineError('invalid_config', 'Engine runtime version is required')
	}

	if (availability !== 'host-provided' && availability !== 'bundled') {
		throw new EngineError(
			'invalid_config',
			'Engine runtime availability must be host-provided or bundled',
		)
	}

	if (!Array.isArray(artifacts)) {
		throw new EngineError(
			'invalid_config',
			'Engine runtime artifacts must be an array',
		)
	}

	const parsedArtifacts = artifacts.map(parseArtifact)
	if (availability === 'bundled' && parsedArtifacts.length === 0) {
		throw new EngineError(
			'invalid_config',
			`Bundled ${engine} runtime manifests must declare artifacts`,
		)
	}

	return {
		schemaVersion,
		engine,
		version,
		availability,
		binaryName: engine,
		environmentVariable: engineEnvironmentVariables[engine],
		artifacts: parsedArtifacts,
	}
}

export function verifyEngineRuntimeChecksum(
	expected: EngineRuntimeChecksum,
	actual: EngineRuntimeChecksum,
): boolean {
	const left = normalizeChecksum(expected)
	const right = normalizeChecksum(actual)
	return left.algorithm === right.algorithm && left.value === right.value
}

function parseArtifact(input: unknown): EngineRuntimeArtifact {
	const artifact = record(input, 'Engine runtime artifact must be an object')
	const platform = artifact.platform
	const archiveName = artifact.archiveName
	const executablePath = artifact.executablePath
	const url = artifact.url

	if (
		typeof platform !== 'string' ||
		!platforms.has(platform as EngineRuntimePlatform)
	) {
		throw new EngineError(
			'invalid_config',
			'Engine runtime artifact platform is unsupported',
		)
	}

	if (typeof archiveName !== 'string' || archiveName.trim().length === 0) {
		throw new EngineError(
			'invalid_config',
			'Engine runtime artifact archiveName is required',
		)
	}

	if (typeof executablePath !== 'string' || executablePath.trim().length === 0) {
		throw new EngineError(
			'invalid_config',
			'Engine runtime artifact executablePath is required',
		)
	}

	if (url !== undefined && typeof url !== 'string') {
		throw new EngineError(
			'invalid_config',
			'Engine runtime artifact url must be a string',
		)
	}

	return {
		platform: platform as EngineRuntimePlatform,
		archiveName,
		executablePath,
		checksum: parseChecksum(artifact.checksum),
		...(url === undefined ? {} : { url }),
	}
}

function parseChecksum(input: unknown): EngineRuntimeChecksum {
	const checksum = record(
		input,
		'Engine runtime artifact checksum must be an object',
	)
	return normalizeChecksum(checksum)
}

function normalizeChecksum(input: {
	readonly algorithm?: unknown
	readonly value?: unknown
}): EngineRuntimeChecksum {
	if (input.algorithm !== 'sha256') {
		throw new EngineError(
			'invalid_config',
			'Engine runtime checksum algorithm must be sha256',
		)
	}

	if (
		typeof input.value !== 'string' ||
		!checksumPattern.test(input.value.toLowerCase())
	) {
		throw new EngineError(
			'invalid_config',
			'Engine runtime checksum must be a 64-character hexadecimal sha256 digest',
		)
	}

	return { algorithm: 'sha256', value: input.value.toLowerCase() }
}

function record(
	input: unknown,
	message: string,
): Readonly<Record<string, unknown>> {
	if (typeof input !== 'object' || input === null || Array.isArray(input)) {
		throw new EngineError('invalid_config', message)
	}

	return input as Readonly<Record<string, unknown>>
}
