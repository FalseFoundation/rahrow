import { describe, expect, it, vi } from 'vitest'

import {
	SmartConnectScheduleRunner,
	type SmartConnectScheduleTimer,
} from './smart-connect-schedule-runner.ts'

class TestTimer implements SmartConnectScheduleTimer {
	currentTime = Date.parse('2026-09-02T00:00:00.000Z')
	delay: number | undefined
	callback: (() => void) | undefined
	clears = 0

	now(): number {
		return this.currentTime
	}

	set(delay: number, callback: () => void): unknown {
		this.delay = delay
		this.callback = callback
		return callback
	}

	clear(_handle: unknown): void {
		this.clears += 1
		this.callback = undefined
	}
}

describe('SmartConnectScheduleRunner', () => {
	it('runs overdue persisted work on startup and schedules the next decision', async () => {
		const timer = new TestTimer()
		const runIfDue = vi.fn().mockResolvedValue({
			outcome: 'unchanged',
			probed: 2,
			nextRunAt: '2026-09-02T00:05:00.000Z',
		})
		const runner = new SmartConnectScheduleRunner(
			{
				status: vi.fn().mockResolvedValue({
					enabled: true,
					nextRunAt: '2026-09-01T23:59:00.000Z',
				}),
				runIfDue,
			},
			{ timer },
		)

		await runner.start()

		expect(runIfDue).toHaveBeenCalledOnce()
		expect(timer.delay).toBe(300_000)
	})

	it('coalesces startup and resume recovery into one active run', async () => {
		const timer = new TestTimer()
		let finish: (() => void) | undefined
		const runIfDue = vi.fn(
			() =>
				new Promise<{ outcome: 'disabled'; probed: 0 }>((resolve) => {
					finish = () => resolve({ outcome: 'disabled', probed: 0 })
				}),
		)
		const runner = new SmartConnectScheduleRunner(
			{
				status: vi.fn().mockResolvedValue({ enabled: false }),
				runIfDue,
			},
			{ timer },
		)

		const startup = runner.start()
		const resumed = runner.resume()
		await vi.waitFor(() => expect(runIfDue).toHaveBeenCalledOnce())
		finish?.()
		await Promise.all([startup, resumed])

		expect(runIfDue).toHaveBeenCalledOnce()
		expect(timer.callback).toBeUndefined()
	})

	it('aborts active work when stopped', async () => {
		const timer = new TestTimer()
		let observedSignal: AbortSignal | undefined
		const runner = new SmartConnectScheduleRunner(
			{
				status: vi.fn().mockResolvedValue({ enabled: true }),
				runIfDue: vi.fn(async ({ signal }) => {
					observedSignal = signal
					await new Promise<void>((resolve) => {
						signal?.addEventListener('abort', () => resolve(), { once: true })
					})
					return { outcome: 'disabled' as const, probed: 0 }
				}),
			},
			{ timer },
		)

		const startup = runner.start()
		await vi.waitFor(() => expect(observedSignal).toBeDefined())
		runner.stop()
		await startup

		expect(observedSignal?.aborted).toBe(true)
	})

	it('cancels shared manual ownership when the runner stops', () => {
		const cancel = vi.fn()
		const runner = new SmartConnectScheduleRunner({
			cancel,
			status: vi.fn().mockResolvedValue({ enabled: true }),
			runIfDue: vi.fn().mockResolvedValue({
				outcome: 'disabled',
				probed: 0,
			}),
		})

		runner.stop()

		expect(cancel).toHaveBeenCalledWith('Smart Connect scheduler stopped')
	})

	it('clears scheduled host work when stopped', async () => {
		const timer = new TestTimer()
		const runner = new SmartConnectScheduleRunner(
			{
				status: vi.fn().mockResolvedValue({ enabled: true }),
				runIfDue: vi.fn().mockResolvedValue({
					outcome: 'unchanged',
					probed: 1,
					nextRunAt: '2026-09-02T00:05:00.000Z',
				}),
			},
			{ timer },
		)

		await runner.start()
		runner.stop()

		expect(timer.clears).toBe(1)
	})
})
