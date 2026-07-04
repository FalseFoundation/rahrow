import { RuntimeError } from './errors.ts'
import { isProtocol } from './protocols.ts'
import type { NormalizedRuntimeConfig, RuntimeConfig, RuntimeName } from './runtime.ts'

const RUNTIME_NAMES = new Set<RuntimeName>([
	'xray',
	'sing-box',
	'wireguard',
	'socks',
	'hysteria',
	'http',
	'mock',
])

export function isRuntimeName(value: unknown): value is RuntimeName {
	return typeof value === 'string' && RUNTIME_NAMES.has(value as RuntimeName)
}

export function normalizeRuntimeConfig(config: RuntimeConfig): NormalizedRuntimeConfig {
	if (!isRuntimeName(config.runtime)) {
		throw new RuntimeError('invalid_config', `Unsupported runtime: ${String(config.runtime)}`)
	}

	if (!Array.isArray(config.endpoints) || config.endpoints.length === 0) {
		throw new RuntimeError('invalid_config', 'Runtime config requires at least one endpoint')
	}

	for (const endpoint of config.endpoints) {
		if (typeof endpoint.host !== 'string' || endpoint.host.length === 0) {
			throw new RuntimeError('invalid_config', 'Runtime endpoint requires a host')
		}

		if (!Number.isInteger(endpoint.port) || endpoint.port < 1 || endpoint.port > 65535) {
			throw new RuntimeError('invalid_config', `Invalid runtime endpoint port: ${endpoint.port}`)
		}

		if (!isProtocol(endpoint.protocol)) {
			throw new RuntimeError('invalid_config', `Unsupported protocol: ${String(endpoint.protocol)}`)
		}
	}

	return {
		...config,
		options: config.options ?? {},
	}
}
