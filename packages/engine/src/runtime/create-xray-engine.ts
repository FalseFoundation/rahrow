import { createHash } from 'node:crypto'
import { access, readFile } from 'node:fs/promises'
import { arch, platform as osPlatform, env as processEnv } from 'node:process'

import type { Clock } from '@rahrow/core/connection/connection-controller.ts'
import type { Logger } from '@rahrow/core/logging/logger.ts'
import {
	SystemClock,
	type XrayConfig,
	XrayConfigBuilder,
	XrayEngine,
	type XrayLatencyProbe,
	type XrayProcess,
} from '../xray/xray-engine.ts'
import type { EngineRuntimePlatform } from './engine-runtime-manifest.ts'
import {
	defaultEngineRuntimeDir,
	detectEngineRuntimePlatform,
	type EngineRuntimeFileAccess,
	loadEngineRuntimeManifest,
	resolveEngineRuntimeBinary,
} from './engine-runtime-resolver.ts'
import {
	BasicXrayConfigValidator,
	type EngineProcessSpawner,
	ManagedEngineProcess,
	type XrayConfigValidator,
} from './managed-engine-process.ts'
import { createNodeEngineProcessSpawner } from './node-engine-process-spawner.ts'
import { TcpLatencyProbe } from './tcp-latency-probe.ts'

export interface CreateXrayEngineOptions {
	readonly process?: XrayProcess
	readonly spawner?: EngineProcessSpawner<XrayConfig>
	readonly binaryPath?: string
	readonly resolveBinaryPath?: () => Promise<string>
	readonly env?: Readonly<Record<string, string | undefined>>
	readonly platform?: EngineRuntimePlatform
	readonly runtimeDir?: string
	readonly files?: EngineRuntimeFileAccess
	readonly hashSha256?: (bytes: Uint8Array) => string | Promise<string>
	readonly latencyProbe?: XrayLatencyProbe
	readonly clock?: Clock
	readonly logger?: Logger
	readonly configValidator?: XrayConfigValidator
	readonly stopTimeoutMs?: number
}

export function createXrayEngine(
	options: CreateXrayEngineOptions = {},
): XrayEngine {
	if (options.process) {
		return new XrayEngine(
			options.process,
			new XrayConfigBuilder(),
			options.latencyProbe ?? new TcpLatencyProbe(),
			options.clock ?? new SystemClock(),
			options.logger,
		)
	}

	const process = new ManagedEngineProcess({
		engineName: 'Xray',
		binaryPath: options.binaryPath,
		resolveBinaryPath:
			options.resolveBinaryPath ??
			(options.binaryPath ? undefined : () => resolveDefaultBinaryPath(options)),
		spawner: options.spawner ?? createNodeEngineProcessSpawner<XrayConfig>(),
		configValidator: options.configValidator ?? new BasicXrayConfigValidator(),
		stopTimeoutMs: options.stopTimeoutMs,
	})

	return new XrayEngine(
		process,
		new XrayConfigBuilder(),
		options.latencyProbe ?? new TcpLatencyProbe(),
		options.clock ?? new SystemClock(),
		options.logger,
	)
}

export function createNodeEngineRuntimeFiles(): EngineRuntimeFileAccess {
	return {
		async exists(path) {
			try {
				await access(path)

				return true
			} catch {
				return false
			}
		},
		readFile: (path) => readFile(path),
	}
}

async function resolveDefaultBinaryPath(
	options: CreateXrayEngineOptions,
): Promise<string> {
	const runtimeDir = options.runtimeDir ?? defaultEngineRuntimeDir('xray')
	const files = options.files ?? createNodeEngineRuntimeFiles()
	const manifest = await loadEngineRuntimeManifest(runtimeDir, files)
	const resolved = await resolveEngineRuntimeBinary({
		manifest,
		env: options.env ?? processEnv,
		platform: options.platform ?? detectEngineRuntimePlatform(osPlatform, arch),
		runtimeDir,
		files,
		hashSha256: options.hashSha256 ?? sha256Hex,
	})

	return resolved.binaryPath
}

function sha256Hex(bytes: Uint8Array): string {
	return createHash('sha256').update(bytes).digest('hex')
}
