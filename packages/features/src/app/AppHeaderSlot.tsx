import { createContext, type ReactNode, useContext, useState } from 'react'

const AppHeaderTargetContext = createContext<HTMLElement | null | undefined>(
	undefined,
)

export function AppHeaderSlot({
	children,
	className,
}: {
	readonly children: ReactNode
	readonly className?: string
}) {
	const [target, setTarget] = useState<HTMLElement | null>(null)

	return (
		<>
			<div ref={setTarget} className={className} data-app-header-slot />
			<AppHeaderTargetContext.Provider value={target}>
				{children}
			</AppHeaderTargetContext.Provider>
		</>
	)
}

export function useAppHeaderTarget() {
	return useContext(AppHeaderTargetContext)
}
