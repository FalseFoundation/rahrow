import type { LogRecord } from './log-record.ts'

export interface LogsPort {
	records(): readonly LogRecord[]
	subscribe(listener: () => void): () => void
	clear(): void
}

export interface LogDestination {
	write(record: LogRecord): void
}

export interface LogBufferOptions {
	readonly capacity?: number
}

export class LogBuffer implements LogsPort, LogDestination {
	readonly #capacity: number
	readonly #records: LogRecord[] = []
	readonly #listeners = new Set<() => void>()
	#snapshot: readonly LogRecord[] = []
	#sequence = 0

	constructor(options: LogBufferOptions = {}) {
		this.#capacity = Math.max(options.capacity ?? 2000, 1)
	}

	write(record: Omit<LogRecord, 'id'> & { readonly id?: string }): void {
		this.#sequence += 1
		this.#records.push({
			...record,
			id: record.id ?? `log-${this.#sequence}`,
		})

		if (this.#records.length > this.#capacity) {
			this.#records.splice(0, this.#records.length - this.#capacity)
		}

		this.publish()
	}

	records(): readonly LogRecord[] {
		return this.#snapshot
	}

	subscribe(listener: () => void): () => void {
		this.#listeners.add(listener)

		return () => {
			this.#listeners.delete(listener)
		}
	}

	clear(): void {
		this.#records.length = 0
		this.publish()
	}

	private publish() {
		this.#snapshot = this.#records.slice()

		for (const listener of this.#listeners) {
			listener()
		}
	}
}

export function createLogBuffer(options: LogBufferOptions = {}): LogBuffer {
	return new LogBuffer(options)
}
