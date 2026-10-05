import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import {
	PrimaryTabVisibilityProvider,
	usePrimaryTabVisible,
} from './primary-tab-visibility.tsx'

function VisibilityProbe() {
	const visible = usePrimaryTabVisible()
	return <span>{visible ? 'visible' : 'hidden'}</span>
}

describe('primary tab visibility', () => {
	it('defaults to visible outside a primary tab panel', () => {
		render(<VisibilityProbe />)
		expect(screen.getByText('visible')).toBeTruthy()
	})

	it('reports hidden when the owning primary tab is inactive', () => {
		render(
			<PrimaryTabVisibilityProvider active={false}>
				<VisibilityProbe />
			</PrimaryTabVisibilityProvider>,
		)
		expect(screen.getByText('hidden')).toBeTruthy()
	})
})
