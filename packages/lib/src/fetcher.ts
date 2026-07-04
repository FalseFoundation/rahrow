interface CustomFetchOptions<TBody = never> extends Omit<RequestInit, 'body'> {
	params?: Record<string, string | number | boolean>
	body?: TBody
	timeout?: number
	retries?: number
	retryDelay?: number
	stringify?: boolean
}

interface FetchResponse<TData> {
	data: TData
	status: number
	statusText: string
	headers: Headers
}

class FetchError<TData = unknown> extends Error {
	constructor(
		message: string,
		public status?: number,
		public response?: Response,
		public data?: TData,
	) {
		super(message)
		this.name = 'FetchError'
	}
}

class CustomFetcher {
	private baseUrl: string
	private defaultHeaders: Headers
	private defaultTimeout: number

	constructor(baseUrl: string, defaultHeaders?: HeadersInit, timeout: number = 30000) {
		this.baseUrl = baseUrl.replace(/\/$/, '')
		this.defaultHeaders = new Headers(defaultHeaders)
		this.defaultTimeout = timeout

		if (!this.defaultHeaders.has('Content-Type')) {
			this.defaultHeaders.set('Content-Type', 'application/json')
		}
	}

	private buildUrl(path: string, params?: Record<string, string | number | boolean>): string {
		const cleanPath = path.startsWith('/') ? path : `/${path}`
		let url = `${this.baseUrl}${cleanPath}`

		if (params && Object.keys(params).length > 0) {
			const searchParams = new URLSearchParams()
			Object.entries(params).forEach(([key, value]) => {
				if (value !== undefined && value !== null) {
					searchParams.append(key, String(value))
				}
			})
			url += `?${searchParams.toString()}`
		}

		return url
	}

	private async executeRequest(url: string, config: RequestInit): Promise<Response> {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeout)

		try {
			const response = await fetch(url, {
				...config,
				signal: controller.signal,
			})
			clearTimeout(timeoutId)
			return response
		} catch (error) {
			clearTimeout(timeoutId)
			throw error
		}
	}

	async request<TResponse = unknown, TBody = never>(
		path: string,
		{
			params,
			method = 'GET',
			body,
			headers: requestHeaders,
			timeout,
			retries = 0,
			retryDelay = 1000,
			stringify = true,
			...otherOptions
		}: CustomFetchOptions<TBody> = {},
	): Promise<FetchResponse<TResponse>> {
		const url = this.buildUrl(path, params)

		const mergedHeaders = new Headers(this.defaultHeaders)
		if (requestHeaders) {
			new Headers(requestHeaders).forEach((value, name) => {
				mergedHeaders.set(name, value)
			})
		}

		let processedBody: TBody | string | null = body ?? null
		if (body && !(body instanceof FormData) && stringify && method !== 'GET') {
			processedBody = JSON.stringify(body)
		}

		const config: RequestInit = {
			method,
			headers: mergedHeaders,
			body: processedBody as any,
			...otherOptions,
		}

		if (timeout) {
			this.defaultTimeout = timeout
		}

		let lastError: Error
		for (let attempt = 0; attempt <= retries; attempt++) {
			try {
				const response = await this.executeRequest(url, config)

				let data: TResponse
				const contentType = response.headers.get('content-type') || ''

				if (contentType.includes('application/json')) {
					data = await response.json()
				} else if (contentType.includes('text/')) {
					data = (await response.text()) as TResponse
				} else {
					data = (await response.blob()) as TResponse
				}

				if (!response.ok) {
					throw new FetchError<TResponse>(
						`HTTP ${response.status}: ${response.statusText}`,
						response.status,
						response,
						data,
					)
				}

				return {
					data,
					status: response.status,
					statusText: response.statusText,
					headers: response.headers,
				}
			} catch (error) {
				lastError = error as Error

				if (error instanceof FetchError && error.status && error.status < 500) {
					throw error
				}

				if (attempt < retries) {
					await new Promise((resolve) => setTimeout(resolve, retryDelay))
				}
			}
		}

		throw lastError!
	}

	async get<TResponse = unknown>(
		path: string,
		options?: Omit<CustomFetchOptions<never>, 'method'>,
	): Promise<FetchResponse<TResponse>> {
		return this.request<TResponse, never>(path, { ...options, method: 'GET' })
	}

	async post<TResponse = unknown, TBody = never>(
		path: string,
		body?: TBody,
		options?: Omit<CustomFetchOptions<TBody>, 'method' | 'body'>,
	): Promise<FetchResponse<TResponse>> {
		return this.request<TResponse, TBody>(path, {
			...options,
			method: 'POST',
			body,
		})
	}

	async put<TResponse = unknown, TBody = never>(
		path: string,
		body?: TBody,
		options?: Omit<CustomFetchOptions<TBody>, 'method' | 'body'>,
	): Promise<FetchResponse<TResponse>> {
		return this.request<TResponse, TBody>(path, {
			...options,
			method: 'PUT',
			body,
		})
	}

	async patch<TResponse = unknown, TBody = never>(
		path: string,
		body?: TBody,
		options?: Omit<CustomFetchOptions<TBody>, 'method' | 'body'>,
	): Promise<FetchResponse<TResponse>> {
		return this.request<TResponse, TBody>(path, {
			...options,
			method: 'PATCH',
			body,
		})
	}

	async delete<TResponse = unknown>(
		path: string,
		options?: Omit<CustomFetchOptions<never>, 'method'>,
	): Promise<FetchResponse<TResponse>> {
		return this.request<TResponse, never>(path, { ...options, method: 'DELETE' })
	}
}

export default CustomFetcher
export { type CustomFetchOptions, FetchError, type FetchResponse }
