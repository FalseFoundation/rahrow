import type { Store } from '@tanstack/react-store'

export type SocketResourceStatus = 'idle' | 'pending' | 'success' | 'error'

export interface SocketResourceState<TData, TError = string> {
	data: TData
	status: SocketResourceStatus
	error: TError | null
	updatedAt: number | null
}

export interface SocketResourceActions<TData, TError = string> {
	setPending: () => void
	setSuccess: (data: TData) => void
	setError: (error: TError) => void
	setData: (data: TData) => void
	reset: () => void
}

export interface SocketResource<TData, TError = string> {
	store: Store<SocketResourceState<TData, TError>>
	actions: SocketResourceActions<TData, TError>
	refetch: () => void
	subscribe: (onData: (data: any) => void, onError: (error: TError) => void) => void
	unsubscribe: () => void
}

export interface CreateSocketResourceOptions<TData, TError = string> {
	key: string
	initialData: TData
	socketEmitter: () => void
	subscribe: (onData: (data: any) => void, onError: (error: TError) => void) => void
	unsubscribe: () => void
}
