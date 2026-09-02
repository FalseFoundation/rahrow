import { Input as InputPrimitive } from '@base-ui/react/input'
import type * as React from 'react'
import { cn } from '../../lib/utils'

type InputProps = React.ComponentProps<'input'> & {
	readonly technical?: boolean
}

const ltrInputTypes = new Set(['email', 'number', 'tel', 'url'])
const ltrInputModes = new Set(['decimal', 'email', 'numeric', 'tel', 'url'])

function Input({
	className,
	type = 'text',
	dir,
	inputMode,
	technical = false,
	...props
}: InputProps) {
	const direction =
		dir ??
		(technical ||
		ltrInputTypes.has(type) ||
		(inputMode ? ltrInputModes.has(inputMode) : false)
			? 'ltr'
			: undefined)

	return (
		<InputPrimitive
			type={type}
			dir={direction}
			inputMode={inputMode}
			data-technical={technical || undefined}
			data-slot='input'
			className={cn(
				'h-9 w-full min-w-0 select-text rounded-3xl border border-transparent bg-input/50 px-3 py-1 text-base transition-[color,box-shadow,background-color] outline-none [@media(pointer:coarse)]:min-h-11 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40',
				className,
			)}
			{...props}
		/>
	)
}

export { Input, type InputProps }
