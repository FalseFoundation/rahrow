import type { SingBoxConfig } from '@rahrow/engine/sing-box/sing-box-engine.ts'
import type { XrayConfig } from '@rahrow/engine/xray/xray-engine.ts'
import { describe, expect, it } from 'vitest'

import {
	createDesktopConnectionCommands,
	createDesktopConnectionStack,
	createTauriNativeCommands,
	type DesktopNativeCommands,
} from './connection-commands.ts'

const profile = {
	id: 'test-profile',
	protocol: 'vless',
	endpoint: {
		host: 'example.com',
		port: 443,
	},
	authentication: {
		id: '00000000-0000-0000-0000-000000000000',
	},
}

class FakeNativeCommands implements DesktopNativeCommands {
	readonly startedConfigs: XrayConfig[] = []
	readonly startedSingBoxConfigs: SingBoxConfig[] = []
	running = false
	failNextStart = false
	probeResult: {
		readonly reachable: boolean
		readonly latencyMs?: number
		readonly error?: string
	} = { reachable: true, latencyMs: 12 }

	async startXray(config: XrayConfig): Promise<void> {
		if (this.failNextStart) {
			this.failNextStart = false
			throw new Error('replacement failed')
		}
		this.startedConfigs.push(config)
		this.running = true
	}

	async stopXray(): Promise<void> {
		this.running = false
	}

	async statusXray(): Promise<{ readonly running: boolean }> {
		return {
			running: this.running,
		}
	}

	async startSingBox(config: SingBoxConfig): Promise<void> {
		this.startedSingBoxConfigs.push(config)
		this.running = true
	}

	async stopSingBox(): Promise<void> {
		this.running = false
	}

	async statusSingBox(): Promise<{ readonly running: boolean }> {
		return { running: this.running }
	}

	async probeTcp(host: string, port: number) {
		return host === 'example.com' && port === 443
			? this.probeResult
			: { reachable: false, error: 'Unknown endpoint' }
	}
}

describe('desktop connection commands', () => {
	it('starts sing-box when the desktop engine selection requests it', async () => {
		const native = new FakeNativeCommands()
		const stack = createDesktopConnectionStack(native, {
			selectEngine: () => 'sing-box',
		})

		const result = await stack.commands.connect({
			profile,
			mode: 'vpn',
			localPort: 12080,
		})

		expect(result.ok).toBe(true)
		expect(native.startedConfigs).toEqual([])
		expect(native.startedSingBoxConfigs[0]?.inbounds[0]).toMatchObject({
			type: 'tun',
			auto_route: true,
			strict_route: true,
		})
		expect(native.startedSingBoxConfigs[0]?.outbounds[0]).toMatchObject({
			type: 'vless',
		})
	})

	it('honors an explicit engine for recovery even when settings select another', async () => {
		const native = new FakeNativeCommands()
		const stack = createDesktopConnectionStack(native, {
			selectEngine: () => 'xray',
		})

		const result = await stack.commands.connect({
			profile,
			engineId: 'sing-box',
			mode: 'proxy',
			localPort: 12080,
		})

		expect(result.ok).toBe(true)
		expect(native.startedSingBoxConfigs).toHaveLength(1)
		expect(native.startedConfigs).toEqual([])
	})

	it('connects through the shared controller and native Xray process adapter', async () => {
		const native = new FakeNativeCommands()
		const commands = createDesktopConnectionCommands(native)

		const result = await commands.connect({ profile, localPort: 12080 })

		expect(result.ok).toBe(true)
		expect(result.ok && result.data.state).toBe('connected')
		expect(native.startedConfigs).toHaveLength(1)
		expect(native.startedConfigs[0]?.inbounds[0]?.port).toBe(12080)
	})

	it('maps validation errors into stable app-facing error shapes', async () => {
		const commands = createDesktopConnectionCommands(new FakeNativeCommands())

		const result = await commands.connect({ profile: { ...profile, id: '' } })

		expect(result).toEqual({
			ok: false,
			error: {
				code: 'invalid_profile',
				message: 'id: Too small: expected string to have >=1 characters',
			},
		})
	})

	it('treats an unchanged active reconfiguration as a no-op', async () => {
		const native = new FakeNativeCommands()
		const commands = createDesktopConnectionCommands(native)

		await commands.connect({ profile })
		const result = await commands.restart()

		expect(result.ok).toBe(true)
		expect(result.ok && result.data.state).toBe('connected')
		expect(native.startedConfigs).toHaveLength(1)
	})

	it('uses atomic reconfiguration so a failed restart restores the active profile', async () => {
		const native = new FakeNativeCommands()
		const commands = createDesktopConnectionCommands(native)
		await commands.connect({ profile })
		native.failNextStart = true

		const result = await commands.restart({
			profile: {
				...profile,
				id: 'replacement',
				endpoint: { host: 'replacement.example.com', port: 443 },
			},
		})
		const status = await commands.status()

		expect(result).toMatchObject({ ok: false })
		expect(status.ok && status.data.connection).toMatchObject({
			state: 'connected',
			profile: { id: 'test-profile' },
		})
		expect(status.ok && status.data.engine.status).toBe('running')
	})

	it('returns status and latency using the shared core and engine contracts', async () => {
		const native = new FakeNativeCommands()
		const commands = createDesktopConnectionCommands(native)

		await commands.connect({ profile })

		const status = await commands.status()
		const latency = await commands.latency()

		expect(status.ok && status.data.connection?.state).toBe('connected')
		expect(status.ok && status.data.engine.status).toBe('running')
		expect(latency.ok && latency.data.profileId).toBe('test-profile')
		expect(latency.ok && latency.data.reachable).toBe(true)
		expect(latency.ok && latency.data.latencyMs).toBe(12)

		native.probeResult = {
			reachable: false,
			error: 'TCP probe timed out after 5 seconds',
		}
		const timeout = await commands.latency()
		expect(timeout.ok && timeout.data.reachable).toBe(false)
		expect(timeout.ok && timeout.data.error).toBe(
			'TCP probe timed out after 5 seconds',
		)
	})

	it('maps fake Tauri invoke onto native Xray commands without a live binary', async () => {
		const calls: string[] = []
		let running = false
		const native = createTauriNativeCommands(async (command, args) => {
			calls.push(command)

			if (command === 'rahrow_xray_start') {
				running = Boolean(args?.config)
				return undefined as never
			}

			if (command === 'rahrow_xray_stop') {
				running = false
				return undefined as never
			}

			if (command === 'rahrow_xray_status') {
				return { running } as never
			}

			if (command === 'rahrow_tcp_probe') {
				return { reachable: true, latencyMs: 9 } as never
			}

			throw new Error(`unexpected command ${command}`)
		})
		const commands = createDesktopConnectionCommands(native)

		const result = await commands.connect({ profile, localPort: 12080 })
		const latency = await commands.latency(profile)

		expect(result.ok).toBe(true)
		expect(calls).toContain('rahrow_xray_start')
		expect(latency.ok && latency.data.reachable).toBe(true)
		expect(latency.ok && latency.data.latencyMs).toBe(9)
	})
})
