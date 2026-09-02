import { describe, expect, it } from 'vitest'

import { formatProfileCount } from './profile-count-copy.ts'

describe('formatProfileCount', () => {
	it('uses the singular label for exactly one imported profile', () => {
		expect(formatProfileCount(1)).toBe('Imported 1 profile')
	})

	it('uses the plural label for zero and multiple imported profiles', () => {
		expect(formatProfileCount(0)).toBe('Imported 0 profiles')
		expect(formatProfileCount(2)).toBe('Imported 2 profiles')
	})
})
