import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '../../lib/utils'

const cardVariants = cva(
	'group/card flex flex-col gap-(--card-spacing) overflow-hidden text-sm text-card-foreground [--card-spacing:--spacing(6)] has-[>img:first-child]:pt-0 data-[size=sm]:[--card-spacing:--spacing(4)] *:[img:first-child]:rounded-t-[inherit] *:[img:last-child]:rounded-b-[inherit]',
	{
		variants: {
			variant: {
				default:
					'rounded-4xl bg-card py-(--card-spacing) shadow-md ring-1 ring-foreground/5 dark:ring-foreground/10',
				featured:
					'rounded-3xl border border-border bg-glass py-0 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl',
				glass:
					'rounded-2xl border border-border bg-glass py-0 shadow-[0_8px_32px_rgba(0,0,0,0.28)] backdrop-blur-xl',
				flat: 'rounded-none bg-transparent py-0 shadow-none ring-0',
			},
		},
		defaultVariants: { variant: 'default' },
	},
)

function Card({
	className,
	size = 'default',
	variant = 'default',
	...props
}: React.ComponentProps<'div'> &
	VariantProps<typeof cardVariants> & { size?: 'default' | 'sm' }) {
	return (
		<div
			data-slot='card'
			data-size={size}
			data-variant={variant}
			className={cn(cardVariants({ variant, className }))}
			{...props}
		/>
	)
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-header'
			className={cn(
				'group/card-header @container/card-header grid auto-rows-min items-start gap-1.5 rounded-t-4xl px-(--card-spacing) has-data-[slot=card-action]:grid-cols-[1fr_auto] has-data-[slot=card-description]:grid-rows-[auto_auto] [.border-b]:pb-(--card-spacing)',
				className,
			)}
			{...props}
		/>
	)
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-title'
			className={cn('font-heading text-base font-medium', className)}
			{...props}
		/>
	)
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-description'
			className={cn('text-sm text-muted-foreground', className)}
			{...props}
		/>
	)
}

function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-action'
			className={cn(
				'col-start-2 row-span-2 row-start-1 self-start justify-self-end',
				className,
			)}
			{...props}
		/>
	)
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-content'
			className={cn('px-(--card-spacing)', className)}
			{...props}
		/>
	)
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot='card-footer'
			className={cn(
				'flex items-center rounded-b-4xl px-(--card-spacing) [.border-t]:pt-(--card-spacing)',
				className,
			)}
			{...props}
		/>
	)
}

export {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
	cardVariants,
}
