import brandLogo from '@rahrow/static/images/rahrow-logo-black.svg'
import QRCode from 'qrcode'

import { createQrTextPayload } from './qr-text-payload.ts'

const qrSize = 512
const brandedQrOptions = {
	margin: 4,
	width: qrSize,
	errorCorrectionLevel: 'H' as const,
}
const fallbackQrOptions = {
	margin: 4,
	width: qrSize,
	errorCorrectionLevel: 'M' as const,
}

function loadImage(source: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image()
		const timeout = window.setTimeout(
			() => reject(new Error('Timed out loading the QR brand mark')),
			3_000,
		)
		image.onload = () => {
			window.clearTimeout(timeout)
			resolve(image)
		}
		image.onerror = () => {
			window.clearTimeout(timeout)
			reject(new Error('Could not load the QR brand mark'))
		}
		image.src = source
	})
}

async function createBrandedQrDataUrl(value: string): Promise<string> {
	const canvas = document.createElement('canvas')
	await QRCode.toCanvas(canvas, value, brandedQrOptions)

	const context = canvas.getContext('2d')
	if (!context) throw new Error('QR image composition is unavailable')

	const logo = await loadImage(brandLogo)
	const badgeSize = qrSize / 8
	const logoSize = badgeSize * 0.8
	const badgeOffset = (qrSize - badgeSize) / 2
	const logoOffset = (qrSize - logoSize) / 2

	// The small white badge isolates the mark from modules while covering only
	// 1.6% of the symbol. Level-H correction provides ample recovery headroom.
	context.fillStyle = '#ffffff'
	context.fillRect(badgeOffset, badgeOffset, badgeSize, badgeSize)
	context.drawImage(logo, logoOffset, logoOffset, logoSize, logoSize)

	return canvas.toDataURL('image/png')
}

export async function createQrDataUrl(value: string): Promise<string> {
	const payload = createQrTextPayload(value)

	if (typeof document !== 'undefined' && typeof Image !== 'undefined') {
		try {
			return await createBrandedQrDataUrl(payload.value)
		} catch {
			// Branding is optional. Preserve the payload in an unmodified QR when a
			// webview cannot load or safely composite the SVG.
		}
	}

	return QRCode.toDataURL(payload.value, fallbackQrOptions)
}
