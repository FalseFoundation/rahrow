import type { LogFn, Logger } from './logger.ts'

const noop: LogFn = () => {}

export const silentLogger: Logger = {
	level: 'silent',
	child() {
		return silentLogger
	},
	trace: noop,
	debug: noop,
	info: noop,
	warn: noop,
	error: noop,
	fatal: noop,
}
