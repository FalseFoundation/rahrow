import { isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { EngineError } from '@rahrow/core/errors.ts'

import {
	type BundledEngineId,
	type EngineRuntimeChecksum,
	type EngineRuntimeManifest,
	type EngineRuntimePlatform,
	parseEngineRuntimeManifest,
	verifyEngineRuntimeChecksum,
} from './engine-runtime-manifest.ts'

export const XRAY_BINARY_ENV = 'RAHROW_XRAY_BINARY'
export const SING_BOX_BINARY_ENV = 'RAHROW_SING_BOX_BINARY'

export interface EngineRuntimeFileAccess {
	exists(path: string): boolean | Promise<boolean>
	readFile(path: string): Uint8Array | Promise<Uint8Array>
}

export interface ResolvedEngineBinary {
	readonly binaryPath: string
	readonly source: 'env' | 'bundled-artifact'
	readonly version: string
	readonly platform: EngineRuntimePlatform
}

export interface ResolveEngineRuntimeBinaryInput {
	readonly manifest: EngineRuntimeManifest
	readonly env?: Readonly<Record<string, string | undefined>>
	readonly platform: EngineRuntimePlatform
	readonly runtimeDir: string
	readonly files: EngineRuntimeFileAccess
	readonly hashSha256: (bytes: Uint8Array) => string | Promise<string>
}

export function defaultEngineRuntimeDir(engine: BundledEngineId): string {
	return fileURLToPath(new URL(`../../../../engines/${engine}`, import.meta.url))
}

export function detectEngineRuntimePlatform(
	osPlatform: string,
	arch: string,
): EngineRuntimePlatform {
	if (osPlatform === 'darwin' && arch === 'arm64') return 'darwin-arm64'
	if (osPlatform === 'darwin' && (arch === 'x64' || arch === 'x86_64')) {
		return 'darwin-x64'
	}
	if (osPlatform === 'linux' && arch === 'arm64') return 'linux-arm64'
	if (osPlatform === 'linux' && (arch === 'x64' || arch === 'x86_64')) {
		return 'linux-x64'
	}
	if (osPlatform === 'win32' && (arch === 'x64' || arch === 'x86_64')) {
		return 'windows-x64'
	}

	throw new EngineError(
		'invalid_config',
		`Unsupported engine runtime platform: ${osPlatform}/${arch}`,
	)
}

export async function loadEngineRuntimeManifest(
	runtimeDir: string,
	files: EngineRuntimeFileAccess,
): Promise<EngineRuntimeManifest> {
	const manifestPath = join(runtimeDir, 'runtime.json')
	if (!(await files.exists(manifestPath))) {
		throw new EngineError(
			'invalid_config',
			`Engine runtime manifest was not found at ${manifestPath}`,
		)
	}

	try {
		return parseEngineRuntimeManifest(
			JSON.parse(new TextDecoder().decode(await files.readFile(manifestPath))),
		)
	} catch (error) {
		if (error instanceof EngineError) throw error
		throw new EngineError(
			'invalid_config',
			'Engine runtime manifest is not valid JSON',
			{ cause: error },
		)
	}
}

export async function resolveEngineRuntimeBinary(
	input: ResolveEngineRuntimeBinaryInput,
): Promise<ResolvedEngineBinary> {
	const envName = input.manifest.environmentVariable
	const envValue = input.env?.[envName]?.trim()
	if (envValue) {
		if (
			!isAbsolute(envValue) &&
			!envValue.includes('/') &&
			!envValue.includes('\\')
		) {
			throw new EngineError(
				'invalid_config',
				`${envName} must be an explicit filesystem path, not a PATH lookup.`,
			)
		}
		if (!(await input.files.exists(envValue))) {
			throw new EngineError(
				'invalid_config',
				`${envName} does not point to an executable file: ${envValue}`,
			)
		}
		return {
			binaryPath: envValue,
			source: 'env',
			version: input.manifest.version,
			platform: input.platform,
		}
	}

	if (input.manifest.availability === 'host-provided') {
		throw new EngineError(
			'invalid_config',
			`${input.manifest.engine} runtime is host-provided. Set ${envName} to an explicit path.`,
		)
	}

	const artifact = input.manifest.artifacts.find(
		(candidate) => candidate.platform === input.platform,
	)
	if (!artifact) {
		throw new EngineError(
			'invalid_config',
			`${input.manifest.engine} has no artifact for ${input.platform}.`,
		)
	}

	const archivePath = join(input.runtimeDir, artifact.archiveName)
	const binaryPath = join(
		input.runtimeDir,
		artifact.platform,
		artifact.executablePath,
	)
	const archiveExists = await input.files.exists(archivePath)
	const verifiedPath = archiveExists ? archivePath : binaryPath
	if (!(await input.files.exists(verifiedPath))) {
		throw new EngineError(
			'invalid_config',
			`${input.manifest.engine} ${input.manifest.version} binary for ${input.platform} was not found at ${binaryPath}.`,
		)
	}

	const actual: EngineRuntimeChecksum = {
		algorithm: 'sha256',
		value: await input.hashSha256(await input.files.readFile(verifiedPath)),
	}
	if (!verifyEngineRuntimeChecksum(artifact.checksum, actual)) {
		throw new EngineError(
			'invalid_config',
			`${input.manifest.engine} runtime checksum mismatch for ${input.platform}.`,
		)
	}

	if (!(await input.files.exists(binaryPath))) {
		throw new EngineError(
			'invalid_config',
			`${input.manifest.engine} ${input.manifest.version} binary for ${input.platform} was not extracted.`,
		)
	}

	return {
		binaryPath,
		source: 'bundled-artifact',
		version: input.manifest.version,
		platform: input.platform,
	}
}
