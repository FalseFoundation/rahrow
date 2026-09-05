import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SmartConnectStatus } from './SmartConnectStatus.tsx'

const actions = {
	start: vi.fn(),
	run: vi.fn(),
	stop: vi.fn(),
	cancel: vi.fn(),
}

afterEach(() => {
	cleanup()
	vi.clearAllMocks()
})

describe('SmartConnectStatus', () => {
	it('announces live counts and exposes cancellation without profile details', () => {
		render(
			<SmartConnectStatus
				state={{
					enabled: true,
					isLoading: false,
					status: 'running',
					progress: {
						phase: 'testing',
						active: 2,
						completed: 1,
						started: 3,
						total: 4,
					},
				}}
				actions={actions}
			/>,
		)

		expect(screen.getByRole('status').textContent).toContain('1 of 4 checked')
		expect(screen.getByRole('status').textContent).toContain('2 testing')
		expect(screen.getByRole('status').textContent).toContain('1 queued')
		fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
		expect(actions.cancel).toHaveBeenCalledOnce()
		expect(screen.getByRole('status').textContent).not.toContain('fast')
	})

	it('makes safe switching and rollback states explicit', () => {
		const rendered = render(
			<SmartConnectStatus
				state={{
					enabled: true,
					isLoading: false,
					status: 'running',
					progress: {
						phase: 'switching',
						total: 3,
						winnerLatencyMs: 12,
					},
				}}
				actions={actions}
			/>,
		)

		expect(screen.getByText('Switching safely')).toBeDefined()
		expect(screen.getByText(/reinitializing the connection/i)).toBeDefined()

		rendered.rerender(
			<SmartConnectStatus
				state={{
					enabled: true,
					isLoading: false,
					status: 'running',
					progress: { phase: 'restoring', total: 3 },
				}}
				actions={actions}
			/>,
		)
		expect(screen.getByText('Restoring your connection')).toBeDefined()
	})

	it('shows the winner, next check, retry, and stop controls', () => {
		render(
			<SmartConnectStatus
				state={{
					enabled: true,
					isLoading: false,
					status: 'success',
					outcome: 'selected',
					probed: 4,
					winnerLatencyMs: 12,
					nextRunAt: '2026-09-02T00:05:00.000Z',
				}}
				actions={actions}
			/>,
		)

		expect(screen.getByText('Fastest connection selected')).toBeDefined()
		expect(screen.getByText(/4 checked/)).toBeDefined()
		expect(screen.getByText(/12 ms/)).toBeDefined()
		expect(screen.getByText(/Next check/)).toBeDefined()
		fireEvent.click(screen.getByRole('button', { name: 'Check now' }))
		fireEvent.click(screen.getByRole('button', { name: 'Turn off' }))
		expect(actions.run).toHaveBeenCalledOnce()
		expect(actions.stop).toHaveBeenCalledOnce()
	})
})
