'use client'

import {
	Alert02Icon,
	CheckmarkCircle02Icon,
	InformationCircleIcon,
	Loading03Icon,
	MultiplicationSignCircleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Toaster as Sonner, type ToasterProps, toast } from 'sonner'
import { useTheme } from '../theme-provider'
import { useDirection } from './direction.tsx'

const SAFE_TOP_OFFSET = 'calc(env(safe-area-inset-top, 0px) + 0.75rem)'
const DEFAULT_OFFSET = { top: SAFE_TOP_OFFSET }
const DEFAULT_MOBILE_OFFSET = {
	...DEFAULT_OFFSET,
	left: 'max(1rem, env(safe-area-inset-left, 0px))',
	right: 'max(1rem, env(safe-area-inset-right, 0px))',
}

const Toaster = ({
	closeButton = true,
	position = 'top-center',
	offset = DEFAULT_OFFSET,
	mobileOffset = DEFAULT_MOBILE_OFFSET,
	style,
	...props
}: ToasterProps) => {
	const { theme = 'system' } = useTheme()
	const direction = useDirection()

	return (
		<Sonner
			theme={theme as ToasterProps['theme']}
			dir={direction}
			closeButton={closeButton}
			position={position}
			offset={offset}
			mobileOffset={mobileOffset}
			className='toaster group motion-reduce:[&_[data-sonner-toast]]:animate-none motion-reduce:[&_[data-sonner-toast]]:transition-none'
			icons={{
				success: (
					<HugeiconsIcon
						icon={CheckmarkCircle02Icon}
						strokeWidth={2}
						className='size-5'
					/>
				),
				info: (
					<HugeiconsIcon
						icon={InformationCircleIcon}
						strokeWidth={2}
						className='size-5'
					/>
				),
				warning: (
					<HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className='size-5' />
				),
				error: (
					<HugeiconsIcon
						icon={MultiplicationSignCircleIcon}
						strokeWidth={2}
						className='size-5'
					/>
				),
				loading: (
					<HugeiconsIcon
						icon={Loading03Icon}
						strokeWidth={2}
						className='size-5 animate-spin motion-reduce:animate-none'
					/>
				),
			}}
			style={
				{
					'--normal-bg': 'var(--popover)',
					'--normal-text': 'var(--popover-foreground)',
					'--normal-border': 'var(--border)',
					'--border-radius': 'var(--radius)',
					...style,
				} as React.CSSProperties
			}
			toastOptions={{
				classNames: {
					toast:
						'cn-toast grid! grid-cols-[auto_minmax(0,1fr)_auto] items-start! gap-x-2! gap-y-3! [&_[data-content]]:col-[2/-1] [&_[data-content]]:row-start-1 [&_[data-action]]:col-start-2 [&_[data-action]]:row-start-2 [&_[data-action]]:justify-self-start [&_[data-cancel]]:col-start-3 [&_[data-cancel]]:row-start-2 [&_[data-cancel]]:justify-self-end [&_[data-button]]:m-0!',
				},
			}}
			{...props}
		/>
	)
}

export { Toaster, toast }
