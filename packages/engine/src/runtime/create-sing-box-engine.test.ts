import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { describe, expect, it } from 'vitest'

import {
	createSingBoxEngine,
	type SingBoxChildProcess,
	type SingBoxSpawn,
} from './create-sing-box-engine.ts'

const profile: ConnectionProfile = {
	id: 'profile-1',
	protocol: 'trojan',
	endpoint: { host: 'example.com', port: 443 },
	authentication: { password: 'secret' },
	security: { type: 'tls', serverName: 'example.com' },
}

describe('createSingBoxEngine', () => {
	it('starts a host-provided sing-box process with config on stdin', async () => {
		const writes: string[] = []
		const spawnInputs: Array<{
			readonly command: string
			readonly args: readonly string[]
		}> = []
		const child = fakeChild(writes)
		const spawn: SingBoxSpawn = (command, args) => {
			spawnInputs.push({ command, args })
			return child
		}
		const engine = createSingBoxEngine({
			binaryPath: '/opt/sing-box/sing-box',
			access: async () => undefined,
			spawn,
		})

		await engine.start({ profile, localPort: 12080 })

		expect(spawnInputs).toEqual([
			{
				command: '/opt/sing-box/sing-box',
				args: ['run', '-c', 'stdin'],
			},
		])
		const config = JSON.parse(writes.join(''))
		expect(config.inbounds[0]).toMatchObject({ listen_port: 12080 })
		expect(config.outbounds[0]).toMatchObject({
			type: 'trojan',
			password: 'secret',
		})
	})

	it('requires an explicit RAHROW_SING_BOX_BINARY path', async () => {
		const engine = createSingBoxEngine({
			env: { RAHROW_SING_BOX_BINARY: 'sing-box' },
			access: async () => undefined,
			spawn: () => fakeChild([]),
		})

		await expect(engine.start({ profile })).rejects.toMatchObject({
			code: 'engine_start_failed',
			message: expect.stringContaining('explicit filesystem path'),
		})
	})
})

function fakeChild(writes: string[]): SingBoxChildProcess {
	return {
		stdin: {
			write(value, callback) {
				writes.push(value)
				callback?.()
			},
			end() {},
		},
		exitCode: null,
		signalCode: null,
		kill() {
			return true
		},
		on() {},
		once() {},
	}
}
