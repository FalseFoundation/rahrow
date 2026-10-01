import { AppShell } from '@rahrow/features/app/AppShell.tsx'
import { use } from 'react'

import { useNativeShell } from './use-native-shell.ts'

const desktopRuntime = import('./lib/app-runtime.ts').then(
	({ createDesktopRuntime }) => createDesktopRuntime(),
)

export function App() {
	const runtime = use(desktopRuntime)
	useNativeShell(runtime.smartConnect?.schedule)

	return <AppShell runtime={runtime} />
}
