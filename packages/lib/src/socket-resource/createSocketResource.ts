import { Store } from '@tanstack/react-store'
import type { CreateSocketResourceOptions, SocketResource, SocketResourceState } from './types'

export const createSocketResource = <TData, TError = string>(
	options: CreateSocketResourceOptions<TData, TError>,
): SocketResource<TData, TError> => {
	const { initialData, socketEmitter, subscribe, unsubscribe } = options

	const store = new Store<SocketResourceState<TData, TError>>({
		data: initialData,
		status: 'idle',
		error: null,
		updatedAt: null,
	})

	const setPending = () => {
		store.setState((prev) => ({
			...prev,
			status: 'pending' as const,
		}))
	}

	const setSuccess = (data: TData) => {
		store.setState({
			data,
			status: 'success' as const,
			error: null,
			updatedAt: Date.now(),
		})
	}

	const setError = (error: TError) => {
		store.setState((prev) => ({
			...prev,
			status: 'error' as const,
			error,
		}))
	}

	const setData = (data: TData) => {
		store.setState((prev) => ({
			...prev,
			data,
			updatedAt: Date.now(),
		}))
	}

	const reset = () => {
		store.setState({
			data: initialData,
			status: 'idle' as const,
			error: null,
			updatedAt: null,
		})
	}

	const refetch = () => {
		setPending()
		socketEmitter()
	}

	return {
		store,
		actions: {
			setPending,
			setSuccess,
			setError,
			setData,
			reset,
		},
		refetch,
		subscribe,
		unsubscribe,
	}
}
