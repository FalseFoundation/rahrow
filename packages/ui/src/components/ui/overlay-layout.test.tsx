// @vitest-environment jsdom

import { act, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { Drawer } from './drawer.tsx'
import { OverlayLayoutProvider, useOverlayLayout } from './overlay-layout.tsx'

function LayoutProbe() {
	const layout = useOverlayLayout()

	useEffect(() => {
		document.body.dataset.drawerOpen = String(layout.drawerOpen)
	}, [layout])

	return null
}

describe('overlay layout', () => {
	let container: HTMLDivElement
	let root: Root

	beforeEach(() => {
		;(
			globalThis as typeof globalThis & {
				IS_REACT_ACT_ENVIRONMENT: boolean
			}
		).IS_REACT_ACT_ENVIRONMENT = true
		container = document.createElement('div')
		document.body.append(container)
		root = createRoot(container)
	})

	afterEach(() => {
		act(() => root.unmount())
		container.remove()
		delete document.body.dataset.drawerOpen
	})

	it('reports drawer presence through its public layout state', () => {
		act(() => {
			root.render(
				<OverlayLayoutProvider>
					<Drawer open={false} />
					<LayoutProbe />
				</OverlayLayoutProvider>,
			)
		})
		expect(document.body.dataset.drawerOpen).toBe('false')

		act(() => {
			root.render(
				<OverlayLayoutProvider>
					<Drawer open />
					<LayoutProbe />
				</OverlayLayoutProvider>,
			)
		})
		expect(document.body.dataset.drawerOpen).toBe('true')
	})

	it('keeps the drawer layout active until every stacked drawer closes', () => {
		const renderDrawers = (first: boolean, second: boolean) => {
			act(() => {
				root.render(
					<OverlayLayoutProvider>
						<Drawer open={first} />
						<Drawer open={second} />
						<LayoutProbe />
					</OverlayLayoutProvider>,
				)
			})
		}

		renderDrawers(true, true)
		expect(document.body.dataset.drawerOpen).toBe('true')

		renderDrawers(false, true)
		expect(document.body.dataset.drawerOpen).toBe('true')

		renderDrawers(false, false)
		expect(document.body.dataset.drawerOpen).toBe('false')
	})
})
