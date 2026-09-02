import QRCode from 'qrcode'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { createQrDataUrl } from './qr-image.ts'

describe('createQrDataUrl', () => {
	afterEach(() => {
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
	})

	it('encodes a profile URL as a scannable PNG data URL', async () => {
		vi.stubGlobal('document', undefined)
		const dataUrl = await createQrDataUrl('vless://example.com:443')

		expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true)
		expect(dataUrl.length).toBeGreaterThan(100)
	})

	it('adds the official SVG over a high-correction QR without changing its payload', async () => {
		const context = {
			drawImage: vi.fn(),
			fillRect: vi.fn(),
			fillStyle: '',
		}
		const canvas = {
			getContext: vi.fn(() => context),
			toDataURL: vi.fn(() => 'data:image/png;base64,branded'),
		}
		vi
			.spyOn(document, 'createElement')
			.mockReturnValue(canvas as unknown as HTMLCanvasElement)
		vi.spyOn(QRCode, 'toCanvas').mockResolvedValue(undefined)
		vi.stubGlobal(
			'Image',
			class {
				onload: (() => void) | null = null

				set src(_value: string) {
					queueMicrotask(() => this.onload?.())
				}
			},
		)

		const payload = 'vless://example.com:443?security=tls#RahRow'
		const dataUrl = await createQrDataUrl(payload)

		expect(QRCode.toCanvas).toHaveBeenCalledWith(
			canvas,
			payload,
			expect.objectContaining({
				errorCorrectionLevel: 'H',
				margin: 4,
				width: 512,
			}),
		)
		expect(context.fillRect).toHaveBeenCalledWith(224, 224, 64, 64)
		expect(context.drawImage).toHaveBeenCalledWith(
			expect.anything(),
			230.4,
			230.4,
			51.2,
			51.2,
		)
		expect(dataUrl).toBe('data:image/png;base64,branded')
	})

	it('falls back to an unbranded QR when SVG composition is unavailable', async () => {
		const canvas = {
			getContext: vi.fn(() => null),
		}
		vi
			.spyOn(document, 'createElement')
			.mockReturnValue(canvas as unknown as HTMLCanvasElement)
		vi.spyOn(QRCode, 'toCanvas').mockResolvedValue(undefined)
		const toDataURL = vi.spyOn(QRCode, 'toDataURL')

		const payload = 'trojan://secret@example.com:443'
		const dataUrl = await createQrDataUrl(payload)

		expect(toDataURL).toHaveBeenCalledWith(
			payload,
			expect.objectContaining({
				errorCorrectionLevel: 'M',
				margin: 4,
				width: 512,
			}),
		)
		expect(dataUrl.startsWith('data:image/png;base64,')).toBe(true)
	})

	it('rejects empty profile text', async () => {
		await expect(createQrDataUrl('   ')).rejects.toThrow(
			'Missing profile text for QR export',
		)
	})
})
