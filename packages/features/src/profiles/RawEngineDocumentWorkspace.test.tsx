import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type { RawEngineDocumentAdapter } from '@rahrow/core/profile/raw-engine-document.ts'
import { MemoryDocumentStore } from '@rahrow/core/storage/json-store.ts'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RawEngineDocumentWorkspace } from './RawEngineDocumentWorkspace.tsx'

afterEach(cleanup)

const profile: ConnectionProfile = {
	id: 'profile-raw',
	protocol: 'trojan',
	endpoint: { host: 'edge.example.com', port: 443 },
	authentication: { password: 'not-visible-in-report' },
	metadata: { source: 'file' },
}

const adapter: RawEngineDocumentAdapter = {
	engineId: 'xray',
	engineVersion: '26.7.28',
	validate(raw) {
		return JSON.parse(raw) as unknown
	},
	listExtractableOutbounds() {
		return [{ id: 'outbound:0', index: 0, protocol: 'trojan', label: 'Primary' }]
	},
	extractOutbound() {
		return {
			value: profile,
			fidelity: 'lossy',
			warnings: [
				{
					code: 'ignored-document-field',
					path: '$.dns.servers[0]',
					message: 'This field remains in the raw document.',
				},
			],
			unrepresentedFields: ['$.dns.servers[0]'],
		}
	},
}

describe('RawEngineDocumentWorkspace', () => {
	it('validates before extraction and requires confirmation for a lossy result', async () => {
		const user = userEvent.setup()
		const onExtract = vi.fn()
		render(
			<RawEngineDocumentWorkspace
				adapters={[adapter]}
				createIdentity={() => ({ id: 'profile-raw' })}
				storeFor={() => new AtomicDocumentStore()}
				onExtract={onExtract}
			/>,
		)

		fireEvent.change(screen.getByRole('textbox'), {
			target: { value: '{"outbounds":[]}' },
		})
		await user.click(screen.getByRole('button', { name: 'Validate document' }))
		await user.click(
			screen.getByRole('button', { name: 'Extract selected outbound' }),
		)

		expect(screen.getByText('$.dns.servers[0]')).toBeTruthy()
		expect(onExtract).not.toHaveBeenCalled()

		await user.click(
			screen.getByRole('button', { name: 'Confirm lossy extraction' }),
		)
		expect(onExtract).toHaveBeenCalledWith(profile)
	})

	it('requires review before atomically replacing the preserved raw document', async () => {
		const user = userEvent.setup()
		const store = new AtomicDocumentStore()
		render(
			<RawEngineDocumentWorkspace
				adapters={[adapter]}
				createIdentity={() => ({ id: 'profile-raw' })}
				storeFor={() => store}
				onExtract={() => undefined}
			/>,
		)

		fireEvent.change(screen.getByRole('textbox'), {
			target: { value: '{"outbounds":[]}' },
		})
		await user.click(screen.getByRole('button', { name: 'Validate document' }))
		await user.click(screen.getByRole('button', { name: 'Review replacement' }))
		expect(await store.read()).toBeNull()

		await user.click(screen.getByRole('button', { name: 'Replace raw document' }))
		expect(await store.read()).toBe('{"outbounds":[]}')
	})
})

class AtomicDocumentStore extends MemoryDocumentStore {
	async writeAtomic(value: string) {
		await this.write(value)
	}
}
