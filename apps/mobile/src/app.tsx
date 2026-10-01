import { AppShell } from '@rahrow/features/app/AppShell.tsx'
import { use } from 'react'

import { useNativeShell } from './use-native-shell.ts'

const mobileRuntime = import('./lib/app-runtime.ts').then(
	({ createMobileRuntime }) => createMobileRuntime(),
)

export function App() {
	const runtime = use(mobileRuntime)
	useNativeShell(runtime.smartConnect?.schedule)

	return <AppShell runtime={runtime} />
}
