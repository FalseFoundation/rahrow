// @vitest-environment jsdom

import { Drawer } from '@rahrow/ui/components/ui/drawer.tsx'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
	APP_TOAST_TOP_EDGE,
	APP_TOAST_TOP_WITH_HEADER,
	AppOverlayPositioning,
} from './AppOverlayPositioning.tsx'

describe('AppOverlayPositioning', () => {
	let container: HTMLDivElement
	let root: Root

	beforeEach(() => {
		;(
			globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
		).IS_REACT_ACT_ENVIRONMENT = true
		container = document.createElement('div')
		document.body.append(container)
		root = createRoot(container)
	})

	afterEach(() => {
		act(() => root.unmount())
		container.remove()
	})

	it('publishes header-clearing and open-drawer offsets on the body', () => {
		const renderDrawers = (first: boolean, second: boolean) => {
			act(() => {
				root.render(
					<AppOverlayPositioning>
						<Drawer open={first} />
						<Drawer open={second} />
					</AppOverlayPositioning>,
				)
			})
		}

		renderDrawers(false, false)
		expect(document.body.hasAttribute('data-drawer-open')).toBe(false)
		expect(document.body.style.getPropertyValue('--app-toast-top')).toBe(
			APP_TOAST_TOP_WITH_HEADER,
		)

		renderDrawers(true, true)
		expect(document.body.getAttribute('data-drawer-open')).toBe('true')
		expect(document.body.style.getPropertyValue('--app-toast-top')).toBe(
			APP_TOAST_TOP_EDGE,
		)

		renderDrawers(false, true)
		expect(document.body.getAttribute('data-drawer-open')).toBe('true')

		renderDrawers(false, false)
		expect(document.body.hasAttribute('data-drawer-open')).toBe(false)
	})

	it('restores an existing host contract on unmount', () => {
		document.body.setAttribute('data-drawer-open', 'host')
		document.body.style.setProperty('--app-toast-top', 'host-offset')

		act(() => {
			root.render(<AppOverlayPositioning />)
		})
		act(() => root.unmount())

		expect(document.body.getAttribute('data-drawer-open')).toBe('host')
		expect(document.body.style.getPropertyValue('--app-toast-top')).toBe(
			'host-offset',
		)
		root = createRoot(container)
	})

	it('renders without reading browser globals during SSR', () => {
		expect(() => renderToString(<AppOverlayPositioning />)).not.toThrow()
	})
})
