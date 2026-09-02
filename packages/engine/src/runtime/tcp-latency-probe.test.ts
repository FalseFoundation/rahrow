import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { describe, expect, it } from 'vitest'

import { type TcpDialer, TcpLatencyProbe } from './tcp-latency-probe.ts'

const profile: ConnectionProfile = {
	id: 'profile-1',
	protocol: 'vless',
	endpoint: {
		host: 'example.com',
		port: 443,
	},
}

class TestClock {
	now(): string {
		return '2026-01-01T00:00:00.000Z'
	}
}

class TestDialer implements TcpDialer {
	error: Error | undefined
	calls: Array<{ host: string; port: number; timeoutMs: number }> = []

	async connect(host: string, port: number, timeoutMs: number): Promise<void> {
		this.calls.push({ host, port, timeoutMs })

		if (this.error) {
			throw this.error
		}
	}
}

describe('TcpLatencyProbe', () => {
	it('reports reachability and latency through an injected dialer', async () => {
		const dialer = new TestDialer()
		let now = 1_000
		const probe = new TcpLatencyProbe(new TestClock(), dialer, () => {
			now += 17
			return now
		})

		await expect(probe.test(profile)).resolves.toEqual({
			profileId: 'profile-1',
			reachable: true,
			checkedAt: '2026-01-01T00:00:00.000Z',
			latencyMs: 17,
		})
		expect(dialer.calls).toEqual([
			{
				host: 'example.com',
				port: 443,
				timeoutMs: 5_000,
			},
		])
	})

	it('returns unreachable diagnostics when the endpoint cannot be dialed', async () => {
		const dialer = new TestDialer()
		dialer.error = new Error('connect ECONNREFUSED')
		const probe = new TcpLatencyProbe(new TestClock(), dialer, () => 0)

		await expect(probe.test(profile)).resolves.toEqual({
			profileId: 'profile-1',
			reachable: false,
			checkedAt: '2026-01-01T00:00:00.000Z',
			error: 'connect ECONNREFUSED',
		})
	})

	it('never reports a successful probe as zero milliseconds', async () => {
		const probe = new TcpLatencyProbe(
			new TestClock(),
			new TestDialer(),
			() => 1_000,
		)

		await expect(probe.test(profile)).resolves.toMatchObject({
			reachable: true,
			latencyMs: 1,
		})
	})
})
