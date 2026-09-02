import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { AppHeaderSlot } from './AppHeaderSlot.tsx'
import { ProductHeader } from './ProductHeader.tsx'

describe('AppHeaderSlot', () => {
	it('composes route-owned header content before the scrolling body without remounting the route', async () => {
		const mounted = vi.fn()
		const user = userEvent.setup()

		function RenderedRoute() {
			useEffect(() => {
				mounted()
			}, [])

			return (
				<>
					<ProductHeader
						title='Connections'
						actions={<button type='button'>Add connection</button>}
					/>
					<div data-route-body>
						<button type='button'>First body action</button>
					</div>
				</>
			)
		}

		const { container } = render(
			<AppHeaderSlot className='shell-header'>
				<div data-app-scroll-body>
					<RenderedRoute />
				</div>
			</AppHeaderSlot>,
		)

		const slot = container.querySelector('[data-app-header-slot]')
		const scrollBody = container.querySelector('[data-app-scroll-body]')
		const routeBody = container.querySelector('[data-route-body]')
		if (!slot || !scrollBody) throw new Error('Expected composed shell regions')

		expect(slot.classList.contains('shell-header')).toBe(true)
		expect(
			slot.contains(screen.getByRole('heading', { name: 'Connections' })),
		).toBe(true)
		expect(scrollBody.contains(routeBody)).toBe(true)
		expect(
			slot.compareDocumentPosition(scrollBody) & Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy()
		expect(mounted).toHaveBeenCalledOnce()

		await user.tab()
		expect(document.activeElement).toBe(
			screen.getByRole('button', { name: 'Add connection' }),
		)
		await user.tab()
		expect(document.activeElement).toBe(
			screen.getByRole('button', { name: 'First body action' }),
		)
	})
})
