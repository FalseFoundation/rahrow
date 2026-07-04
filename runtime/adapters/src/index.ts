import { type ChildProcessWithoutNullStreams, spawn } from 'node:child_process'
import type {
	NormalizedRuntimeConfig,
	Protocol,
	RuntimeAdapter,
	RuntimeHealth,
	RuntimeManifest,
	RuntimeName,
} from '@rahrow/core'
import { RuntimeError } from '@rahrow/core'

interface ProcessAdapterOptions {
	readonly binary?: string
	readonly args?: readonly string[]
}

class ProcessRuntimeAdapter implements RuntimeAdapter {
	readonly manifest: RuntimeManifest
	#process?: ChildProcessWithoutNullStreams
	#options: ProcessAdapterOptions

	constructor(
		name: RuntimeName,
		supportedProtocols: readonly Protocol[],
		capabilities: RuntimeManifest['capabilities'],
		options: ProcessAdapterOptions = {},
	) {
		this.manifest = {
			name,
			supportedProtocols,
			capabilities,
		}
		this.#options = options
	}

	async start(config: NormalizedRuntimeConfig): Promise<void> {
		if (this.#process) {
			throw new RuntimeError('runtime_already_running', `${this.manifest.name} is already running`)
		}

		await this.transformConfig(config)

		if (!this.#options.binary) {
			return
		}

		this.#process = spawn(this.#options.binary, [...(this.#options.args ?? [])])
		this.#process.once('exit', () => {
			this.#process = undefined
		})
	}

	async stop(): Promise<void> {
		if (!this.#process) {
			return
		}

		const child = this.#process
		this.#process = undefined
		child.kill()
	}

	async health(): Promise<RuntimeHealth> {
		return {
			status: this.#process || !this.#options.binary ? 'healthy' : 'stopped',
			checkedAt: new Date().toISOString(),
		}
	}

	async transformConfig(config: NormalizedRuntimeConfig): Promise<unknown> {
		const unsupportedProtocol = config.endpoints.find(
			(endpoint) => !this.manifest.supportedProtocols.includes(endpoint.protocol),
		)

		if (unsupportedProtocol) {
			throw new RuntimeError(
				'invalid_config',
				`${this.manifest.name} does not support ${unsupportedProtocol.protocol}`,
			)
		}

		return {
			runtime: this.manifest.name,
			endpoints: config.endpoints,
			options: config.options,
		}
	}
}

class MockRuntimeAdapter implements RuntimeAdapter {
	readonly manifest: RuntimeManifest = {
		name: 'mock',
		capabilities: {
			diagnostics: true,
			proxy: true,
			tcp: true,
			udp: true,
		},
		supportedProtocols: ['http', 'socks', 'wireguard', 'hysteria', 'vmess', 'vless'],
	}

	#running = false

	async start(config: NormalizedRuntimeConfig): Promise<void> {
		await this.transformConfig(config)
		this.#running = true
	}

	async stop(): Promise<void> {
		this.#running = false
	}

	async health(): Promise<RuntimeHealth> {
		return {
			status: this.#running ? 'healthy' : 'stopped',
			checkedAt: new Date().toISOString(),
		}
	}

	async transformConfig(config: NormalizedRuntimeConfig): Promise<unknown> {
		return {
			runtime: this.manifest.name,
			endpoints: config.endpoints,
			options: config.options,
		}
	}
}

export function createXrayAdapter(): RuntimeAdapter {
	return new ProcessRuntimeAdapter('xray', ['vmess', 'vless', 'trojan', 'shadowsocks'], {
		diagnostics: true,
		proxy: true,
		tcp: true,
		udp: true,
	})
}

export function createSingBoxAdapter(): RuntimeAdapter {
	return new ProcessRuntimeAdapter(
		'sing-box',
		['vmess', 'vless', 'trojan', 'shadowsocks', 'wireguard', 'socks', 'hysteria', 'http'],
		{ diagnostics: true, proxy: true, tcp: true, tunnel: true, udp: true },
	)
}

export function createWireguardAdapter(): RuntimeAdapter {
	return new ProcessRuntimeAdapter('wireguard', ['wireguard'], {
		tunnel: true,
		udp: true,
	})
}

export function createSocksAdapter(): RuntimeAdapter {
	return new ProcessRuntimeAdapter('socks', ['socks'], {
		proxy: true,
		tcp: true,
		udp: true,
	})
}

export function createHysteriaAdapter(): RuntimeAdapter {
	return new ProcessRuntimeAdapter('hysteria', ['hysteria'], {
		proxy: true,
		udp: true,
	})
}

export function createHttpAdapter(): RuntimeAdapter {
	return new ProcessRuntimeAdapter('http', ['http'], {
		http: true,
		proxy: true,
		tcp: true,
	})
}

export function createMockAdapter(): RuntimeAdapter {
	return new MockRuntimeAdapter()
}

export function createDefaultAdapters(): readonly RuntimeAdapter[] {
	return [
		createXrayAdapter(),
		createSingBoxAdapter(),
		createWireguardAdapter(),
		createSocksAdapter(),
		createHysteriaAdapter(),
		createHttpAdapter(),
		createMockAdapter(),
	]
}
