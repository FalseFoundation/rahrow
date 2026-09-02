import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { QrCameraPreview } from './QrCameraPreview.tsx'

let resize: (() => void) | undefined
let frames: FrameRequestCallback[]

function flushFrames() {
	const queued = frames
	frames = []
	for (const callback of queued) callback(performance.now())
}

describe('QrCameraPreview', () => {
	beforeEach(() => {
		frames = []
		resize = undefined
		vi.stubGlobal(
			'ResizeObserver',
			class {
				constructor(callback: () => void) {
					resize = callback
				}
				observe() {}
				disconnect() {}
			},
		)
		vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
			frames.push(callback)
			return frames.length
		})
		vi.stubGlobal('cancelAnimationFrame', vi.fn())
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
			bottom: 260,
			height: 240,
			left: 10,
			right: 250,
			top: 20,
			width: 240,
			x: 10,
			y: 20,
			toJSON: () => ({}),
		})
	})
	afterEach(() => {
		cleanup()
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
	})

	it('mounts and updates the native preview only while active', async () => {
		const camera = {
			startPreview: vi.fn().mockResolvedValue(undefined),
			stopPreview: vi.fn().mockResolvedValue(undefined),
		}
		const { rerender } = render(
			<QrCameraPreview camera={camera} active={false} />,
		)
		expect(camera.startPreview).not.toHaveBeenCalled()

		rerender(<QrCameraPreview camera={camera} active />)
		act(flushFrames)
		await waitFor(() => expect(camera.startPreview).toHaveBeenCalledOnce())

		rerender(<QrCameraPreview camera={camera} active={false} />)
		await waitFor(() => expect(camera.stopPreview).toHaveBeenCalledOnce())
	})

	it('coalesces resize, scroll, and observer geometry work into one update', async () => {
		const camera = {
			startPreview: vi.fn().mockResolvedValue(undefined),
			stopPreview: vi.fn().mockResolvedValue(undefined),
		}
		render(<QrCameraPreview camera={camera} active />)
		act(flushFrames)
		await waitFor(() => expect(camera.startPreview).toHaveBeenCalledOnce())

		act(() => {
			resize?.()
			window.dispatchEvent(new Event('resize'))
			window.dispatchEvent(new Event('scroll'))
		})
		act(flushFrames)
		await waitFor(() => expect(camera.startPreview).toHaveBeenCalledTimes(2))
	})

	it('shows camera permission failure with retry and platform settings guidance', async () => {
		const camera = {
			startPreview: vi
				.fn()
				.mockRejectedValueOnce(new Error('Camera permission denied'))
				.mockResolvedValueOnce(undefined),
			stopPreview: vi.fn().mockResolvedValue(undefined),
			openSettings: vi.fn().mockResolvedValue(undefined),
		}
		const user = userEvent.setup()
		render(<QrCameraPreview camera={camera} active />)
		act(flushFrames)

		const alert = await screen.findByRole('alert')
		expect(alert.textContent).toContain('Camera preview is unavailable')
		expect(alert.textContent).not.toContain('Camera permission denied')
		expect(screen.queryByRole('img')).toBeNull()
		expect(alert.textContent).not.toContain('Try camera again')
		expect(screen.getByText('Allow camera access, then try again.')).toBeTruthy()
		await user.click(screen.getByRole('button', { name: 'Open camera settings' }))
		expect(camera.openSettings).toHaveBeenCalledOnce()
		await user.click(screen.getByRole('button', { name: 'Try camera again' }))
		act(flushFrames)
		await waitFor(() => expect(camera.startPreview).toHaveBeenCalledTimes(2))
	})
})
