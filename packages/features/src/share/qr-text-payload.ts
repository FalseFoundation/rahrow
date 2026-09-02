export interface QrTextPayload {
	readonly kind: 'qr-text'
	readonly value: string
}

export function createQrTextPayload(value: string): QrTextPayload {
	const text = value.trim()

	if (!text) {
		throw new Error('Missing profile text for QR export')
	}

	return {
		kind: 'qr-text',
		value: text,
	}
}
