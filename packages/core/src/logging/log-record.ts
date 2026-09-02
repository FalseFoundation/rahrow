import type { LogLevel } from './log-level.ts'
import type { LogBindings } from './logger.ts'

export interface LogRecord {
	readonly id: string
	readonly time: number
	readonly level: LogLevel
	readonly msg: string
	readonly module?: string
	readonly bindings: LogBindings
}
