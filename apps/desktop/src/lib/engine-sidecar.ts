import { EngineError } from '@rahrow/core/errors.ts'
import type {
	BundledEngineId,
	EngineRuntimeManifest,
	EngineRuntimePlatform,
} from '@rahrow/engine/runtime/engine-runtime-manifest.ts'
import {
	type EngineRuntimeFileAccess,
	resolveEngineRuntimeBinary,
} from '@rahrow/engine/runtime/engine-runtime-resolver.ts'

export interface DesktopEngineSidecarBundlePlan {
	readonly engine: BundledEngineId
	readonly sourcePath: string
	readonly sidecarPath: string
	readonly sidecarFileName: string
	readonly version: string
	readonly platform: EngineRuntimePlatform
}

export interface PlanDesktopEngineSidecarBundleInput {
	readonly manifest: EngineRuntimeManifest
	readonly platform: EngineRuntimePlatform
	readonly runtimeDir: string
	readonly binariesDir: string
	readonly files: EngineRuntimeFileAccess
	readonly hashSha256: (bytes: Uint8Array) => string | Promise<string>
}

const targetTriples = {
	'darwin-arm64': 'aarch64-apple-darwin',
	'darwin-x64': 'x86_64-apple-darwin',
	'linux-arm64': 'aarch64-unknown-linux-gnu',
	'linux-x64': 'x86_64-unknown-linux-gnu',
	'windows-x64': 'x86_64-pc-windows-msvc',
} as const satisfies Record<EngineRuntimePlatform, string>

const platformsByTargetTriple = Object.fromEntries(
	Object.entries(targetTriples).map(([platform, triple]) => [triple, platform]),
) as Readonly<Record<string, EngineRuntimePlatform>>

export function desktopEngineSidecarTargetTriple(
	platform: EngineRuntimePlatform,
): string {
	return targetTriples[platform]
}

export function desktopEngineSidecarFileName(
	engine: BundledEngineId,
	platform: EngineRuntimePlatform,
): string {
	const name = `${engine}-${desktopEngineSidecarTargetTriple(platform)}`
	return platform === 'windows-x64' ? `${name}.exe` : name
}

export function engineRuntimePlatformFromTargetTriple(
	targetTriple: string,
): EngineRuntimePlatform {
	const platform = platformsByTargetTriple[targetTriple]
	if (!platform) {
		throw new EngineError(
			'invalid_config',
			`Unsupported desktop engine target triple: ${targetTriple}`,
		)
	}
	return platform
}

export async function planDesktopEngineSidecarBundle(
	input: PlanDesktopEngineSidecarBundleInput,
): Promise<DesktopEngineSidecarBundlePlan> {
	const resolved = await resolveEngineRuntimeBinary({
		manifest: input.manifest,
		env: {},
		platform: input.platform,
		runtimeDir: input.runtimeDir,
		files: input.files,
		hashSha256: input.hashSha256,
	})
	const sidecarFileName = desktopEngineSidecarFileName(
		input.manifest.engine,
		input.platform,
	)

	return {
		engine: input.manifest.engine,
		sourcePath: resolved.binaryPath,
		sidecarPath: joinPath(input.binariesDir, sidecarFileName),
		sidecarFileName,
		version: resolved.version,
		platform: input.platform,
	}
}

function joinPath(root: string, segment: string): string {
	return root.endsWith('/') || root.endsWith('\\')
		? `${root}${segment}`
		: `${root}/${segment}`
}
