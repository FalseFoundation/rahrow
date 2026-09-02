// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

const harness = vi.hoisted(() => ({
	viewport: null as HTMLDivElement | null,
	options: [] as Array<{
		count: number
		getItemKey: (index: number) => string | number
		getScrollElement: () => HTMLDivElement | null
		overscan: number
		scrollMargin: number
	}>,
	records: Array.from({ length: 10_000 }, (_, index) => ({
		id: `log-${index}`,
		time: index,
		level: 'info' as const,
		msg: `Log record ${index}`,
		module: 'scale',
		bindings: {},
	})),
}))

vi.mock('../app/app-scroll-context.tsx', () => ({
	useAppScrollViewport: () => ({ current: harness.viewport }),
}))

vi.mock('./useLogs.ts', () => ({
	useLogs: () => harness.records,
}))

vi.mock('@tanstack/react-virtual', () => ({
	useVirtualizer: (options: (typeof harness.options)[number]) => {
		harness.options.push(options)
		return {
			getTotalSize: () => options.count * 72,
			getVirtualItems: () =>
				Array.from({ length: 10 }, (_, index) => ({
					index,
					start: options.scrollMargin + index * 72,
				})),
			measureElement: vi.fn(),
		}
	},
}))

import { Logs } from './Logs.tsx'

describe('Logs virtualization contract', () => {
	afterEach(() => {
		cleanup()
		harness.options.length = 0
		harness.viewport = null
	})

	it('bounds 10,000 records against the app scroll viewport', () => {
		harness.viewport = document.createElement('div')
		render(<Logs />)

		const options = harness.options.at(-1)
		expect(options).toMatchObject({ count: 10_000, overscan: 8 })
		expect(options?.getScrollElement()).toBe(harness.viewport)
		expect(options?.getItemKey(9_999)).toBe('log-9999')
		expect(screen.getAllByRole('listitem')).toHaveLength(10)
		expect(document.querySelector('[data-slot="scroll-area"]')).toBeNull()
	})
})
