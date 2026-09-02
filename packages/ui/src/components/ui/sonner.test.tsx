// @vitest-environment jsdom

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const sonner = vi.hoisted(() =>
	vi.fn((_props: Record<string, unknown>) => null),
)

vi.mock('sonner', () => ({ Toaster: sonner, toast: {} }))

import { ThemeProvider } from '../theme-provider.tsx'
import { Toaster } from './sonner.tsx'

describe('Toaster', () => {
	let container: HTMLDivElement
	let root: Root

	beforeEach(() => {
		sonner.mockClear()
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

	it('defaults to the top while remaining position and offset composable', () => {
		act(() =>
			root.render(
				<ThemeProvider>
					<Toaster />
				</ThemeProvider>,
			),
		)
		expect(sonner.mock.lastCall?.[0]).toMatchObject({
			position: 'top-center',
			offset: { top: 'calc(env(safe-area-inset-top, 0px) + 0.75rem)' },
		})

		act(() =>
			root.render(
				<ThemeProvider>
					<Toaster
						position='bottom-right'
						offset={{ bottom: '2rem', right: '3rem' }}
					/>
				</ThemeProvider>,
			),
		)
		expect(sonner.mock.lastCall?.[0]).toMatchObject({
			position: 'bottom-right',
			offset: { bottom: '2rem', right: '3rem' },
		})
	})
})
