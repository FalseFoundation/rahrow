import { describe, expect, it } from 'vitest'

import { nestedRouteParent, primaryPathFor } from './navigation-model.ts'

describe('app navigation model', () => {
	it('maps nested screens to an explicit back destination', () => {
		expect(nestedRouteParent('/subscriptions')).toBe('/profiles')
		expect(nestedRouteParent('/import')).toBe('/profiles')
		expect(nestedRouteParent('/settings')).toBeUndefined()
	})

	it('keeps the owning primary destination active', () => {
		expect(primaryPathFor('/')).toBe('/')
		expect(primaryPathFor('/subscriptions')).toBe('/profiles')
	})
})
