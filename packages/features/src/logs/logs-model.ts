import {
	isLogLevelAtLeast,
	type LogLevel,
} from '@rahrow/core/logging/log-level.ts'
import type { LogRecord } from '@rahrow/core/logging/log-record.ts'

export interface LogViewFilter {
	readonly minLevel: LogLevel
	readonly query: string
	readonly module?: string
}

export function filterLogRecords(
	records: readonly LogRecord[],
	filter: LogViewFilter,
): readonly LogRecord[] {
	const query = filter.query.trim().toLowerCase()

	return records.filter((record) => {
		if (!isLogLevelAtLeast(record.level, filter.minLevel)) {
			return false
		}

		if (filter.module && record.module !== filter.module) {
			return false
		}

		if (query.length === 0) {
			return true
		}

		return logRecordText(record).toLowerCase().includes(query)
	})
}

export function uniqueLogModules(
	records: readonly LogRecord[],
): readonly string[] {
	return [
		...new Set(
			records.flatMap((record) => (record.module ? [record.module] : [])),
		),
	].sort()
}

export function logRecordText(record: LogRecord): string {
	const extras = Object.entries(record.bindings)
		.filter(([key]) => key !== 'module')
		.map(([key, value]) => `${key}=${stringifyBinding(value)}`)
		.join(' ')

	return [record.module, record.msg, extras].filter(Boolean).join(' ')
}

export function formatLogTime(time: number): string {
	return new Date(time).toISOString()
}

export function formatLogExport(records: readonly LogRecord[]): string {
	return records
		.map((record) => {
			const module = record.module ?? '-'
			return `${formatLogTime(record.time)} ${record.level.toUpperCase()} ${module} ${record.msg}`
		})
		.join('\n')
}

export function logLevelBadgeVariant(
	level: LogLevel,
): 'destructive' | 'secondary' | 'outline' | 'warning' {
	if (level === 'error' || level === 'fatal') {
		return 'destructive'
	}

	if (level === 'info') {
		return 'secondary'
	}

	if (level === 'warn') {
		return 'warning'
	}

	return 'outline'
}

function stringifyBinding(value: unknown): string {
	if (typeof value === 'string') {
		return value
	}

	if (typeof value === 'number' || typeof value === 'boolean') {
		return String(value)
	}

	try {
		return JSON.stringify(value)
	} catch {
		return '[unserializable]'
	}
}
