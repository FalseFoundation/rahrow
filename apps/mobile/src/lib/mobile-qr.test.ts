import { importProfilesToStore } from '@rahrow/core/profile/profile-workflow.ts'
import { defaultProtocolRegistry } from '@rahrow/core/protocol/connection-protocol.ts'
import {
	JsonProfileStore,
	MemoryDocumentStore,
} from '@rahrow/core/storage/json-store.ts'
import { describe, expect, it } from 'vitest'

import {
	CapacitorQrDecoder,
	createMobileQrDecoder,
	type RahRowQrPlugin,
} from './mobile-qr.ts'

const scannedVless =
	'vless://11111111-1111-4111-8111-111111111111@example.com:443?security=tls#Scanned'
const scannedVmess = `vmess://${globalThis.btoa(
	JSON.stringify({
		v: '2',
		ps: 'Scanned',
		add: 'example.net',
		port: '8443',
		id: '22222222-2222-4222-8222-222222222222',
		aid: '0',
		net: 'tcp',
		type: 'none',
		tls: 'tls',
	}),
)}`
const scannedTrojan = 'trojan://secret@example.org:443?security=tls#Scanned'
const scannedSubscription = [scannedVless, scannedTrojan].join('\n')

class FakeRahRowQrPlugin implements RahRowQrPlugin {
	value = scannedVless
	async startPreview(): Promise<void> {}
	async stopPreview(): Promise<void> {}

	async scan(): Promise<{ value: string }> {
		return { value: this.value }
	}
}

describe('mobile camera QR decoder', () => {
	it('returns the scanned string without parsing protocols', async () => {
		const plugin = new FakeRahRowQrPlugin()
		const decoder = new CapacitorQrDecoder(plugin)

		await expect(decoder.decode()).resolves.toBe(scannedVless)
		await expect(decoder.decode('ignored-textarea')).resolves.toBe(scannedVless)
	})

	it('feeds scanned VLESS, VMess, Trojan, and subscription payloads into the shared import pipeline', async () => {
		const plugin = new FakeRahRowQrPlugin()
		const decoder = new CapacitorQrDecoder(plugin)
		const store = new JsonProfileStore(new MemoryDocumentStore())

		for (const payload of [
			scannedVless,
			scannedVmess,
			scannedTrojan,
			scannedSubscription,
		]) {
			plugin.value = payload
			const scanned = await decoder.decode()
			const result = await importProfilesToStore(
				{ value: scanned, source: 'qr' },
				store,
				defaultProtocolRegistry,
			)

			expect(scanned).toBe(payload)
			expect(result.profiles.length).toBeGreaterThan(0)
			expect(result.profiles.every((item) => item.metadata?.source === 'qr')).toBe(
				true,
			)
		}

		await expect(store.list()).resolves.toEqual(
			expect.arrayContaining([
				expect.objectContaining({ protocol: 'vless' }),
				expect.objectContaining({ protocol: 'vmess' }),
				expect.objectContaining({ protocol: 'trojan' }),
			]),
		)
	})

	it('does not expose a decoder on web', () => {
		expect(createMobileQrDecoder('web')).toBeUndefined()
	})
})
