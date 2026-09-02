import { describe, expect, it } from 'vitest'

import { createLogBuffer } from './log-buffer.ts'
import { createPinoLogger } from './pino-logger.ts'

describe('createPinoLogger', () => {
	it('writes pino records into the log buffer with child bindings', () => {
		const buffer = createLogBuffer()
		const logger = createPinoLogger({
			name: 'rahrow',
			destination: buffer,
			level: 'debug',
		})

		logger.child({ module: 'connection' }).info({ profileId: 'p1' }, 'Connecting')
		logger.child({ module: 'xray' }).error({ err: 'boom' }, 'Xray start failed')

		expect(buffer.records()).toEqual([
			expect.objectContaining({
				level: 'info',
				msg: 'Connecting',
				module: 'connection',
				bindings: expect.objectContaining({
					name: 'rahrow',
					profileId: 'p1',
				}),
			}),
			expect.objectContaining({
				level: 'error',
				msg: 'Xray start failed',
				module: 'xray',
				bindings: expect.objectContaining({
					err: 'boom',
				}),
			}),
		])
	})
})
