import {
	createContext,
	type ReactNode,
	type RefObject,
	useContext,
} from 'react'

const AppScrollContext = createContext<RefObject<HTMLDivElement | null> | null>(
	null,
)

export function AppScrollProvider({
	children,
	viewportRef,
}: {
	readonly children: ReactNode
	readonly viewportRef: RefObject<HTMLDivElement | null>
}) {
	return (
		<AppScrollContext.Provider value={viewportRef}>
			{children}
		</AppScrollContext.Provider>
	)
}

export function useAppScrollViewport() {
	const viewportRef = useContext(AppScrollContext)
	if (!viewportRef) {
		throw new Error('useAppScrollViewport must be used within AppScrollProvider')
	}
	return viewportRef
}
