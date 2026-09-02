import * as React from 'react'
import { cn } from '../../lib/utils'

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
	level?: 1 | 2 | 3 | 4 | 5 | 6
	as?: keyof React.JSX.IntrinsicElements
}

const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(
	({ className, level = 1, as, ...props }, ref) => {
		const Component = (as || (`h${level}` as const)) as React.ElementType
		const defaultStyles = {
			1: 'text-4xl font-bold',
			2: 'text-3xl font-bold',
			3: 'text-2xl font-bold',
			4: 'text-xl font-bold',
			5: 'text-lg font-bold',
			6: 'text-base font-bold',
		}

		return (
			<Component
				ref={ref}
				className={cn(defaultStyles[level], 'text-foreground', className)}
				{...props}
			/>
		)
	},
)
Heading.displayName = 'Heading'

export { Heading }
