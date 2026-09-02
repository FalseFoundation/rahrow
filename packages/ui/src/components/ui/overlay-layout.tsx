'use client'

import * as React from 'react'

export interface OverlayLayoutState {
	readonly drawerOpen: boolean
}

interface OverlayLayoutContextValue extends OverlayLayoutState {
	readonly registerOpenOverlay: () => () => void
}

const defaultLayout: OverlayLayoutState = {
	drawerOpen: false,
}

const OverlayLayoutContext =
	React.createContext<OverlayLayoutContextValue | null>(null)

export function OverlayLayoutProvider({
	children,
}: {
	readonly children: React.ReactNode
}) {
	const [openOverlays, setOpenOverlays] = React.useState<ReadonlySet<symbol>>(
		() => new Set(),
	)

	const registerOpenOverlay = React.useCallback(() => {
		const id = Symbol('open-overlay')
		setOpenOverlays((current) => new Set(current).add(id))

		return () => {
			setOpenOverlays((current) => {
				if (!current.has(id)) return current
				const next = new Set(current)
				next.delete(id)
				return next
			})
		}
	}, [])

	const drawerOpen = openOverlays.size > 0
	const value = React.useMemo<OverlayLayoutContextValue>(
		() => ({ drawerOpen, registerOpenOverlay }),
		[drawerOpen, registerOpenOverlay],
	)

	return (
		<OverlayLayoutContext.Provider value={value}>
			{children}
		</OverlayLayoutContext.Provider>
	)
}

export function useOverlayLayout(): OverlayLayoutState {
	const context = React.useContext(OverlayLayoutContext)
	return context ?? defaultLayout
}

export function useOverlayPresence(open: boolean): void {
	const registerOpenOverlay =
		React.useContext(OverlayLayoutContext)?.registerOpenOverlay

	React.useLayoutEffect(() => {
		if (!open || !registerOpenOverlay) return
		return registerOpenOverlay()
	}, [open, registerOpenOverlay])
}
