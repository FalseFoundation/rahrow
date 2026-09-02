'use client'

import { useReducedMotion } from 'motion/react'
import {
	type ComponentPropsWithoutRef,
	useCallback,
	useEffect,
	useId,
	useRef,
} from 'react'
import { cn } from '../../lib/utils'

const morphTime = 1.5
const cooldownTime = 0.5

function useMorphingText(texts: readonly string[], paused: boolean) {
	const textIndexRef = useRef(0)
	const morphRef = useRef(0)
	const cooldownRef = useRef(0)
	const timeRef = useRef(0)
	const text1Ref = useRef<HTMLSpanElement>(null)
	const text2Ref = useRef<HTMLSpanElement>(null)

	const setStyles = useCallback(
		(fraction: number) => {
			const current1 = text1Ref.current
			const current2 = text2Ref.current
			if (!current1 || !current2) return

			const safeFraction = Math.min(1, Math.max(0.001, fraction))
			const invertedFraction = Math.max(0.001, 1 - safeFraction)
			current2.style.filter = `blur(${Math.min(8 / safeFraction - 8, 100)}px)`
			current2.style.opacity = `${safeFraction ** 0.4}`
			current1.style.filter = `blur(${Math.min(8 / invertedFraction - 8, 100)}px)`
			current1.style.opacity = `${invertedFraction ** 0.4}`
			current1.textContent = texts[textIndexRef.current % texts.length] ?? ''
			current2.textContent = texts[(textIndexRef.current + 1) % texts.length] ?? ''
		},
		[texts],
	)

	useEffect(() => {
		if (paused || texts.length < 2) return

		let animationFrameId = 0
		timeRef.current = performance.now()
		const animate = (now: number) => {
			animationFrameId = requestAnimationFrame(animate)
			const delta = (now - timeRef.current) / 1000
			timeRef.current = now
			cooldownRef.current -= delta

			if (cooldownRef.current <= 0) {
				morphRef.current -= cooldownRef.current
				cooldownRef.current = 0
				const fraction = Math.min(1, morphRef.current / morphTime)
				setStyles(fraction)
				if (fraction === 1) {
					cooldownRef.current = cooldownTime
					textIndexRef.current += 1
				}
			} else {
				morphRef.current = 0
				const current1 = text1Ref.current
				const current2 = text2Ref.current
				if (current1 && current2) {
					current1.style.filter = 'none'
					current1.style.opacity = '0'
					current2.style.filter = 'none'
					current2.style.opacity = '1'
				}
			}
		}

		animationFrameId = requestAnimationFrame(animate)
		return () => cancelAnimationFrame(animationFrameId)
	}, [paused, setStyles, texts.length])

	return { text1Ref, text2Ref }
}

export interface MorphingTextProps extends ComponentPropsWithoutRef<'div'> {
	readonly texts: readonly string[]
	readonly variant?: 'default' | 'compact'
}

export function MorphingText({
	texts,
	className,
	variant = 'default',
	'aria-label': ariaLabel,
	...props
}: MorphingTextProps) {
	const reducedMotion = useReducedMotion() === true
	const safeTexts = texts.length > 0 ? texts : ['']
	const visibleText = safeTexts[0] ?? ''
	const accessibleText = ariaLabel ?? visibleText
	const filterId = `morphing-text-${useId().replaceAll(':', '')}`
	const { text1Ref, text2Ref } = useMorphingText(safeTexts, reducedMotion)

	return (
		<div
			{...props}
			aria-label={accessibleText}
			className={cn(
				'relative mx-auto w-full text-center font-sans leading-none font-bold',
				variant === 'compact'
					? 'h-8 max-w-full text-2xl leading-8 font-extrabold'
					: 'h-16 max-w-3xl text-[40pt] md:h-24 lg:text-[6rem]',
				className,
			)}
			role='status'
		>
			{reducedMotion || safeTexts.length < 2 ? (
				<span aria-hidden='true'>{visibleText}</span>
			) : (
				<div aria-hidden='true' style={{ filter: `url(#${filterId}) blur(0.6px)` }}>
					<span
						className='absolute inset-x-0 top-0 m-auto inline-block w-full'
						ref={text1Ref}
					>
						{safeTexts[0]}
					</span>
					<span
						className='absolute inset-x-0 top-0 m-auto inline-block w-full'
						ref={text2Ref}
					>
						{safeTexts[1] ?? safeTexts[0]}
					</span>
				</div>
			)}
			<span className='sr-only'>{accessibleText}</span>
			<svg className='fixed size-0' aria-hidden='true'>
				<defs>
					<filter id={filterId}>
						<feColorMatrix
							in='SourceGraphic'
							type='matrix'
							values='1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 255 -140'
						/>
					</filter>
				</defs>
			</svg>
		</div>
	)
}
