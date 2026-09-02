import { describe, expect, it } from 'vitest'
import {
	defaultConnectionsView,
	isConnectionGroupOpen,
	pruneConnectionGroups,
	restoredConnectionsView,
	STANDALONE_CONNECTION_GROUP,
	setConnectionGroupOpen,
	setConnectionsQuery,
	setConnectionsSort,
	setConnectionsViewport,
	subscriptionConnectionGroup,
} from './connections-view-state.ts'

describe('Connections view state', () => {
	it('defaults new aggregate identities open and updates groups independently', () => {
		const first = subscriptionConnectionGroup('first')
		const second = subscriptionConnectionGroup('second')
		let view = defaultConnectionsView()

		expect(isConnectionGroupOpen(view, first)).toBe(true)
		view = setConnectionGroupOpen(view, first, false)
		expect(isConnectionGroupOpen(view, first)).toBe(false)
		expect(isConnectionGroupOpen(view, second)).toBe(true)
	})

	it('retains a bounded main-scroll viewport snapshot', () => {
		const view = setConnectionsViewport(defaultConnectionsView(), {
			scrollOffset: 640.5,
			loadedProfileCount: 750.9,
		})

		expect(view).toMatchObject({
			scrollOffset: 640.5,
			loadedProfileCount: 750,
		})
	})

	it('prunes removed aggregate keys without resetting query or sort', () => {
		const retained = subscriptionConnectionGroup('retained')
		const removed = subscriptionConnectionGroup('removed')
		let view = defaultConnectionsView()
		view = setConnectionGroupOpen(view, STANDALONE_CONNECTION_GROUP, false)
		view = setConnectionGroupOpen(view, retained, false)
		view = setConnectionGroupOpen(view, removed, false)
		view = setConnectionsQuery(view, 'reality')
		view = setConnectionsSort(view, 'speed-test')

		const pruned = pruneConnectionGroups(
			view,
			new Set([STANDALONE_CONNECTION_GROUP, retained]),
		)

		expect(pruned.groupOpen).toEqual({
			[STANDALONE_CONNECTION_GROUP]: false,
			[retained]: false,
		})
		expect(pruned.query).toBe('reality')
		expect(pruned.sort).toBe('speed-test')
	})

	it('removes recovery metadata before a repaired value is persisted', () => {
		expect(
			restoredConnectionsView({
				...defaultConnectionsView(),
				recoveredFromInvalid: true,
			}),
		).toEqual(defaultConnectionsView())
	})
})
