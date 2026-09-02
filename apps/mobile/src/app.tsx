import { AppShell } from '@rahrow/features/app/AppShell.tsx'
import { useMemo } from 'react'

import { createMobileRuntime } from './lib/app-runtime.ts'
import { useNativeShell } from './use-native-shell.ts'

export function App() {
	const runtime = useMemo(() => createMobileRuntime(), [])
	useNativeShell(runtime.smartConnect?.schedule)

	return <AppShell runtime={runtime} />
}
