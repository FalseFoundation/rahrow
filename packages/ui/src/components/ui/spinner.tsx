import { Loading03Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import * as React from 'react'
import { cn } from '../../lib/utils'

const Spinner = React.forwardRef<
	SVGSVGElement,
	Omit<React.ComponentPropsWithoutRef<typeof HugeiconsIcon>, 'icon'>
>(
	(
		{
			className,
			'aria-label': ariaLabel,
			'aria-hidden': ariaHidden,
			role,
			...props
		},
		ref,
	) => (
		<HugeiconsIcon
			ref={ref}
			icon={Loading03Icon}
			strokeWidth={2 as number}
			data-slot='spinner'
			role={role ?? (ariaLabel ? 'status' : undefined)}
			aria-label={ariaLabel}
			aria-hidden={
				ariaHidden ?? (!ariaLabel && role === undefined ? true : undefined)
			}
			focusable='false'
			className={cn('size-4 animate-spin motion-reduce:animate-none', className)}
			{...props}
		/>
	),
)
Spinner.displayName = 'Spinner'

export { Spinner }
