/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Button } from './button.tsx'
import {
	Drawer,
	DrawerBody,
	DrawerOverlay,
	DrawerSwipeHandle,
} from './drawer.tsx'
import { Input } from './input.tsx'
import { NativeSelect, NativeSelectOption } from './native-select.tsx'
import { Ripple } from './ripple.tsx'
import { Skeleton } from './skeleton.tsx'
import { Spinner } from './spinner.tsx'

const drawerSource = readFileSync(
	new URL('./drawer.tsx', import.meta.url),
	'utf8',
)
const sonnerSource = readFileSync(
	new URL('./sonner.tsx', import.meta.url),
	'utf8',
)

describe('mobile interaction contracts', () => {
	it('lets scrollable drawers fit their content up to the viewport limit', () => {
		expect(drawerSource).toContain(
			'[--drawer-content-max-height:calc(100dvh-1rem)]',
		)
		expect(drawerSource).toContain('flex min-h-0 flex-auto flex-col')
		expect(drawerSource).toContain('min-h-0 flex-1 overflow-y-auto')
		expect(drawerSource).not.toContain('--drawer-scroll-area-max-height')
		expect(drawerSource).not.toContain('[--drawer-height:min(42rem')
	})

	it('makes the drawer body the flex scroll item without forcing a height', () => {
		const markup = renderToStaticMarkup(
			<DrawerBody>Scrollable content</DrawerBody>,
		)

		expect(markup).toContain('min-h-0 flex-1 overflow-y-auto')
		expect(markup).toContain('touch-pan-y')
	})

	it('exposes button sizes so drawer touch-target rules can preserve icon buttons', () => {
		expect(renderToStaticMarkup(<Button size='lg'>Save</Button>)).toContain(
			'data-size="lg"',
		)
		expect(renderToStaticMarkup(<Button size='icon-sm' />)).toContain(
			'data-size="icon-sm"',
		)
	})

	it('gives every button size a 44px coarse-pointer target', () => {
		for (const size of [
			'xs',
			'sm',
			'default',
			'lg',
			'icon-xs',
			'icon-sm',
			'icon',
			'icon-lg',
			'control-xl',
			'square',
			'tab',
		] as const) {
			const markup = renderToStaticMarkup(<Button size={size}>Action</Button>)

			expect(markup).toContain('[@media(pointer:coarse)]:min-h-11')
			expect(markup).toContain('[@media(pointer:coarse)]:min-w-11')
		}
	})

	it('keeps destructive buttons visibly bordered beside outline actions', () => {
		const markup = renderToStaticMarkup(
			<Button variant='destructive'>Remove</Button>,
		)

		expect(markup).toContain('border-destructive/40')
	})

	it('places toast actions on a row below their title and description', () => {
		expect(sonnerSource).toContain('grid-cols-[auto_minmax(0,1fr)_auto]')
		expect(sonnerSource).toContain('[&_[data-content]]:col-[2/-1]')
		expect(sonnerSource).toContain('[&_[data-action]]:row-start-2')
		expect(sonnerSource).toContain('[&_[data-cancel]]:row-start-2')
	})

	it('keeps inputs compact on desktop while preventing mobile focus zoom', () => {
		const input = renderToStaticMarkup(<Input />)
		const select = renderToStaticMarkup(
			<NativeSelect size='sm'>
				<NativeSelectOption>Profile</NativeSelectOption>
			</NativeSelect>,
		)

		for (const markup of [input, select]) {
			expect(markup).toContain('text-base')
			expect(markup).toContain('md:text-sm')
			expect(markup).toContain('[@media(pointer:coarse)]:min-h-11')
		}
	})
})

describe('reduced-motion contracts', () => {
	it('stops infinite loading and decorative animations without hiding content', () => {
		const skeleton = renderToStaticMarkup(<Skeleton />)
		const spinner = renderToStaticMarkup(<Spinner aria-label='Loading' />)
		const ripple = renderToStaticMarkup(<Ripple numCircles={1} />)

		expect(skeleton).toContain('motion-reduce:animate-none')
		expect(spinner).toContain('motion-reduce:animate-none')
		expect(spinner).toContain('role="status"')
		expect(ripple).toContain('motion-reduce:animate-none')
	})

	it('removes drawer transitions while preserving its overlay', () => {
		const overlay = renderToStaticMarkup(
			<Drawer open>
				<DrawerOverlay />
			</Drawer>,
		)
		const handle = renderToStaticMarkup(<DrawerSwipeHandle />)

		expect(overlay).toContain('data-slot="drawer-overlay"')
		expect(overlay).toContain('motion-reduce:transition-none')
		expect(handle).toContain('motion-reduce:transition-none')
		expect(drawerSource.match(/motion-reduce:transition-none/g)).toHaveLength(4)
	})
})
