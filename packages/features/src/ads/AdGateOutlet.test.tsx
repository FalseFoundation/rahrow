import { AdGateController, type AdGateStorage } from '@rahrow/ads/ad-gate.ts'
import type { AdProvider } from '@rahrow/ads/ad-provider.ts'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AdGateOutlet } from './AdGateOutlet.tsx'

describe('AdGateOutlet', () => {
	afterEach(() => {
		cleanup()
		vi.useRealTimers()
	})

	it('shows only a media placeholder for an embedded test advertisement', async () => {
		const gate = new AdGateController({
			storage: new MemoryStorage(),
			createId: () => 'ad-1',
			now: () => 1,
		})
		await gate.initialize()
		await gate.recordConnectionSuccess()
		let resolveLoad:
			| ((value: Awaited<ReturnType<AdProvider['load']>>) => void)
			| undefined
		const provider: AdProvider = {
			id: 'test',
			load: () =>
				new Promise((resolve) => {
					resolveLoad = resolve
				}),
		}

		render(<AdGateOutlet gate={gate} provider={provider} />)
		await act(async () => Promise.resolve())

		expect(
			screen
				.getByRole('img', { name: 'Advertisement media placeholder' })
				.getAttribute('data-slot'),
		).toBe('skeleton')

		await act(async () => {
			resolveLoad?.({
				kind: 'embedded',
				creative: {
					sponsor: 'Example sponsor',
					headline: 'A useful message',
					body: 'This is a test creative.',
				},
			})
			await Promise.resolve()
		})

		expect(
			screen
				.getByRole('img', { name: 'Advertisement media placeholder' })
				.getAttribute('data-slot'),
		).toBe('skeleton')
		expect(screen.queryByText('Example sponsor')).toBeNull()
		expect(screen.queryByText('A useful message')).toBeNull()
		expect(screen.queryByText('This is a test creative.')).toBeNull()
	})

	it('keeps an embedded ad non-dismissible until the policy-safe timer completes', async () => {
		vi.useFakeTimers()
		const gate = new AdGateController({
			storage: new MemoryStorage(),
			createId: () => 'ad-1',
			now: () => 1,
		})
		await gate.initialize()
		await gate.recordConnectionSuccess()
		const provider: AdProvider = {
			id: 'test',
			async load() {
				return {
					kind: 'embedded',
					creative: {
						sponsor: 'Example sponsor',
						headline: 'A useful message',
						body: 'This is a test creative.',
					},
				}
			},
		}

		render(<AdGateOutlet gate={gate} provider={provider} />)
		await act(async () => Promise.resolve())

		expect(
			screen
				.getByRole('img', { name: 'Advertisement media placeholder' })
				.getAttribute('data-slot'),
		).toBe('skeleton')
		expect(
			screen.queryByRole('button', { name: 'Close advertisement drawer' }),
		).toBeNull()
		expect(
			screen.getByText('Time remaining').closest('[data-slot="drawer-footer"]'),
		).not.toBeNull()

		await act(async () => vi.advanceTimersByTimeAsync(9_999))
		expect(
			screen.queryByRole('button', { name: 'Close advertisement drawer' }),
		).toBeNull()

		await act(async () => vi.advanceTimersByTimeAsync(1))
		fireEvent.click(
			screen.getByRole('button', { name: 'Close advertisement drawer' }),
		)
		await act(async () => Promise.resolve())
		expect(gate.snapshot().obligations).toEqual([])
	})

	it('keeps the drawer closed during cooldown and presents one queued ad when eligible', async () => {
		vi.useFakeTimers()
		vi.setSystemTime(new Date(1_000))
		const gate = new AdGateController({
			storage: new MemoryStorage(),
			createId: (() => {
				let id = 0
				return () => `ad-${++id}`
			})(),
			now: Date.now,
		})
		const first = await gate.recordConnectionSuccess()
		await gate.recordConnectionSuccess()
		await gate.claimNext()
		await gate.complete(first.id)
		const load = vi.fn<AdProvider['load']>(async () => ({
			kind: 'embedded',
			creative: {
				sponsor: 'Example sponsor',
				headline: 'Queued message',
				body: 'Shown once.',
			},
		}))

		render(<AdGateOutlet gate={gate} provider={{ id: 'test', load }} />)
		await act(async () => Promise.resolve())

		expect(load).not.toHaveBeenCalled()
		expect(
			screen.queryByRole('img', { name: 'Advertisement media placeholder' }),
		).toBeNull()

		await act(async () => vi.advanceTimersByTimeAsync(299_999))
		expect(load).not.toHaveBeenCalled()
		await act(async () => vi.advanceTimersByTimeAsync(1))
		expect(load).toHaveBeenCalledOnce()
	})
})

class MemoryStorage implements AdGateStorage {
	private value: string | null = null

	async read(): Promise<string | null> {
		return this.value
	}

	async write(value: string): Promise<void> {
		this.value = value
	}
}
