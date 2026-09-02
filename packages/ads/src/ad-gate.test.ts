import { describe, expect, it } from 'vitest'

import {
	AdGateController,
	type AdGateStorage,
	DEFAULT_AD_GATE_POLICY,
} from './ad-gate.ts'

describe('AdGateController', () => {
	it('keeps queued obligations pending for five minutes after a watched ad', async () => {
		const storage = new MemoryAdGateStorage()
		let now = 1_000
		let id = 0
		const gate = new AdGateController({
			storage,
			createId: () => `ad-${++id}`,
			now: () => now,
		})
		const first = await gate.recordConnectionSuccess()
		const second = await gate.recordConnectionSuccess()
		await gate.claimNext()
		await gate.complete(first.id, 'closed')

		expect(await gate.claimNext()).toBeNull()
		expect(gate.snapshot().obligations).toEqual([second])

		now += 299_999
		expect(await gate.claimNext()).toBeNull()
		now += 1
		expect(await gate.claimNext()).toEqual(
			expect.objectContaining({ id: second.id, status: 'presenting' }),
		)
	})

	it('persists the watched-ad cooldown across restarts', async () => {
		const storage = new MemoryAdGateStorage()
		let now = 5_000
		const first = new AdGateController({ storage, now: () => now })
		const obligation = await first.recordConnectionSuccess()
		await first.claimNext()
		await first.complete(obligation.id, 'provider-dismissed')

		const restarted = new AdGateController({ storage, now: () => now })
		await restarted.recordConnectionSuccess()
		expect(await restarted.claimNext()).toBeNull()

		now += 300_000
		expect(await restarted.claimNext()).not.toBeNull()
	})

	it.each(['provider-failed', 'provider-unavailable'] as const)(
		'does not start the cooldown after a %s presentation',
		async (outcome) => {
			const gate = createGate(new MemoryAdGateStorage())
			const first = await gate.recordConnectionSuccess()
			await gate.recordConnectionSuccess()
			await gate.claimNext()
			await gate.complete(first.id, outcome)

			expect(await gate.claimNext()).not.toBeNull()
		},
	)

	it('does not start the cooldown when a pending ad is completed without presentation', async () => {
		const gate = createGate(new MemoryAdGateStorage())
		const first = await gate.recordConnectionSuccess()
		await gate.recordConnectionSuccess()

		await gate.complete(first.id, 'closed')

		expect(await gate.claimNext()).not.toBeNull()
	})

	it('restarts the cooldown safely when the wall clock moves backwards', async () => {
		const storage = new MemoryAdGateStorage(
			JSON.stringify({
				version: 3,
				profileSelectionCount: 0,
				pingActionCount: 0,
				processedActionEventIds: [],
				obligations: [],
				lastSuccessfulViewAt: 50_000,
			}),
		)
		let now = 10_000
		const gate = new AdGateController({ storage, now: () => now })
		await gate.recordConnectionSuccess()

		expect(await gate.claimNext()).toBeNull()
		now += 299_999
		expect(await gate.claimNext()).toBeNull()
		now += 1
		expect(await gate.claimNext()).not.toBeNull()
	})

	it('allows only one concurrent claim and keeps the queue bounded', async () => {
		const gate = createGate(new MemoryAdGateStorage())
		await gate.recordConnectionSuccess()

		const claims = await Promise.all([
			gate.claimNext(),
			gate.claimNext(),
			gate.claimNext(),
		])

		expect(claims.filter(Boolean)).toHaveLength(1)
		expect(gate.snapshot().obligations).toHaveLength(1)
	})

	it('creates one durable obligation after every third changed profile selection', async () => {
		const storage = new MemoryAdGateStorage()
		const gate = createGate(storage)
		await gate.initialize()

		await gate.recordProfileSelection('profile-a', 'profile-b')
		await gate.recordProfileSelection('profile-b', 'profile-b')
		await gate.recordProfileSelection('profile-b', 'profile-c')
		await expect(
			gate.recordProfileSelection('profile-c', 'profile-a'),
		).resolves.toEqual(expect.objectContaining({ trigger: 'profile-selection' }))

		expect(gate.snapshot()).toMatchObject({
			profileSelectionCount: 0,
			obligations: [{ trigger: 'profile-selection', status: 'pending' }],
		})
		expect(storage.value).toContain('profile-selection')
	})

	it('persists a connection-success obligation before exposing it', async () => {
		const storage = new MemoryAdGateStorage()
		const gate = createGate(storage)
		await gate.initialize()

		const obligation = await gate.recordConnectionSuccess()

		expect(storage.value).toContain(obligation.id)
		expect(gate.snapshot().obligations[0]).toEqual(obligation)
	})

	it('creates one durable obligation for every ten completed ping actions', async () => {
		const storage = new MemoryAdGateStorage()
		const gate = createGate(storage)

		for (let index = 1; index < 10; index += 1) {
			await expect(
				gate.recordActionEvent({
					id: `ping-${index}`,
					action: index % 2 === 0 ? 'subscription-ping' : 'profile-ping',
					outcome: 'completed',
				}),
			).resolves.toMatchObject({ status: 'recorded', obligation: null })
		}

		await expect(
			gate.recordActionEvent({
				id: 'ping-10',
				action: 'subscription-ping',
				outcome: 'completed',
			}),
		).resolves.toMatchObject({
			status: 'recorded',
			obligation: { trigger: 'ping-actions' },
		})

		expect(gate.snapshot()).toMatchObject({
			pingActionCount: 0,
			obligations: [{ trigger: 'ping-actions', status: 'pending' }],
		})
		expect(storage.value).toContain('ping-10')
	})

	it('deduplicates action events after persisted state is reloaded', async () => {
		const storage = new MemoryAdGateStorage()
		const first = createGate(storage)
		await first.recordActionEvent({
			id: 'stable-operation-id',
			action: 'profile-ping',
			outcome: 'completed',
		})

		const restarted = createGate(storage)
		await expect(
			restarted.recordActionEvent({
				id: 'stable-operation-id',
				action: 'profile-ping',
				outcome: 'completed',
			}),
		).resolves.toEqual({ status: 'duplicate', obligation: null })

		expect(restarted.snapshot().pingActionCount).toBe(1)
	})

	it('does not consume an action event when persistence fails', async () => {
		const storage = new MemoryAdGateStorage()
		const gate = createGate(storage)
		await gate.initialize()
		storage.failNextWrite = true
		const event = {
			id: 'retry-after-write-failure',
			action: 'profile-ping',
			outcome: 'completed',
		} as const

		await expect(gate.recordActionEvent(event)).rejects.toThrow('write failed')
		expect(gate.snapshot().pingActionCount).toBe(0)
		await expect(gate.recordActionEvent(event)).resolves.toMatchObject({
			status: 'recorded',
		})
		expect(gate.snapshot().pingActionCount).toBe(1)
	})

	it.each(['failed', 'cancelled', 'permission-denied', 'no-op'] as const)(
		'does not count a %s action event',
		async (outcome) => {
			const gate = createGate(new MemoryAdGateStorage())

			await expect(
				gate.recordActionEvent({
					id: `ignored-${outcome}`,
					action: 'profile-ping',
					outcome,
				}),
			).resolves.toEqual({ status: 'ignored', obligation: null })

			expect(gate.snapshot().pingActionCount).toBe(0)
		},
	)

	it.each([
		['cleanup', 'cleanup-success'],
		['backup-export', 'backup-success'],
		['backup-import', 'backup-success'],
	] as const)(
		'creates an obligation for a completed %s event',
		async (action, trigger) => {
			const gate = createGate(new MemoryAdGateStorage())

			await expect(
				gate.recordActionEvent({ id: action, action, outcome: 'completed' }),
			).resolves.toMatchObject({
				status: 'recorded',
				obligation: { trigger },
			})
		},
	)

	it('recovers an interrupted presentation as pending after restart', async () => {
		const storage = new MemoryAdGateStorage()
		const first = createGate(storage)
		await first.initialize()
		const created = await first.recordConnectionSuccess()
		await first.claimNext()

		const restarted = createGate(storage)
		await restarted.initialize()

		expect(restarted.snapshot().obligations).toEqual([
			expect.objectContaining({ id: created.id, status: 'pending', attempts: 1 }),
		])
	})

	it('completes the current obligation idempotently without discarding queued work', async () => {
		const gate = createGate(new MemoryAdGateStorage())
		await gate.initialize()
		const first = await gate.recordConnectionSuccess()
		const second = await gate.recordConnectionSuccess()

		await gate.complete(first.id)
		await gate.complete(first.id)

		expect(gate.snapshot().obligations).toEqual([second])
	})

	it('reports policy progress and the last presentation outcome', async () => {
		const gate = createGate(new MemoryAdGateStorage())
		await gate.initialize()
		await gate.recordProfileSelection('profile-a', 'profile-b')
		const obligation = await gate.recordConnectionSuccess()

		await gate.complete(obligation.id, 'provider-unavailable')

		expect(gate.snapshot()).toMatchObject({
			policy: DEFAULT_AD_GATE_POLICY,
			profileSelectionCount: 1,
			lastCompletion: {
				trigger: 'connection-success',
				outcome: 'provider-unavailable',
				attempts: 0,
			},
		})
	})

	it('recovers malformed persisted input safely and bounds the forced duration', async () => {
		const storage = new MemoryAdGateStorage('{"version":1,"obligations":"bad"}')
		const gate = new AdGateController({
			storage,
			policy: { selectionsPerAd: 0, minimumVisibleMs: 30_000 },
			createId: () => 'bounded',
			now: () => 100,
		})

		await gate.initialize()
		const obligation = await gate.recordConnectionSuccess()

		expect(obligation.minimumVisibleMs).toBe(15_000)
		expect(gate.snapshot().profileSelectionCount).toBe(0)
	})
})

function createGate(storage: AdGateStorage) {
	let id = 0
	return new AdGateController({
		storage,
		policy: DEFAULT_AD_GATE_POLICY,
		createId: () => `ad-${++id}`,
		now: () => 1_000 + id,
	})
}

class MemoryAdGateStorage implements AdGateStorage {
	failNextWrite = false

	constructor(public value: string | null = null) {}

	async read(): Promise<string | null> {
		return this.value
	}

	async write(value: string): Promise<void> {
		if (this.failNextWrite) {
			this.failNextWrite = false
			throw new Error('write failed')
		}
		this.value = value
	}
}
