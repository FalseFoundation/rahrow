// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import type { RefObject } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePullToRefresh } from './usePullToRefresh.ts'

function pointerEvent(
	type: string,
	input: { clientY: number; pointerId?: number; pointerType?: string },
) {
	const event = new Event(type, { bubbles: true, cancelable: true })
	Object.defineProperties(event, {
		clientY: { value: input.clientY },
		pointerId: { value: input.pointerId ?? 1 },
		pointerType: { value: input.pointerType ?? 'pen' },
	})
	return event
}

function touchEvent(type: string, clientY?: number) {
	const event = new Event(type, { bubbles: true, cancelable: true })
	const touches = clientY === undefined ? [] : [{ clientY }]
	Object.defineProperties(event, {
		touches: { value: touches },
		changedTouches: { value: touches },
	})
	return event
}

describe('usePullToRefresh', () => {
	let frames: FrameRequestCallback[]
	let viewport: HTMLDivElement
	let viewportRef: RefObject<HTMLDivElement | null>

	beforeEach(() => {
		frames = []
		viewport = document.createElement('div')
		viewportRef = { current: viewport }
		vi.stubGlobal(
			'requestAnimationFrame',
			vi.fn((callback: FrameRequestCallback) => {
				frames.push(callback)
				return frames.length
			}),
		)
		vi.stubGlobal('cancelAnimationFrame', vi.fn())
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('coalesces pointer-move visual updates into one animation frame', () => {
		const { result } = renderHook(() =>
			usePullToRefresh(viewportRef, vi.fn().mockResolvedValue(undefined)),
		)

		act(() => {
			viewport.dispatchEvent(pointerEvent('pointerdown', { clientY: 0 }))
			viewport.dispatchEvent(pointerEvent('pointermove', { clientY: 40 }))
			viewport.dispatchEvent(pointerEvent('pointermove', { clientY: 100 }))
		})

		expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
		expect(result.current.distance).toBe(0)

		act(() => frames.shift()?.(16))

		expect(result.current.distance).toBe(48)
		expect(result.current.armed).toBe(false)
	})

	it('refreshes after the threshold and restores the resting state', async () => {
		let finishRefresh: (() => void) | undefined
		const onRefresh = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					finishRefresh = resolve
				}),
		)
		const { result } = renderHook(() => usePullToRefresh(viewportRef, onRefresh))

		act(() => {
			viewport.dispatchEvent(pointerEvent('pointerdown', { clientY: 0 }))
			viewport.dispatchEvent(pointerEvent('pointermove', { clientY: 150 }))
			frames.shift()?.(16)
		})
		expect(result.current.armed).toBe(true)

		act(() => {
			viewport.dispatchEvent(pointerEvent('pointerup', { clientY: 150 }))
		})
		expect(onRefresh).toHaveBeenCalledOnce()
		expect(result.current).toMatchObject({ distance: 44, refreshing: true })

		await act(async () => finishRefresh?.())

		expect(result.current).toMatchObject({
			distance: 0,
			refreshing: false,
			armed: false,
		})
	})

	it('refreshes from touch events when browser panning cancels pointer tracking', () => {
		const onRefresh = vi.fn().mockResolvedValue(undefined)
		const { result } = renderHook(() => usePullToRefresh(viewportRef, onRefresh))

		act(() => {
			viewport.dispatchEvent(touchEvent('touchstart', 20))
			viewport.dispatchEvent(touchEvent('touchmove', 170))
			frames.shift()?.(16)
		})

		expect(result.current.armed).toBe(true)

		act(() => {
			viewport.dispatchEvent(touchEvent('touchend'))
		})

		expect(onRefresh).toHaveBeenCalledOnce()
	})

	it('cancels pending visual work when the gesture is reset or unmounted', () => {
		const { unmount } = renderHook(() =>
			usePullToRefresh(viewportRef, vi.fn().mockResolvedValue(undefined)),
		)

		act(() => {
			viewport.dispatchEvent(pointerEvent('pointerdown', { clientY: 0 }))
			viewport.dispatchEvent(pointerEvent('pointermove', { clientY: 80 }))
			viewport.dispatchEvent(pointerEvent('pointercancel', { clientY: 80 }))
		})
		const resetCancellationCount =
			vi.mocked(cancelAnimationFrame).mock.calls.length
		expect(resetCancellationCount).toBeGreaterThanOrEqual(1)

		act(() => {
			viewport.dispatchEvent(pointerEvent('pointerdown', { clientY: 0 }))
			viewport.dispatchEvent(pointerEvent('pointermove', { clientY: 80 }))
		})
		unmount()

		expect(cancelAnimationFrame).toHaveBeenCalledTimes(resetCancellationCount + 1)
	})
})
