import {
	createContext,
	type ReactNode,
	type RefObject,
	useContext,
} from 'react'

/** Stable id for TanStack Router element scroll restoration on the app viewport. */
export const APP_SCROLL_RESTORATION_ID = 'app-scroll'

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
