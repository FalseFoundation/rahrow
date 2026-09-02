import { useSyncExternalStore } from 'react'

import { useAppRuntime } from '../app/runtime.tsx'

export function useLogs() {
	const runtime = useAppRuntime()
	return useSyncExternalStore(
		(listener) => runtime.logs.subscribe(listener),
		() => runtime.logs.records(),
		() => runtime.logs.records(),
	)
}
