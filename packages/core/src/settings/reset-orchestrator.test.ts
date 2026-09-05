import { describe, expect, it } from 'vitest'
import type { ConnectionProfile } from '../profile/connection-profile.ts'
import type { Settings, SettingsStore } from '../storage/json-store.ts'
import type { Subscription } from '../subscription/subscription.ts'

import {
	type ResetCollectionStore,
	ResetOrchestrator,
} from './reset-orchestrator.ts'

const profile: ConnectionProfile = {
	id: 'profile-1',
	protocol: 'trojan',
	endpoint: { host: 'example.com', port: 443 },
	authentication: { password: 'secret' },
}

const subscription: Subscription = {
	id: 'subscription-1',
	url: 'https://example.com/subscription',
}

class MemorySettings implements SettingsStore {
	constructor(public value: Settings) {}
	failNextWrite = false

	async read() {
		return this.value
	}

	async write(value: Settings) {
		if (this.failNextWrite) {
			this.failNextWrite = false
			throw new Error('settings write failed')
		}
		this.value = value
	}
}

class MemoryCollection<T> implements ResetCollectionStore<T> {
	constructor(public values: readonly T[]) {}
	failNextReplace = false

	async list() {
		return this.values
	}

	async replaceAll(values: readonly T[]) {
		if (this.failNextReplace) {
			this.failNextReplace = false
			throw new Error('collection write failed')
		}
		this.values = values
	}
}

function createFixture() {
	const settings = new MemorySettings({
		activeProfileId: profile.id,
		connectionMode: 'proxy',
		engineId: 'xray',
		language: 'fa',
		localPort: 12080,
		routingMode: 'rule',
		theme: 'dark',
	})
	const profiles = new MemoryCollection([profile])
	const subscriptions = new MemoryCollection([subscription])
	const events: string[] = []
	let credentialCount = 2
	const reset = new ResetOrchestrator({
		settings,
		profiles,
		subscriptions,
		async disconnectAndCleanup() {
			events.push('native-cleanup')
		},
		credentials: {
			async clear() {
				events.push('credentials')
				credentialCount = 0
			},
		},
		clearTransientState() {
			events.push('transient')
		},
	})

	return {
		settings,
		profiles,
		subscriptions,
		events,
		reset,
		credentialCount: () => credentialCount,
	}
}

describe('ResetOrchestrator', () => {
	it('resets tunnel configuration after native cleanup and retains user data and preferences', async () => {
		const fixture = createFixture()

		const result = await fixture.reset.reset('tunnel-configuration')

		expect(result.status).toBe('completed')
		expect(fixture.events).toEqual(['native-cleanup'])
		expect(fixture.settings.value).toEqual({
			activeProfileId: profile.id,
			engineId: 'xray',
			language: 'fa',
			theme: 'dark',
			connectionMode: 'vpn',
		})
		expect(fixture.profiles.values).toEqual([profile])
		expect(fixture.subscriptions.values).toEqual([subscription])
		expect(fixture.credentialCount()).toBe(2)
	})

	it('resets settings without removing connections, subscriptions, or credentials', async () => {
		const fixture = createFixture()

		const result = await fixture.reset.reset('settings')

		expect(result.status).toBe('completed')
		expect(fixture.settings.value).toEqual({ connectionMode: 'vpn' })
		expect(fixture.profiles.values).toEqual([profile])
		expect(fixture.subscriptions.values).toEqual([subscription])
		expect(fixture.credentialCount()).toBe(2)
		expect(fixture.events).toEqual(['transient'])
	})

	it('clears app data, credentials, logs, and native state in a deterministic order', async () => {
		const fixture = createFixture()

		const result = await fixture.reset.reset('app-data')

		expect(result).toMatchObject({ status: 'completed', scope: 'app-data' })
		expect(fixture.settings.value).toEqual({ connectionMode: 'vpn' })
		expect(fixture.profiles.values).toEqual([])
		expect(fixture.subscriptions.values).toEqual([])
		expect(fixture.credentialCount()).toBe(0)
		expect(fixture.events).toEqual(['native-cleanup', 'transient', 'credentials'])
	})

	it('rolls recoverable stores back and leaves credentials intact when a write fails', async () => {
		const fixture = createFixture()
		fixture.subscriptions.failNextReplace = true

		const result = await fixture.reset.reset('app-data')

		expect(result).toMatchObject({
			status: 'failed',
			failedStep: 'clear-subscriptions',
			rolledBack: true,
		})
		expect(fixture.settings.value.theme).toBe('dark')
		expect(fixture.profiles.values).toEqual([profile])
		expect(fixture.subscriptions.values).toEqual([subscription])
		expect(fixture.credentialCount()).toBe(2)
	})

	it('reports partial cleanup when credential deletion cannot be rolled back', async () => {
		const fixture = createFixture()
		const reset = new ResetOrchestrator({
			settings: fixture.settings,
			profiles: fixture.profiles,
			subscriptions: fixture.subscriptions,
			disconnectAndCleanup: async () => undefined,
			credentials: {
				async clear() {
					throw new Error('secure storage unavailable')
				},
			},
		})

		const result = await reset.reset('app-data')

		expect(result).toMatchObject({
			status: 'partial',
			failedStep: 'clear-credentials',
			rolledBack: true,
		})
		expect(result.recovery).toContain('secure credential')
		expect(fixture.settings.value.theme).toBe('dark')
		expect(fixture.profiles.values).toEqual([profile])
		expect(fixture.subscriptions.values).toEqual([subscription])
	})

	it('serializes simultaneous reset requests', async () => {
		const fixture = createFixture()
		let releaseCleanup = () => undefined
		let markCleanupStarted = () => undefined
		const cleanupGate = new Promise<void>((resolve) => {
			releaseCleanup = resolve
		})
		const cleanupStarted = new Promise<void>((resolve) => {
			markCleanupStarted = resolve
		})
		let cleanups = 0
		const reset = new ResetOrchestrator({
			settings: fixture.settings,
			profiles: fixture.profiles,
			subscriptions: fixture.subscriptions,
			async disconnectAndCleanup() {
				cleanups += 1
				if (cleanups === 1) {
					markCleanupStarted()
					await cleanupGate
				}
			},
		})

		const first = reset.reset('tunnel-configuration')
		const second = reset.reset('app-data')
		await cleanupStarted
		expect(cleanups).toBe(1)
		releaseCleanup()
		await Promise.all([first, second])
		expect(cleanups).toBe(2)
	})
})
