import pino, { type DestinationStream, type Logger as PinoLogger } from 'pino'
import type { LogDestination } from './log-buffer.ts'
import { type LogLevel, logLevelFromValue } from './log-level.ts'
import type { LogRecord } from './log-record.ts'
import type { LogBindings, LogFn, Logger } from './logger.ts'

export interface CreatePinoLoggerOptions {
	readonly name?: string
	readonly level?: LogLevel | 'silent'
	readonly destination?: LogDestination
}

const omittedPinoKeys = new Set([
	'level',
	'time',
	'msg',
	'pid',
	'hostname',
	'module',
	'v',
])

export function createPinoLogger(
	options: CreatePinoLoggerOptions = {},
): Logger {
	let sequence = 0
	const destination = options.destination
	const stream: DestinationStream = destination
		? {
				write(chunk: string) {
					for (const line of chunk.split('\n')) {
						const trimmed = line.trim()
						if (trimmed.length === 0) {
							continue
						}

						try {
							sequence += 1
							destination.write(
								logRecordFromPino(JSON.parse(trimmed), `pino-${sequence}`),
							)
						} catch {
							sequence += 1
							destination.write({
								id: `pino-${sequence}`,
								time: Date.now(),
								level: 'info',
								msg: trimmed,
								bindings: { module: 'pino' },
							})
						}
					}
				},
			}
		: pino.destination(2)

	const instance = pino(
		{
			name: options.name ?? 'rahrow',
			level: options.level ?? 'info',
			base: { name: options.name ?? 'rahrow' },
			browser: {
				asObject: true,
				write(object) {
					if (!destination) {
						return
					}

					sequence += 1
					destination.write(
						logRecordFromPino(object as Record<string, unknown>, `pino-${sequence}`),
					)
				},
			},
		},
		stream,
	)

	return wrapPino(instance)
}

export function logRecordFromPino(
	object: Record<string, unknown>,
	id: string,
): LogRecord {
	const bindings = Object.fromEntries(
		Object.entries(object).filter(([key]) => !omittedPinoKeys.has(key)),
	)

	return {
		id,
		time: typeof object.time === 'number' ? object.time : Date.now(),
		level: logLevelFromValue(object.level),
		msg: typeof object.msg === 'string' ? object.msg : '',
		module: typeof object.module === 'string' ? object.module : undefined,
		bindings,
	}
}

function wrapPino(instance: PinoLogger): Logger {
	return {
		get level() {
			return instance.level
		},
		child(bindings) {
			return wrapPino(instance.child(bindings))
		},
		trace: bindPino(instance.trace.bind(instance)),
		debug: bindPino(instance.debug.bind(instance)),
		info: bindPino(instance.info.bind(instance)),
		warn: bindPino(instance.warn.bind(instance)),
		error: bindPino(instance.error.bind(instance)),
		fatal: bindPino(instance.fatal.bind(instance)),
	}
}

function bindPino(
	write: (objOrMsg: string | LogBindings, msg?: string) => void,
): LogFn {
	return (msgOrBindings: string | LogBindings, msg?: string) => {
		if (typeof msgOrBindings === 'string') {
			write(msgOrBindings)
			return
		}

		write(msgOrBindings, msg)
	}
}
