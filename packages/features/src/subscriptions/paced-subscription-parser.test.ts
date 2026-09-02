import { defaultProtocolRegistry } from '@rahrow/core/protocol/connection-protocol.ts'
import { describe, expect, it } from 'vitest'
import { parseSubscriptionProfilesPaced } from './paced-subscription-parser.ts'

const vless = (index: number) =>
	`vless://11111111-1111-4111-8111-${String(index).padStart(12, '0')}@host-${index}.example:443?security=tls#Profile-${index}`

describe('parseSubscriptionProfilesPaced', () => {
	it('preserves profile order and global issue indexes across paced batches', async () => {
		const report = await parseSubscriptionProfilesPaced(
			{
				value: [vless(1), 'unsupported', vless(2), vless(3), vless(4)].join('\n'),
				source: 'subscription',
			},
			defaultProtocolRegistry,
			{ batchSize: 2, wait: 0 },
		)

		expect(report.profiles.map((profile) => profile.metadata?.name)).toEqual([
			'Profile-1',
			'Profile-2',
			'Profile-3',
			'Profile-4',
		])
		expect(report.issues).toEqual([
			expect.objectContaining({ index: 1, kind: 'unsupported' }),
		])
	})

	it('stops pending parse batches when aborted', async () => {
		const controller = new AbortController()
		const parsedBatches: number[] = []

		await expect(
			parseSubscriptionProfilesPaced(
				{
					value: [vless(1), vless(2), vless(3)].join('\n'),
					source: 'subscription',
				},
				defaultProtocolRegistry,
				{
					batchSize: 1,
					wait: 0,
					signal: controller.signal,
					onBatchParsed: (index) => {
						parsedBatches.push(index)
						controller.abort()
					},
				},
			),
		).rejects.toMatchObject({ name: 'AbortError' })
		expect(parsedBatches).toEqual([0])
	})
})
