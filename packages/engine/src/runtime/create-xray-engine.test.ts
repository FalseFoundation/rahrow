import { EngineError } from '@rahrow/core/errors.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { describe, expect, it } from 'vitest'

import { createEngineRegistry } from '../registry/engine-registry.ts'
import { NoopXrayProcess, XrayEngine } from '../xray/xray-engine.ts'
import { createXrayEngine } from './create-xray-engine.ts'
import type {
	EngineProcessExit,
	EngineProcessSpawner,
	EngineProcessSpawnInput,
	ManagedEngineProcessHandle,
} from './managed-engine-process.ts'

const profile: ConnectionProfile = {
	id: 'profile-1',
	protocol: 'vless',
	endpoint: {
		host: 'example.com',
		port: 443,
	},
	authentication: {
		id: '11111111-1111-4111-8111-111111111111',
	},
	security: {
		type: 'tls',
		serverName: 'example.com',
	},
	transport: {
		type: 'ws',
		host: 'cdn.example.com',
		path: '/ray',
	},
}

class FakeHandle implements ManagedEngineProcessHandle {
	pid = 42
	exit: EngineProcessExit | undefined
	stopInputs: readonly { readonly timeoutMs: number }[] = []

	async stop(): Promise<void> {}

	async kill(): Promise<void> {}

	async exited(): Promise<EngineProcessExit | undefined> {
		return this.exit
	}

	logs() {
		return []
	}
}

class FakeSpawner implements EngineProcessSpawner {
	spawnInputs: EngineProcessSpawnInput[] = []
	handle = new FakeHandle()

	async assertExecutable(): Promise<void> {}

	async spawn(
		input: EngineProcessSpawnInput,
	): Promise<ManagedEngineProcessHandle> {
		this.spawnInputs.push(input)

		return this.handle
	}
}

describe('createXrayEngine', () => {
	it('starts, reports status, and stops through ManagedEngineProcess with a fake spawner', async () => {
		const spawner = new FakeSpawner()
		const engine = createXrayEngine({
			spawner,
			binaryPath: '/opt/xray/xray',
		})

		await engine.start({ profile, localPort: 10808 })
		await expect(engine.status()).resolves.toMatchObject({ status: 'running' })
		expect(spawner.spawnInputs).toHaveLength(1)
		expect(spawner.spawnInputs[0]?.binaryPath).toBe('/opt/xray/xray')
		expect(spawner.spawnInputs[0]?.args).toEqual(['run', '-config', 'stdin:'])

		await engine.stop()
		await expect(engine.status()).resolves.toMatchObject({ status: 'stopped' })
	})

	it('does not use NoopXrayProcess when the binary cannot be resolved', async () => {
		const spawner = new FakeSpawner()
		const engine = createXrayEngine({
			spawner,
			resolveBinaryPath: async () => {
				throw new EngineError(
					'invalid_config',
					'Xray binary was not found. Set RAHROW_XRAY_BINARY to an explicit executable path.',
				)
			},
		})

		await expect(engine.start({ profile })).rejects.toMatchObject({
			code: 'engine_start_failed',
			message: expect.stringContaining('RAHROW_XRAY_BINARY'),
		})
		expect(spawner.spawnInputs).toEqual([])
	})

	it('keeps NoopXrayProcess available for config-only tests', async () => {
		const process = new NoopXrayProcess()
		const engine = new XrayEngine(process)

		await engine.start({ profile })

		expect(process.startedConfigs).toHaveLength(1)
	})
})

describe('createEngineRegistry production default', () => {
	it('exposes an xray engine that can be driven by an injected managed process', async () => {
		const spawner = new FakeSpawner()
		const registry = createEngineRegistry([
			createXrayEngine({
				spawner,
				binaryPath: '/opt/xray/xray',
			}),
		])

		const engine = registry.get('xray')
		await engine.start({ profile })
		await expect(engine.status()).resolves.toMatchObject({ status: 'running' })
		await engine.stop()
	})
})
