// @vitest-environment jsdom

import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Import } from './Import.tsx'

const harness = vi.hoisted(() => ({
	addFromUrl: vi.fn().mockResolvedValue(undefined),
	clipboardSupported: true,
	drawerProps: vi.fn(),
	setValue: vi.fn(),
}))

vi.mock('../app/runtime.tsx', () => ({
	useAppRuntime: () => ({
		capabilities: {
			clipboard: {
				supported: harness.clipboardSupported,
				read: vi.fn().mockResolvedValue('vless://clipboard'),
			},
		},
		engine: { manifest: { supportedProtocols: ['vless'] } },
		profileStore: { save: vi.fn().mockResolvedValue(undefined) },
	}),
}))

vi.mock('../subscriptions/useSubscriptions.ts', () => ({
	useSubscriptions: () => ({
		state: { message: 'Subscriptions ready' },
		actions: { addFromUrl: harness.addFromUrl },
	}),
}))

vi.mock('./useImport.ts', () => ({
	useImport: () => ({
		state: { message: 'Ready', value: 'https://example.com/subscription' },
		actions: {
			decodeQr: vi.fn(),
			importPasted: vi.fn().mockResolvedValue(undefined),
			setValue: harness.setValue,
		},
	}),
}))

vi.mock('./ConnectionImportDrawer.tsx', async () => {
	const React = await import('react')
	return {
		ConnectionImportDrawer: (props: { onImportUrl: () => Promise<void> }) => {
			harness.drawerProps(props)
			return React.createElement(
				'button',
				{ onClick: () => void props.onImportUrl() },
				'Continue with canonical connection creator',
			)
		},
	}
})

describe('Import route compatibility', () => {
	afterEach(() => {
		harness.clipboardSupported = true
		cleanup()
	})

	it('omits paste when the platform reports clipboard support unavailable', () => {
		harness.clipboardSupported = false

		render(<Import />)

		expect(harness.drawerProps.mock.lastCall?.[0].onPaste).toBeUndefined()
	})

	it('composes the canonical connection creator and preserves URL acquisition', async () => {
		render(<Import />)

		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
		expect(
			screen.getByRole('heading', { level: 1, name: 'Add connection' }),
		).toBeTruthy()
		expect(harness.drawerProps).toHaveBeenCalledOnce()
		fireEvent.click(
			screen.getByRole('button', {
				name: 'Continue with canonical connection creator',
			}),
		)

		await waitFor(() =>
			expect(harness.addFromUrl).toHaveBeenCalledWith(
				'https://example.com/subscription',
			),
		)
	})
})
