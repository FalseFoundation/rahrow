import { describe, expect, it } from 'vitest'

import { deriveSubscriptionId } from './subscription-actions-model.ts'

describe('deriveSubscriptionId', () => {
	it('prefers a readable name and resolves collisions deterministically', () => {
		expect(
			deriveSubscriptionId({
				name: 'My Main Source',
				url: 'https://example.com/sub.txt',
				existingIds: ['my-main-source'],
			}),
		).toBe('my-main-source-2')
	})

	it('derives an identifier from the URL when no name is provided', () => {
		expect(
			deriveSubscriptionId({
				name: '',
				url: 'https://www.example.com/providers/home.txt',
				existingIds: [],
			}),
		).toBe('example-com-home')
	})
})
