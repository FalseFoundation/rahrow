import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type {
	EngineHealth,
	EngineId,
	EngineStartInput,
	LatencyResult,
	ProxyEngine,
} from '@rahrow/core/runtime/proxy-engine.ts'
import { describe, expect, it } from 'vitest'

import { EngineRegistry } from './engine-registry.ts'
import { SelectedEngine } from './selected-engine.ts'

const profile: ConnectionProfile = {
	id: 'profile-1',
	protocol: 'trojan',
	endpoint: { host: 'example.com', port: 443 },
	authentication: { password: 'secret' },
}

class RecordingEngine implements ProxyEngine {
	readonly starts: EngineStartInput[] = []
	stops = 0

	constructor(readonly id: EngineId) {}

	readonly manifest = {
		id: this.id,
		supportedProtocols: ['vless', 'vmess', 'trojan'],
	} as const

	async start(input: EngineStartInput) {
		this.starts.push(input)
	}

	async stop() {
		this.stops += 1
	}

	async restart(input: EngineStartInput) {
		await this.stop()
		await this.start(input)
	}

	async status(): Promise<EngineHealth> {
		return {
			status: this.starts.length > this.stops ? 'running' : 'stopped',
			checkedAt: '2026-01-01T00:00:00.000Z',
		}
	}

	async test(candidate: ConnectionProfile): Promise<LatencyResult> {
		return {
			profileId: candidate.id,
			reachable: true,
			checkedAt: '2026-01-01T00:00:00.000Z',
		}
	}
}

describe('SelectedEngine', () => {
	it('dispatches start and test to the currently selected engine', async () => {
		const xray = new RecordingEngine('xray')
		const singBox = new RecordingEngine('sing-box')
		let selected: EngineId = 'sing-box'
		const engine = new SelectedEngine(
			new EngineRegistry([xray, singBox]),
			async () => selected,
		)

		await engine.start({ profile })
		expect(singBox.starts).toHaveLength(1)
		expect(xray.starts).toHaveLength(0)

		selected = 'xray'
		await engine.test(profile)
		expect(await xray.status()).toMatchObject({ status: 'stopped' })
	})

	it('stops and reports the engine that actually owns the active process', async () => {
		const xray = new RecordingEngine('xray')
		const singBox = new RecordingEngine('sing-box')
		let selected: EngineId = 'sing-box'
		const engine = new SelectedEngine(
			new EngineRegistry([xray, singBox]),
			async () => selected,
		)

		await engine.start({ profile })
		selected = 'xray'

		await expect(engine.status()).resolves.toMatchObject({ status: 'running' })
		await engine.stop()
		expect(singBox.stops).toBe(1)
		expect(xray.stops).toBe(0)
	})

	it('honors an explicit per-connection engine over the persisted selection', async () => {
		const xray = new RecordingEngine('xray')
		const singBox = new RecordingEngine('sing-box')
		const engine = new SelectedEngine(
			new EngineRegistry([xray, singBox]),
			async () => 'xray',
		)

		await engine.start({ profile, engineId: 'sing-box' })

		expect(singBox.starts).toHaveLength(1)
		expect(xray.starts).toHaveLength(0)
	})

	it('recovers and stops a running engine after the app runtime is reconstructed', async () => {
		const xray = new RecordingEngine('xray')
		const singBox = new RecordingEngine('sing-box')
		await xray.start({ profile })
		const reconstructedEngine = new SelectedEngine(
			new EngineRegistry([xray, singBox]),
			async () => 'sing-box',
		)

		await expect(reconstructedEngine.status()).resolves.toMatchObject({
			status: 'running',
		})
		await reconstructedEngine.stop()

		expect(xray.stops).toBe(1)
		expect(singBox.stops).toBe(0)
	})

	it('rejects a second start while an engine owns the active process', async () => {
		const xray = new RecordingEngine('xray')
		const singBox = new RecordingEngine('sing-box')
		let selected: EngineId = 'sing-box'
		const engine = new SelectedEngine(
			new EngineRegistry([xray, singBox]),
			async () => selected,
		)

		await engine.start({ profile })
		selected = 'xray'

		await expect(engine.start({ profile })).rejects.toMatchObject({
			code: 'engine_already_running',
		})
		expect(singBox.starts).toHaveLength(1)
		expect(xray.starts).toHaveLength(0)
	})
})
