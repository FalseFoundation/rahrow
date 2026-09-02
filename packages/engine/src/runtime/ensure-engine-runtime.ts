import { join } from 'node:path'

import { EngineError } from '@rahrow/core/errors.ts'

import {
	type EngineRuntimeChecksum,
	type EngineRuntimeManifest,
	type EngineRuntimePlatform,
	verifyEngineRuntimeChecksum,
} from './engine-runtime-manifest.ts'
import type { EngineRuntimeFileAccess } from './engine-runtime-resolver.ts'

export interface EngineRuntimeWritableFileAccess
	extends EngineRuntimeFileAccess {
	writeFile(path: string, bytes: Uint8Array): void | Promise<void>
}

export interface EnsureEngineRuntimeArtifactInput {
	readonly manifest: EngineRuntimeManifest
	readonly platform: EngineRuntimePlatform
	readonly runtimeDir: string
	readonly files: EngineRuntimeWritableFileAccess
	readonly hashSha256: (bytes: Uint8Array) => string | Promise<string>
	readonly download: (url: string) => Promise<Uint8Array>
	readonly extract: (
		archivePath: string,
		destinationDir: string,
	) => Promise<void>
	readonly makeExecutable?: (path: string) => Promise<void>
}

export interface EnsuredEngineRuntimeArtifact {
	readonly binaryPath: string
	readonly archivePath: string
	readonly downloaded: boolean
	readonly extracted: boolean
}

export async function ensureEngineRuntimeArtifact(
	input: EnsureEngineRuntimeArtifactInput,
): Promise<EnsuredEngineRuntimeArtifact> {
	const artifact = input.manifest.artifacts.find(
		(candidate) => candidate.platform === input.platform,
	)
	if (!artifact) {
		throw new EngineError(
			'invalid_config',
			`${input.manifest.engine} has no runtime artifact for ${input.platform}.`,
		)
	}

	const archivePath = join(input.runtimeDir, artifact.archiveName)
	const destinationDir = join(input.runtimeDir, artifact.platform)
	const binaryPath = join(destinationDir, artifact.executablePath)
	let downloaded = false
	let archiveValid = false

	if (await input.files.exists(archivePath)) {
		archiveValid = await archiveChecksumMatches(
			input,
			await input.files.readFile(archivePath),
			artifact.checksum,
		)
	}

	if (!archiveValid) {
		const url = artifact.url?.trim()
		if (!url) {
			throw missingBinaryError(input, binaryPath)
		}
		const archive = await input.download(url)
		if (!(await archiveChecksumMatches(input, archive, artifact.checksum))) {
			throw new EngineError(
				'invalid_config',
				`${input.manifest.engine} runtime checksum mismatch for ${input.platform}. Expected ${artifact.checksum.value}.`,
			)
		}
		await input.files.writeFile(archivePath, archive)
		downloaded = true
	}

	await verifyArchiveChecksum(input, archivePath, artifact.checksum)

	let extracted = false
	if (downloaded || !(await input.files.exists(binaryPath))) {
		await input.extract(archivePath, destinationDir)
		extracted = true
	}

	if (!(await input.files.exists(binaryPath))) {
		throw missingBinaryError(input, binaryPath)
	}
	await input.makeExecutable?.(binaryPath)

	return { binaryPath, archivePath, downloaded, extracted }
}

async function archiveChecksumMatches(
	input: EnsureEngineRuntimeArtifactInput,
	archive: Uint8Array,
	expected: EngineRuntimeChecksum,
): Promise<boolean> {
	return verifyEngineRuntimeChecksum(expected, {
		algorithm: 'sha256',
		value: await input.hashSha256(archive),
	})
}

function missingBinaryError(
	input: EnsureEngineRuntimeArtifactInput,
	binaryPath: string,
) {
	return new EngineError(
		'invalid_config',
		`${input.manifest.engine} ${input.manifest.version} binary for ${input.platform} was not found at ${binaryPath}.`,
	)
}

async function verifyArchiveChecksum(
	input: EnsureEngineRuntimeArtifactInput,
	archivePath: string,
	expected: EngineRuntimeChecksum,
): Promise<void> {
	const actual: EngineRuntimeChecksum = {
		algorithm: 'sha256',
		value: await input.hashSha256(await input.files.readFile(archivePath)),
	}
	if (!verifyEngineRuntimeChecksum(expected, actual)) {
		throw new EngineError(
			'invalid_config',
			`${input.manifest.engine} runtime checksum mismatch for ${input.platform}. Expected ${expected.value}, received ${actual.value}.`,
		)
	}
}
