export type ErrorCode =
	| 'engine_not_found'
	| 'engine_already_running'
	| 'engine_not_running'
	| 'engine_start_failed'
	| 'engine_stop_failed'
	| 'engine_health_failed'
	| 'connection_invalid_state'
	| 'invalid_config'
	| 'invalid_profile'
	| 'unsupported_capability'

export class RahrowError extends Error {
	readonly code: ErrorCode

	constructor(
		code: ErrorCode,
		message: string,
		options: { readonly cause?: unknown } = {},
	) {
		super(message)
		this.name = 'RahrowError'
		this.code = code
		this.cause = options.cause
	}
}

export class EngineError extends RahrowError {}

export class ProfileError extends RahrowError {}

export class ConnectionError extends RahrowError {}

export function errorMessage(
	error: unknown,
	fallback = 'Unexpected error',
): string {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message
	}

	if (typeof error === 'string' && error.trim().length > 0) {
		return error
	}

	if (error && typeof error === 'object') {
		const record = error as {
			readonly message?: unknown
			readonly error?: unknown
		}

		if (typeof record.message === 'string' && record.message.trim().length > 0) {
			return record.message
		}

		if (typeof record.error === 'string' && record.error.trim().length > 0) {
			return record.error
		}

		try {
			return JSON.stringify(error)
		} catch {
			return fallback
		}
	}

	return fallback
}

export function asError(error: unknown, fallback = 'Unexpected error'): Error {
	return error instanceof Error
		? error
		: new Error(errorMessage(error, fallback))
}
