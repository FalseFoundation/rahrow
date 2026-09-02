import { ScrollArea as ScrollAreaPrimitive } from '@base-ui/react/scroll-area'
import type * as React from 'react'
import { cn } from '../../lib/utils'

const viewportInteractionByScrollbars = {
	vertical: 'touch-pan-y scroll-fade-b',
	horizontal: 'touch-pan-x scroll-fade-x',
	both: 'touch-auto scroll-fade',
} as const

function ScrollArea({
	className,
	children,
	scrollbars = 'vertical',
	viewportRef,
	...props
}: ScrollAreaPrimitive.Root.Props & {
	scrollbars?: 'vertical' | 'horizontal' | 'both'
	viewportRef?: React.Ref<HTMLDivElement>
}) {
	const hasVerticalScrollbar = scrollbars === 'vertical' || scrollbars === 'both'
	const hasHorizontalScrollbar =
		scrollbars === 'horizontal' || scrollbars === 'both'
	const viewportInteraction = viewportInteractionByScrollbars[scrollbars]

	return (
		<ScrollAreaPrimitive.Root
			data-slot='scroll-area'
			className={cn(
				'group/scroll-area relative min-h-0 min-w-0 overflow-hidden',
				className,
			)}
			{...props}
		>
			<ScrollAreaPrimitive.Viewport
				ref={viewportRef}
				data-slot='scroll-area-viewport'
				className={cn(
					'size-full min-h-0 min-w-0 overscroll-contain rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1',
					viewportInteraction,
				)}
			>
				{children}
			</ScrollAreaPrimitive.Viewport>
			{hasVerticalScrollbar && <ScrollBar orientation='vertical' />}
			{hasHorizontalScrollbar && <ScrollBar orientation='horizontal' />}
			{scrollbars === 'both' && <ScrollAreaPrimitive.Corner />}
		</ScrollAreaPrimitive.Root>
	)
}

function ScrollBar({
	className,
	orientation = 'vertical',
	...props
}: ScrollAreaPrimitive.Scrollbar.Props) {
	return (
		<ScrollAreaPrimitive.Scrollbar
			data-slot='scroll-area-scrollbar'
			data-orientation={orientation}
			orientation={orientation}
			className={cn(
				'flex touch-none p-px opacity-0 transition-[color,opacity] duration-150 ease-out select-none group-focus-within/scroll-area:opacity-100 group-hover/scroll-area:opacity-100 group-data-[scrolling]/scroll-area:opacity-100 motion-reduce:transition-none data-horizontal:h-2.5 data-horizontal:flex-col data-horizontal:border-t data-horizontal:border-t-transparent data-vertical:h-full data-vertical:w-2.5 data-vertical:border-s data-vertical:border-s-transparent',
				className,
			)}
			{...props}
		>
			<ScrollAreaPrimitive.Thumb
				data-slot='scroll-area-thumb'
				className='relative flex-1 rounded-full bg-border transition-colors hover:bg-muted motion-reduce:transition-none'
			/>
		</ScrollAreaPrimitive.Scrollbar>
	)
}

export { ScrollArea, ScrollBar }
