import { describe, expect, it } from 'vitest'

import {
	qrPngFilename,
	shouldUseMultilineShareValue,
} from './share-drawer-model.ts'

describe('qrPngFilename', () => {
	it('normalizes unsafe download names and adds one png extension', () => {
		expect(qrPngFilename('../../My: subscription?.PNG')).toBe(
			'My- subscription.png',
		)
	})

	it('uses a stable fallback for empty or path-only names', () => {
		expect(qrPngFilename(' ... ')).toBe('rahrow-connection.png')
		expect(qrPngFilename()).toBe('rahrow-connection.png')
	})
})

describe('shouldUseMultilineShareValue', () => {
	it('uses a textarea for long or multiline content', () => {
		expect(shouldUseMultilineShareValue('short')).toBe(false)
		expect(shouldUseMultilineShareValue('first\nsecond')).toBe(true)
		expect(shouldUseMultilineShareValue('x'.repeat(101))).toBe(true)
	})
})
