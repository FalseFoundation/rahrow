import { EventEmitter } from 'node:events'

import { EngineError } from '@rahrow/core/errors.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { describe, expect, it } from 'vitest'

import { SystemClock, XrayConfigBuilder } from '../xray/xray-engine.ts'
import {
	createNodeEngineProcessSpawner,
	type NodeEngineChild,
} from './node-engine-process-spawner.ts'

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
}

class FakeChild extends EventEmitter implements NodeEngineChild {
	pid = 77
	exitCode: number | null = null
	signalCode: NodeJS.Signals | null = null
	writes: string[] = []
	ended = false
	signals: NodeJS.Signals[] = []
	stdout = new EventEmitter()
	stderr = new EventEmitter()
	stdin = {
		write: (data: string, callback?: (error?: Error | null) => void) => {
			this.writes.push(data)
			callback?.(null)

			return true
		},
		end: () => {
			this.ended = true
		},
	}

	kill(signal?: NodeJS.Signals) {
		const resolved = signal ?? 'SIGTERM'
		this.signals.push(resolved)
		this.signalCode = resolved
		this.exitCode = 0
		this.emit('exit', this.exitCode, this.signalCode)

		return true
	}
}

describe('createNodeEngineProcessSpawner', () => {
	it('writes config to stdin and captures stdout logs', async () => {
		const child = new FakeChild()
		const spawnCalls: Array<{
			command: string
			args: readonly string[]
		}> = []
		const spawner = createNodeEngineProcessSpawner({
			clock: new SystemClock(),
			access: async () => {},
			spawn: (command, args) => {
				spawnCalls.push({ command, args })

				return child
			},
		})
		const config = new XrayConfigBuilder().build({ profile })

		await spawner.assertExecutable('/opt/xray/xray')
		const handle = await spawner.spawn({
			binaryPath: '/opt/xray/xray',
			args: ['run', '-config', 'stdin:'],
			config,
			configText: '{"log":{"loglevel":"warning"}}',
		})
		child.stdout.emit('data', 'boot ok\n')

		expect(spawnCalls).toEqual([
			{
				command: '/opt/xray/xray',
				args: ['run', '-config', 'stdin:'],
			},
		])
		expect(child.writes[0]).toContain('"loglevel":"warning"')
		expect(child.ended).toBe(true)
		expect(handle.logs()).toEqual([
			expect.objectContaining({
				stream: 'stdout',
				line: 'boot ok',
			}),
		])

		await handle.stop({ timeoutMs: 250 })
		expect(child.signals).toEqual(['SIGTERM'])
	})

	it('maps missing binaries to engine start failures', async () => {
		const spawner = createNodeEngineProcessSpawner({
			access: async () => {
				throw new Error('ENOENT')
			},
		})

		await expect(spawner.assertExecutable('/missing/xray')).rejects.toThrow(
			EngineError,
		)
	})
})
