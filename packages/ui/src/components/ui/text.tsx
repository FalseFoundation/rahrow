import { mergeProps } from '@base-ui/react/merge-props'
import { useRender } from '@base-ui/react/use-render'
import { cn } from '../../lib/utils'

function Text({ className, render, ...props }: useRender.ComponentProps<'p'>) {
	return useRender({
		defaultTagName: 'p',
		props: mergeProps<'p'>(
			{
				className: cn('text-base', className),
			},
			props,
		),
		render,
		state: {
			slot: 'text',
		},
	})
}

export { Text }
