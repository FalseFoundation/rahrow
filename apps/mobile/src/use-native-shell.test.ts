// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'

const minimizeApp = vi.hoisted(() => vi.fn())

vi.mock('@capacitor/app', () => ({
	App: { addListener: vi.fn(), minimizeApp },
}))
vi.mock('@capacitor/core', () => ({
	Capacitor: { getPlatform: vi.fn(), isNativePlatform: vi.fn() },
	SystemBars: { setStyle: vi.fn() },
	SystemBarsStyle: { Dark: 'DARK', Light: 'LIGHT' },
}))

import { handleAndroidBack, observeAppActivation } from './use-native-shell.ts'

describe('Android Back navigation', () => {
	beforeEach(() => minimizeApp.mockReset())

	it('uses browser history when the router has a previous entry', () => {
		const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})

		handleAndroidBack(true)

		expect(back).toHaveBeenCalledOnce()
		expect(minimizeApp).not.toHaveBeenCalled()
		back.mockRestore()
	})

	it('minimizes instead of terminating at the route root', () => {
		handleAndroidBack(false)

		expect(minimizeApp).toHaveBeenCalledOnce()
	})
})

describe('mobile background schedule recovery', () => {
	it('runs overdue work only when the app becomes active and removes its listener', async () => {
		const resume = vi.fn().mockResolvedValue(undefined)
		const remove = vi.fn().mockResolvedValue(undefined)
		let listener: ((state: { readonly isActive: boolean }) => void) | undefined
		const dispose = observeAppActivation(
			{ resume },
			{
				async addListener(_event, nextListener) {
					listener = nextListener
					return { remove }
				},
			},
		)
		await Promise.resolve()

		listener?.({ isActive: false })
		listener?.({ isActive: true })
		dispose()
		await Promise.resolve()

		expect(resume).toHaveBeenCalledOnce()
		expect(remove).toHaveBeenCalledOnce()
	})
})
