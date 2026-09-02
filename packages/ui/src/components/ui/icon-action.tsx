import type { ComponentProps, ReactNode } from 'react'
import { Button } from './button.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from './tooltip.tsx'

type IconActionProps = Omit<
	ComponentProps<typeof Button>,
	'aria-label' | 'title'
> & {
	/** The action's accessible name and concise visual tooltip. */
	readonly label: string
	readonly tooltip?: ReactNode
	readonly tooltipSide?: ComponentProps<typeof TooltipContent>['side']
}

/**
 * A semantic icon-only button with one accessible-name and tooltip contract.
 * Base UI suppresses press tooltips on touch, so clicks and long-press menus keep
 * their native behavior while mouse hover and keyboard focus expose the label.
 */
function IconAction({
	label,
	tooltip = label,
	tooltipSide,
	disabled,
	children,
	...props
}: IconActionProps) {
	return (
		<TooltipProvider>
			<Tooltip disabled={disabled || tooltip == null}>
				<TooltipTrigger
					render={
						<Button {...props} disabled={disabled} aria-label={label} title={label}>
							{children}
						</Button>
					}
				/>
				<TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}

export { IconAction, type IconActionProps }
