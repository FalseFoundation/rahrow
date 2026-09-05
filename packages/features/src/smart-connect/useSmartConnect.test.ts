import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useSmartConnect } from './useSmartConnect.ts'

function createCapability() {
	return {
		orchestrator: {
			status: vi.fn().mockResolvedValue({ enabled: false }),
			start: vi.fn().mockResolvedValue({ enabled: true }),
			stop: vi.fn().mockResolvedValue({ enabled: false }),
			run: vi.fn(async ({ onProgress }) => {
				onProgress?.({ phase: 'queued', total: 2 })
				onProgress?.({
					phase: 'testing',
					active: 1,
					completed: 1,
					started: 2,
					total: 2,
				})
				onProgress?.({ phase: 'selecting', total: 2 })
				return {
					outcome: 'selected' as const,
					probed: 2,
					winner: { profileId: 'fast', latencyMs: 12 },
					nextRunAt: '2026-09-02T00:05:00.000Z',
				}
			}),
		},
		schedule: { resume: vi.fn().mockResolvedValue(undefined) },
	}
}

describe('useSmartConnect', () => {
	it('enables, reports progress, selects, and resumes the five-minute schedule', async () => {
		const capability = createCapability()
		const { result } = renderHook(() => useSmartConnect(capability))
		await waitFor(() => expect(result.current.state.isLoading).toBe(false))

		await act(async () => {
			await result.current.actions.start()
		})

		expect(capability.orchestrator.start).toHaveBeenCalledOnce()
		expect(capability.orchestrator.run).toHaveBeenCalledOnce()
		await waitFor(() => expect(capability.schedule.resume).toHaveBeenCalledOnce())
		expect(result.current.state).toMatchObject({
			enabled: true,
			status: 'success',
			outcome: 'selected',
			probed: 2,
			winnerLatencyMs: 12,
			nextRunAt: '2026-09-02T00:05:00.000Z',
		})
	})

	it('cancels active probing without disabling the persisted schedule', async () => {
		let signal: AbortSignal | undefined
		const capability = createCapability()
		capability.orchestrator.run.mockImplementation(
			({ signal: nextSignal }) =>
				new Promise((_, reject) => {
					signal = nextSignal
					nextSignal?.addEventListener(
						'abort',
						() => reject(new DOMException('Canceled', 'AbortError')),
						{ once: true },
					)
				}),
		)
		const { result } = renderHook(() => useSmartConnect(capability))
		await waitFor(() => expect(result.current.state.isLoading).toBe(false))

		act(() => {
			void result.current.actions.start()
		})
		await waitFor(() => expect(result.current.state.status).toBe('running'))
		act(() => result.current.actions.cancel())
		await waitFor(() => expect(result.current.state.status).toBe('idle'))

		expect(signal?.aborted).toBe(true)
		expect(capability.orchestrator.stop).not.toHaveBeenCalled()
		expect(capability.schedule.resume).toHaveBeenCalledOnce()
	})

	it('recovers the persisted schedule after an enabled run fails', async () => {
		const capability = createCapability()
		capability.orchestrator.status.mockResolvedValue({ enabled: true })
		capability.orchestrator.run.mockRejectedValue(new Error('probe failed'))
		const { result } = renderHook(() => useSmartConnect(capability))
		await waitFor(() => expect(result.current.state.enabled).toBe(true))

		await act(async () => {
			await result.current.actions.run()
		})

		expect(result.current.state.status).toBe('error')
		expect(capability.schedule.resume).toHaveBeenCalledOnce()
	})

	it('stops Smart Connect explicitly and fails safely when unavailable', async () => {
		const capability = createCapability()
		capability.orchestrator.status.mockResolvedValue({ enabled: true })
		const { result, rerender } = renderHook(
			({ value }) => useSmartConnect(value),
			{ initialProps: { value: capability as typeof capability | undefined } },
		)
		await waitFor(() => expect(result.current.state.enabled).toBe(true))

		await act(async () => {
			await result.current.actions.stop()
		})
		expect(capability.orchestrator.stop).toHaveBeenCalledOnce()
		expect(result.current.state.enabled).toBe(false)

		rerender({ value: undefined })
		await waitFor(() => expect(result.current.state.status).toBe('unavailable'))
	})

	it('surfaces an enable failure without starting probes', async () => {
		const capability = createCapability()
		capability.orchestrator.start.mockRejectedValue(
			new Error('storage unavailable'),
		)
		const { result } = renderHook(() => useSmartConnect(capability))
		await waitFor(() => expect(result.current.state.isLoading).toBe(false))

		await act(async () => {
			await result.current.actions.start()
		})

		expect(result.current.state.status).toBe('error')
		expect(result.current.state.enabled).toBe(false)
		expect(capability.orchestrator.run).not.toHaveBeenCalled()
	})
})
