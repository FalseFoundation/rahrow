export const LOG_LEVELS = [
	'trace',
	'debug',
	'info',
	'warn',
	'error',
	'fatal',
] as const

export type LogLevel = (typeof LOG_LEVELS)[number]

export const LOG_LEVEL_VALUES: Record<LogLevel, number> = {
	trace: 10,
	debug: 20,
	info: 30,
	warn: 40,
	error: 50,
	fatal: 60,
}

export function isLogLevel(value: string): value is LogLevel {
	return (LOG_LEVELS as readonly string[]).includes(value)
}

export function logLevelFromValue(value: unknown): LogLevel {
	if (typeof value === 'string' && isLogLevel(value)) {
		return value
	}

	if (typeof value === 'number') {
		for (const [name, code] of Object.entries(LOG_LEVEL_VALUES)) {
			if (code === value) {
				return name as LogLevel
			}
		}
	}

	return 'info'
}

export function isLogLevelAtLeast(level: LogLevel, minimum: LogLevel): boolean {
	return LOG_LEVEL_VALUES[level] >= LOG_LEVEL_VALUES[minimum]
}
