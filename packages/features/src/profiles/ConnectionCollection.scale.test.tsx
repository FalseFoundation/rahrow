// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { AppScrollProvider } from '../app/app-scroll-context.tsx'
import { PrimaryTabVisibilityProvider } from '../app/primary-tab-visibility.tsx'
import { ConnectionCollection } from './ConnectionCollection.tsx'
import { createProfileScaleFixture } from './profile-scale-fixtures.ts'

function renderLargeSubscription(options?: {
	readonly count?: number
	readonly open?: boolean
	readonly viewportHeight?: number
	readonly unboundedViewport?: boolean
}) {
	const count = options?.count ?? 1_750
	const open = options?.open ?? true
	const viewport = document.createElement('div')
	const viewportHeight = options?.viewportHeight ?? 640
	Object.defineProperty(viewport, 'clientHeight', {
		configurable: true,
		get: () => viewportHeight,
	})
	Object.defineProperty(viewport, 'offsetHeight', {
		configurable: true,
		get: () =>
			options?.unboundedViewport ? viewport.scrollHeight || viewportHeight : viewportHeight,
	})
	Object.defineProperty(viewport, 'scrollTop', {
		configurable: true,
		writable: true,
		value: 0,
	})
	viewport.getBoundingClientRect = () =>
		({
			x: 0,
			y: 0,
			top: 0,
			left: 0,
			right: 390,
			bottom: viewportHeight,
			width: 390,
			height: viewportHeight,
			toJSON() {
				return this
			},
		}) as DOMRect

	const viewportRef = { current: viewport }
	const profiles = createProfileScaleFixture(count).map((profile) => ({
		...profile,
		metadata: {
			...profile.metadata,
			source: 'subscription' as const,
			subscriptionId: 'all-sub',
		},
	}))

	const view = render(
		<AppScrollProvider viewportRef={viewportRef}>
			<PrimaryTabVisibilityProvider active>
				<div data-testid='scroll-host'>
					<ConnectionCollection
						groups={[
							{
								key: 'subscription:all-sub',
								open,
								title: 'all_sub',
								detail: `${count} profiles`,
								kind: 'subscription',
								profiles,
								onOpenChange: vi.fn(),
								onActions: vi.fn(),
							},
						]}
						selectedId=''
						onActivate={vi.fn()}
						onProfileActions={vi.fn()}
						speedTests={{}}
						onViewportChange={vi.fn()}
					/>
				</div>
			</PrimaryTabVisibilityProvider>
		</AppScrollProvider>,
	)

	return { view, viewport, count, profiles }
}

describe('ConnectionCollection large subscription scale', () => {
	beforeAll(() => {
		vi.stubGlobal(
			'ResizeObserver',
			class {
				observe() {}
				disconnect() {}
				unobserve() {}
			},
		)
	})

	afterEach(() => {
		cleanup()
	})

	it('keeps DOM bounded when a ~1.7k subscription group is open', async () => {
		const { count } = renderLargeSubscription({ count: 1_750, open: true })

		await waitFor(() => {
			expect(screen.getByText('all_sub')).toBeTruthy()
		})

		const profileRows = document.querySelectorAll('[data-profile-id]')
		expect(profileRows.length).toBeGreaterThan(0)
		expect(profileRows.length).toBeLessThan(48)
		expect(profileRows.length).toBeLessThan(count / 10)
		expect(screen.getByText('Loading more connections…')).toBeTruthy()
	})

	it('does not mount profile rows while the large subscription stays collapsed', () => {
		renderLargeSubscription({ count: 1_750, open: false })

		expect(screen.getByText('all_sub')).toBeTruthy()
		expect(document.querySelectorAll('[data-profile-id]')).toHaveLength(0)
	})

	it('bounds DOM after expanding a collapsed large subscription', async () => {
		const count = 1_750
		const onOpenChange = vi.fn()
		const viewport = document.createElement('div')
		Object.defineProperty(viewport, 'clientHeight', {
			configurable: true,
			get: () => 640,
		})
		Object.defineProperty(viewport, 'offsetHeight', {
			configurable: true,
			get: () => 640,
		})
		Object.defineProperty(viewport, 'scrollTop', {
			configurable: true,
			writable: true,
			value: 0,
		})
		viewport.getBoundingClientRect = () =>
			({
				x: 0,
				y: 0,
				top: 0,
				left: 0,
				right: 390,
				bottom: 640,
				width: 390,
				height: 640,
				toJSON() {
					return this
				},
			}) as DOMRect

		const profiles = createProfileScaleFixture(count)
		const viewportRef = { current: viewport }
		const { rerender } = render(
			<AppScrollProvider viewportRef={viewportRef}>
				<PrimaryTabVisibilityProvider active>
					<ConnectionCollection
						groups={[
							{
								key: 'subscription:all-sub',
								open: false,
								title: 'all_sub',
								detail: `${count} profiles`,
								kind: 'subscription',
								profiles,
								onOpenChange,
								onActions: vi.fn(),
							},
						]}
						selectedId=''
						onActivate={vi.fn()}
						onProfileActions={vi.fn()}
						speedTests={{}}
						onViewportChange={vi.fn()}
					/>
				</PrimaryTabVisibilityProvider>
			</AppScrollProvider>,
		)

		expect(document.querySelectorAll('[data-profile-id]')).toHaveLength(0)

		rerender(
			<AppScrollProvider viewportRef={viewportRef}>
				<PrimaryTabVisibilityProvider active>
					<ConnectionCollection
						groups={[
							{
								key: 'subscription:all-sub',
								open: true,
								title: 'all_sub',
								detail: `${count} profiles`,
								kind: 'subscription',
								profiles,
								onOpenChange,
								onActions: vi.fn(),
							},
						]}
						selectedId=''
						onActivate={vi.fn()}
						onProfileActions={vi.fn()}
						speedTests={{}}
						onViewportChange={vi.fn()}
					/>
				</PrimaryTabVisibilityProvider>
			</AppScrollProvider>,
		)

		await waitFor(() => {
			expect(document.querySelectorAll('[data-profile-id]').length).toBeGreaterThan(
				0,
			)
		})
		expect(document.querySelectorAll('[data-profile-id]').length).toBeLessThan(48)
	})

	it('still bounds DOM when the scroll viewport reports an unbounded height', async () => {
		renderLargeSubscription({
			count: 1_750,
			open: true,
			unboundedViewport: true,
		})

		await waitFor(() => {
			expect(screen.getByText('all_sub')).toBeTruthy()
		})

		const profileRows = document.querySelectorAll('[data-profile-id]')
		expect(profileRows.length).toBeGreaterThan(0)
		expect(profileRows.length).toBeLessThan(48)
	})
})
