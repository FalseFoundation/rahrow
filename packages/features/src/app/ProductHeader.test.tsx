import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProductHeader } from './ProductHeader.tsx'

describe('ProductHeader', () => {
	it('provides the screen heading while preserving leading and action content', () => {
		render(
			<ProductHeader
				title='Connections'
				leading={<span>Brand</span>}
				actions={<button type='button'>Add connection</button>}
			/>,
		)

		expect(screen.getByRole('heading', { level: 1, name: 'Connections' })).toBeTruthy()
		expect(screen.getByText('Brand')).toBeTruthy()
		expect(screen.getByRole('button', { name: 'Add connection' })).toBeTruthy()
	})
})
