import { Button as ButtonPrimitive } from '@base-ui/react/button'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
	"group/button inline-flex shrink-0 items-center justify-center rounded-4xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:min-w-11 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
	{
		variants: {
			variant: {
				default: 'bg-primary text-primary-foreground hover:bg-primary/80',
				outline:
					'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-transparent dark:hover:bg-input/30',
				secondary:
					'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',
				ghost:
					'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',
				destructive:
					'border-destructive/40 bg-destructive/10 text-destructive hover:border-destructive/60 hover:bg-destructive/20 focus-visible:border-destructive focus-visible:ring-destructive/20 dark:border-destructive/50 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',
				link: 'text-primary underline-offset-4 hover:underline',
				status:
					'border-foreground/15 bg-foreground/5 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-foreground/10 data-[connected=true]:border-transparent data-[connected=true]:bg-primary data-[connected=true]:text-primary-foreground data-[connected=true]:shadow-[0_16px_40px_rgba(0,0,0,0.45)]',
				toolbar:
					'bg-foreground/6 text-foreground backdrop-blur-xl hover:bg-foreground/10 data-[active=true]:bg-foreground/8 data-[active=true]:text-primary',
				navigation:
					'bg-transparent text-dim hover:bg-foreground/8 hover:text-foreground data-[active=true]:bg-foreground/12 data-[active=true]:text-primary',
				surface:
					'border-border bg-glass text-foreground shadow-[0_8px_32px_rgba(0,0,0,0.28)] backdrop-blur-2xl hover:bg-accent hover:text-foreground',
			},
			size: {
				default:
					'h-9 gap-1.5 px-3 has-data-[icon=inline-end]:pe-2.5 has-data-[icon=inline-start]:ps-2.5',
				xs: "h-6 gap-1 px-2.5 text-xs has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2 [&_svg:not([class*='size-'])]:size-3",
				sm: 'h-8 gap-1 px-3 has-data-[icon=inline-end]:pe-2 has-data-[icon=inline-start]:ps-2',
				lg: 'h-10 gap-1.5 px-4 has-data-[icon=inline-end]:pe-3 has-data-[icon=inline-start]:ps-3',
				icon: 'rounded-full size-9',
				'icon-xs': "rounded-full size-9 [&_svg:not([class*='size-'])]:size-3",
				'icon-sm': 'rounded-full size-9',
				'icon-lg': 'rounded-full size-9',
				'control-xl':
					"size-26 rounded-full [&_svg:not([class*='size-'])]:size-10.5",
				square: 'size-9 rounded-full',
				tab: 'h-full flex-1 flex-col gap-0.5 rounded-full px-2 text-10',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
		},
	},
)

function Button({
	className,
	variant = 'default',
	size = 'default',
	...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
	return (
		<ButtonPrimitive
			data-slot='button'
			data-size={size}
			className={cn(buttonVariants({ variant, size, className }))}
			{...props}
		/>
	)
}

export { Button, buttonVariants }
