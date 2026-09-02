import { EngineError } from '@rahrow/core/errors.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { describe, expect, it } from 'vitest'
import { XrayConfigBuilder } from '../xray/xray-engine.ts'
import {
	BasicXrayConfigValidator,
	type EngineProcessExit,
	type EngineProcessLogEntry,
	type EngineProcessSpawner,
	type EngineProcessSpawnInput,
	ManagedEngineProcess,
	type ManagedEngineProcessHandle,
	RuntimeClockLog,
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

class TestClock {
	#index = 0

	now(): string {
		this.#index += 1

		return `2026-01-01T00:00:0${this.#index}.000Z`
	}
}

class FakeHandle implements ManagedEngineProcessHandle {
	pid = 42
	exit: EngineProcessExit | undefined
	stopError: Error | undefined
	killed = false
	stopInputs: readonly { readonly timeoutMs: number }[] = []

	constructor(private readonly entries: readonly EngineProcessLogEntry[] = []) {}

	async stop(input: { readonly timeoutMs: number }): Promise<void> {
		this.stopInputs = [...this.stopInputs, input]
		if (this.stopError) {
			throw this.stopError
		}
	}

	async kill(): Promise<void> {
		this.killed = true
	}

	async exited(): Promise<EngineProcessExit | undefined> {
		return this.exit
	}

	logs(): readonly EngineProcessLogEntry[] {
		return this.entries
	}
}

class FakeSpawner implements EngineProcessSpawner {
	executableError: Error | undefined
	handle = new FakeHandle()
	spawnInputs: EngineProcessSpawnInput[] = []

	async assertExecutable(): Promise<void> {
		if (this.executableError) {
			throw this.executableError
		}
	}

	async spawn(
		input: EngineProcessSpawnInput,
	): Promise<ManagedEngineProcessHandle> {
		this.spawnInputs.push(input)

		return this.handle
	}
}

describe('ManagedEngineProcess', () => {
	it('starts Xray with deterministic stdin config and stable arguments', async () => {
		const spawner = new FakeSpawner()
		const process = new ManagedEngineProcess({
			binaryPath: '/opt/xray/xray',
			spawner,
			configValidator: new BasicXrayConfigValidator(),
		})
		const config = new XrayConfigBuilder().build({ profile, localPort: 10808 })

		await process.start(config)

		expect(spawner.spawnInputs[0]).toMatchObject({
			binaryPath: '/opt/xray/xray',
			args: ['run', '-config', 'stdin:'],
		})
		expect(spawner.spawnInputs[0]?.configText).toMatchInlineSnapshot(
			`"{"dns":{"servers":["1.1.1.1","8.8.8.8"]},"inbounds":[{"listen":"127.0.0.1","port":10808,"protocol":"socks","settings":{"udp":true},"sniffing":{"destOverride":["http","tls","quic"],"enabled":true},"tag":"socks-in"}],"log":{"loglevel":"warning"},"outbounds":[{"protocol":"vless","settings":{"vnext":[{"address":"example.com","port":443,"users":[{"encryption":"none","id":"11111111-1111-4111-8111-111111111111"}]}]},"streamSettings":{"network":"ws","security":"tls","sockopt":{"tcpNoDelay":true},"tlsSettings":{"serverName":"example.com"},"wsSettings":{"headers":{"Host":"cdn.example.com"},"path":"/ray"}},"tag":"proxy"},{"protocol":"freedom","tag":"direct"},{"protocol":"blackhole","tag":"block"}],"routing":{"domainStrategy":"AsIs","rules":[{"ip":["geoip:private"],"outboundTag":"direct","type":"field"}]}}"`,
		)
	})

	it('rejects invalid generated configs before spawning a process', async () => {
		const spawner = new FakeSpawner()
		const process = new ManagedEngineProcess({
			binaryPath: '/opt/xray/xray',
			spawner,
			configValidator: new BasicXrayConfigValidator(),
		})

		await expect(
			process.start({
				log: { loglevel: 'warning' },
				inbounds: [],
				outbounds: [],
			}),
		).rejects.toThrow(EngineError)
		expect(spawner.spawnInputs).toEqual([])
	})

	it('wraps bad binary path failures before spawn', async () => {
		const spawner = new FakeSpawner()
		spawner.executableError = new Error('xray binary is not executable')
		const process = new ManagedEngineProcess({
			binaryPath: '/missing/xray',
			spawner,
		})

		await expect(
			process.start(new XrayConfigBuilder().build({ profile })),
		).rejects.toMatchObject({
			code: 'engine_start_failed',
			message: 'xray binary is not executable',
		})
		expect(spawner.spawnInputs).toEqual([])
	})

	it('captures startup crash logs and reports startup failure', async () => {
		const log = new RuntimeClockLog(new TestClock())
		const handle = new FakeHandle([log.entry('stderr', 'invalid config')])
		handle.exit = { code: 23 }
		const spawner = new FakeSpawner()
		spawner.handle = handle
		const process = new ManagedEngineProcess({
			binaryPath: '/opt/xray/xray',
			spawner,
		})

		await expect(
			process.start(new XrayConfigBuilder().build({ profile })),
		).rejects.toMatchObject({
			code: 'engine_start_failed',
		})
		expect(process.logs).toEqual([
			{
				stream: 'stderr',
				line: 'invalid config',
				observedAt: '2026-01-01T00:00:01.000Z',
			},
		])
	})

	it('clears stale exited handles before starting a replacement process', async () => {
		const firstHandle = new FakeHandle()
		const secondHandle = new FakeHandle()
		const spawner = new FakeSpawner()
		spawner.handle = firstHandle
		const process = new ManagedEngineProcess({
			binaryPath: '/opt/xray/xray',
			spawner,
		})

		await process.start(new XrayConfigBuilder().build({ profile }))
		firstHandle.exit = { code: 0 }
		spawner.handle = secondHandle
		await process.start(new XrayConfigBuilder().build({ profile }))

		expect(spawner.spawnInputs).toHaveLength(2)
	})

	it('kills the process on stop timeout and reports cleanup failure', async () => {
		const handle = new FakeHandle()
		handle.stopError = new Error('timed out')
		const spawner = new FakeSpawner()
		spawner.handle = handle
		const process = new ManagedEngineProcess({
			binaryPath: '/opt/xray/xray',
			spawner,
			stopTimeoutMs: 250,
		})

		await process.start(new XrayConfigBuilder().build({ profile }))
		await expect(process.stop()).rejects.toMatchObject({
			code: 'engine_stop_failed',
			message: 'timed out',
		})

		expect(handle.stopInputs).toEqual([{ timeoutMs: 250 }])
		expect(handle.killed).toBe(true)
	})

	it('resolves the binary path lazily before spawning', async () => {
		const spawner = new FakeSpawner()
		const process = new ManagedEngineProcess({
			resolveBinaryPath: async () => '/resolved/xray',
			spawner,
		})

		await process.start(new XrayConfigBuilder().build({ profile }))

		expect(spawner.spawnInputs[0]?.binaryPath).toBe('/resolved/xray')
	})
})
