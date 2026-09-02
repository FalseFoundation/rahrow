import { createConnection } from 'node:net'
import {
	type Clock,
	SystemClock,
} from '@rahrow/core/connection/connection-controller.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type { LatencyResult } from '@rahrow/core/runtime/proxy-engine.ts'

export interface TcpDialer {
	connect(host: string, port: number, timeoutMs: number): Promise<void>
}

const defaultTimeoutMs = 5_000

export class TcpLatencyProbe {
	constructor(
		private readonly clock: Clock = new SystemClock(),
		private readonly dialer: TcpDialer = nodeTcpDialer,
		private readonly nowMs: () => number = () => Date.now(),
		private readonly timeoutMs = defaultTimeoutMs,
	) {}

	async test(profile: ConnectionProfile): Promise<LatencyResult> {
		const startedAt = this.nowMs()

		try {
			await this.dialer.connect(
				profile.endpoint.host,
				profile.endpoint.port,
				this.timeoutMs,
			)

			return {
				profileId: profile.id,
				reachable: true,
				checkedAt: this.clock.now(),
				latencyMs: Math.max(this.nowMs() - startedAt, 1),
			}
		} catch (error) {
			return {
				profileId: profile.id,
				reachable: false,
				checkedAt: this.clock.now(),
				error: error instanceof Error ? error.message : 'Probe failed',
			}
		}
	}
}

export const nodeTcpDialer: TcpDialer = {
	connect(host, port, timeoutMs) {
		return new Promise((resolve, reject) => {
			const socket = createConnection({ host, port })
			const timer = setTimeout(() => {
				socket.destroy()
				reject(new Error(`Timed out connecting to ${host}:${port}`))
			}, timeoutMs)

			socket.once('connect', () => {
				clearTimeout(timer)
				socket.end()
				resolve()
			})
			socket.once('error', (error: Error) => {
				clearTimeout(timer)
				reject(error)
			})
		})
	},
}
