// @vitest-environment jsdom

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { ConnectionCollection } from './ConnectionCollection.tsx'
import { createProfileScaleFixture } from './profile-scale-fixtures.ts'

const harness = vi.hoisted(() => ({
	viewport: null as HTMLDivElement | null,
	options: [] as Array<{
		count: number
		estimateSize: (index: number) => number
		getItemKey: (index: number) => string | number
		initialOffset: () => number
		overscan: number
		scrollMargin: number
		useFlushSync: boolean
	}>,
	measureElement: vi.fn(),
	takeSnapshot: vi.fn(() => []),
	virtualIndexes: null as readonly number[] | null,
}))

vi.mock('../app/app-scroll-context.tsx', () => ({
	useAppScrollViewport: () => ({ current: harness.viewport }),
}))

vi.mock('@tanstack/react-pacer', () => ({
	useThrottledCallback: (callback: (...args: never[]) => unknown) => callback,
}))

vi.mock('@tanstack/react-virtual', () => ({
	defaultRangeExtractor: ({
		startIndex,
		endIndex,
	}: {
		startIndex: number
		endIndex: number
	}) =>
		Array.from(
			{ length: endIndex - startIndex + 1 },
			(_, offset) => startIndex + offset,
		),
	useVirtualizer: (options: (typeof harness.options)[number]) => {
		harness.options.push(options)
		return {
			getTotalSize: () =>
				Array.from({ length: options.count }, (_, index) =>
					options.estimateSize(index),
				).reduce((total, size) => total + size, 0),
			getVirtualItems: () =>
				(
					harness.virtualIndexes ??
					Array.from({ length: Math.min(options.count, 12) }, (_, index) => index)
				).map((index) => ({
					index,
					key: options.getItemKey(index),
					size: options.estimateSize(index),
					start: options.scrollMargin + index * 60,
				})),
			measureElement: harness.measureElement,
			takeSnapshot: harness.takeSnapshot,
		}
	},
}))

describe('ConnectionCollection virtualization contract', () => {
	beforeAll(() => {
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe() {}
				disconnect() {}
			},
		)
	})

	afterEach(() => {
		cleanup()
		harness.options.length = 0
		harness.measureElement.mockClear()
		harness.takeSnapshot.mockClear()
		harness.virtualIndexes = null
		harness.viewport = null
	})

	it.each([100, 1_000, 10_000])(
		'bounds the main-scroll DOM for %i profiles and keeps stable keys',
		(count) => {
			harness.viewport = document.createElement('div')
			const profiles = createProfileScaleFixture(count)
			render(
				<ConnectionCollection
					groups={[
						{
							key: 'subscription:scale',
							open: true,
							title: 'Scale provider',
							detail: `${count} profiles`,
							profiles,
							onOpenChange: vi.fn(),
							onActions: vi.fn(),
						},
					]}
					selectedId='fixture-00000'
					onActivate={vi.fn()}
					onProfileActions={vi.fn()}
					speedTests={{}}
					onViewportChange={vi.fn()}
				/>,
			)

			const options = harness.options.at(-1)
			const expectedLoaded = Math.min(count, 250)
			expect(options).toMatchObject({
				count: expectedLoaded + 1,
				overscan: 6,
				useFlushSync: false,
			})
			expect(options?.getItemKey(0)).toBe('group:subscription:scale')
			expect(options?.getItemKey(1)).toBe(
				'profile:subscription:scale:fixture-00000',
			)
			expect(screen.getAllByRole('listitem').length).toBeLessThanOrEqual(12)
			expect(
				document.querySelector('[data-slot="scroll-area-viewport"]'),
			).toBeNull()
		},
	)

	it('restores the persisted main-scroll offset without a nested viewport', () => {
		harness.viewport = document.createElement('div')
		render(
			<ConnectionCollection
				groups={[
					{
						key: 'subscription:restored',
						open: true,
						title: 'Restored provider',
						detail: '100 profiles',
						profiles: createProfileScaleFixture(100),
						onOpenChange: vi.fn(),
						onActions: vi.fn(),
					},
				]}
				selectedId=''
				onActivate={vi.fn()}
				onProfileActions={vi.fn()}
				speedTests={{}}
				persistedScrollOffset={777}
				onViewportChange={vi.fn()}
			/>,
		)

		expect(harness.options.at(-1)?.initialOffset()).toBe(777)
	})

	it('preserves measured spacing for every large subscription group', () => {
		harness.viewport = document.createElement('div')
		harness.virtualIndexes = [0, 1, 250, 251, 252, 253]
		render(
			<ConnectionCollection
				groups={['alpha', 'beta'].map((key) => ({
					key,
					open: true,
					title: key,
					detail: '400 profiles',
					profiles: createProfileScaleFixture(400).map((profile) => ({
						...profile,
						id: `${key}:${profile.id}`,
					})),
					onOpenChange: vi.fn(),
					onActions: vi.fn(),
				}))}
				selectedId=''
				onActivate={vi.fn()}
				onProfileActions={vi.fn()}
				speedTests={{}}
				onViewportChange={vi.fn()}
			/>,
		)

		expect(harness.options.at(-1)?.count).toBe(503)
		const groupRows = document.querySelectorAll(
			'[data-index="0"], [data-index="252"]',
		)
		expect(groupRows).toHaveLength(2)
		expect(document.querySelector('[aria-hidden="true"]')).toBeTruthy()
		expect(
			document
				.querySelector('[data-index="1"]')
				?.hasAttribute('data-first-profile'),
		).toBe(true)
		expect(
			document
				.querySelector('[data-index="253"]')
				?.hasAttribute('data-first-profile'),
		).toBe(true)
	})
})
