import {
	OverlayLayoutProvider,
	useOverlayLayout,
} from '@rahrow/ui/components/ui/overlay-layout.tsx'
import { type ReactNode, useEffect, useRef } from 'react'

export const APP_TOAST_TOP_EDGE =
	'calc(env(safe-area-inset-top, 0px) + 0.75rem)'
export const APP_TOAST_TOP_WITH_HEADER = `max(${APP_TOAST_TOP_EDGE}, 5.25rem)`
export const APP_TOAST_OFFSET = {
	top: `var(--app-toast-top, ${APP_TOAST_TOP_WITH_HEADER})`,
} as const
export const APP_TOAST_MOBILE_OFFSET = {
	...APP_TOAST_OFFSET,
	left: 'max(1rem, env(safe-area-inset-left, 0px))',
	right: 'max(1rem, env(safe-area-inset-right, 0px))',
} as const

export function AppOverlayPositioning({
	children,
}: {
	readonly children?: ReactNode
}) {
	return (
		<OverlayLayoutProvider>
			<BodyOverlayContract />
			{children}
		</OverlayLayoutProvider>
	)
}

function BodyOverlayContract() {
	const { drawerOpen } = useOverlayLayout()
	const initialBodyState = useRef<{
		readonly drawerOpen: string | null
		readonly toastTop: string
	} | null>(null)

	useEffect(() => {
		const body = globalThis.document?.body
		if (!body) return
		initialBodyState.current = {
			drawerOpen: body.getAttribute('data-drawer-open'),
			toastTop: body.style.getPropertyValue('--app-toast-top'),
		}

		return () => {
			const initial = initialBodyState.current
			if (!initial) return
			if (initial.drawerOpen === null) body.removeAttribute('data-drawer-open')
			else body.setAttribute('data-drawer-open', initial.drawerOpen)
			if (initial.toastTop)
				body.style.setProperty('--app-toast-top', initial.toastTop)
			else body.style.removeProperty('--app-toast-top')
			initialBodyState.current = null
		}
	}, [])

	useEffect(() => {
		const body = globalThis.document?.body
		if (!body) return
		body.toggleAttribute('data-drawer-open', drawerOpen)
		if (drawerOpen) body.setAttribute('data-drawer-open', 'true')
		body.style.setProperty(
			'--app-toast-top',
			drawerOpen ? APP_TOAST_TOP_EDGE : APP_TOAST_TOP_WITH_HEADER,
		)
	}, [drawerOpen])

	return null
}
