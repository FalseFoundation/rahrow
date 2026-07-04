export type ErrorCode =
	| 'runtime_not_found'
	| 'runtime_already_running'
	| 'runtime_not_running'
	| 'runtime_start_failed'
	| 'runtime_stop_failed'
	| 'runtime_health_failed'
	| 'invalid_config'

export class RuntimeError extends Error {
	readonly code: ErrorCode
	// override readonly cause?: unknown

	constructor(code: ErrorCode, message: string, options: { readonly cause?: unknown } = {}) {
		super(message)
		this.name = 'RuntimeError'
		this.code = code
		this.cause = options.cause
	}
}
