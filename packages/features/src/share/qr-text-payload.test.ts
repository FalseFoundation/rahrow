import { describe, expect, it } from 'vitest'

import { createQrTextPayload } from './qr-text-payload.ts'

describe('createQrTextPayload', () => {
	it('normalizes QR profile text before handoff', () => {
		expect(createQrTextPayload(' vless://profile ')).toEqual({
			kind: 'qr-text',
			value: 'vless://profile',
		})
	})

	it('rejects empty profile text', () => {
		expect(() => createQrTextPayload('   ')).toThrow(
			'Missing profile text for QR export',
		)
	})
})
