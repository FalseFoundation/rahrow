import { createContext, type ReactNode, use } from 'react'

const PrimaryTabVisibilityContext = createContext(true)

export function PrimaryTabVisibilityProvider({
	active,
	children,
}: {
	readonly active: boolean
	readonly children: ReactNode
}) {
	return (
		<PrimaryTabVisibilityContext value={active}>
			{children}
		</PrimaryTabVisibilityContext>
	)
}

export function usePrimaryTabVisible() {
	return use(PrimaryTabVisibilityContext)
}
