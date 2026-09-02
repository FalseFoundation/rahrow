export type LogBindings = Readonly<Record<string, unknown>>

export interface LogFn {
	(msg: string): void
	(bindings: LogBindings, msg?: string): void
}

export interface Logger {
	readonly level: string
	child(bindings: LogBindings): Logger
	readonly trace: LogFn
	readonly debug: LogFn
	readonly info: LogFn
	readonly warn: LogFn
	readonly error: LogFn
	readonly fatal: LogFn
}
