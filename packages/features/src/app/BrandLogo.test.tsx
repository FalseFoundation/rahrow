import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { BrandLogo } from './BrandLogo.tsx'

describe('BrandLogo', () => {
	it('renders the official light and dark RahRow assets as one accessible image', () => {
		const { container } = render(<BrandLogo />)

		expect(screen.getByRole('img', { name: 'RahRow' })).toBeTruthy()
		expect(container.querySelectorAll('img')).toHaveLength(2)
		expect(container.innerHTML).toContain('rahrow-logo-black.svg')
		expect(container.innerHTML).toContain('rahrow-logo-white.svg')
	})
})
