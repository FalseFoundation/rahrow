import { describe, expect, it, vi } from 'vitest'

import { resolveAvailableLoopbackPort } from './local-port.ts'

describe('resolveAvailableLoopbackPort', () => {
	it('keeps the preferred port when it is free', async () => {
		const isListening = vi.fn(async () => false)
		await expect(resolveAvailableLoopbackPort(10808, isListening)).resolves.toBe(
			10808,
		)
		expect(isListening).toHaveBeenCalledWith(10808)
	})

	it('walks forward when the preferred port is occupied', async () => {
		const isListening = vi.fn(async (port: number) => port < 10810)
		await expect(resolveAvailableLoopbackPort(10808, isListening)).resolves.toBe(
			10810,
		)
	})

	it('fails clearly when no nearby port is free', async () => {
		const isListening = vi.fn(async () => true)
		await expect(
			resolveAvailableLoopbackPort(10808, isListening),
		).rejects.toThrow(/Local port 10808 is already in use/)
	})

	it('names a known local proxy when every nearby port is busy', async () => {
		const isListening = vi.fn(async () => true)
		const identifyOccupant = vi.fn(async () => 'v2rayN')
		await expect(
			resolveAvailableLoopbackPort(10808, isListening, identifyOccupant),
		).rejects.toThrow(/already in use by v2rayN/)
		expect(identifyOccupant).toHaveBeenCalledWith(10808)
	})
})
