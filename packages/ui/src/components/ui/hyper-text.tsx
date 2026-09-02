'use client'

import {
	AnimatePresence,
	type DOMMotionComponents,
	type HTMLMotionProps,
	type MotionProps,
	motion,
	useReducedMotion,
} from 'motion/react'
import {
	type ComponentType,
	type RefAttributes,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { cn } from '../../lib/utils'

type CharacterSet = readonly string[]

const motionElements = {
	article: motion.article,
	div: motion.div,
	h1: motion.h1,
	h2: motion.h2,
	h3: motion.h3,
	h4: motion.h4,
	h5: motion.h5,
	h6: motion.h6,
	li: motion.li,
	p: motion.p,
	section: motion.section,
	span: motion.span,
} as const

type MotionElementType = Extract<
	keyof DOMMotionComponents,
	keyof typeof motionElements
>
type HyperTextMotionComponent = ComponentType<
	Omit<HTMLMotionProps<'div'>, 'ref'> & RefAttributes<HTMLElement>
>

interface HyperTextProps extends Omit<MotionProps, 'children'> {
	children: string
	className?: string
	duration?: number
	delay?: number
	as?: MotionElementType
	startOnView?: boolean
	animateOnHover?: boolean
	characterSet?: CharacterSet
}

const DEFAULT_CHARACTER_SET = Object.freeze(
	'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''),
) as readonly string[]

const getRandomCharacter = (characterSet: CharacterSet) =>
	characterSet[Math.floor(Math.random() * characterSet.length)] ?? ''

export function HyperText({
	children,
	className,
	duration = 800,
	delay = 0,
	as: Component = 'div',
	startOnView = false,
	animateOnHover = true,
	characterSet = DEFAULT_CHARACTER_SET,
	...props
}: HyperTextProps) {
	const MotionComponent = motionElements[Component] as HyperTextMotionComponent
	const graphemes = useMemo(() => Array.from(children), [children])
	const availableCharacters =
		characterSet.length > 0 ? characterSet : DEFAULT_CHARACTER_SET
	const [displayText, setDisplayText] = useState(() => graphemes)
	const [isAnimating, setIsAnimating] = useState(false)
	const iterationCount = useRef(0)
	const elementRef = useRef<HTMLElement | null>(null)
	const shouldReduceMotion = useReducedMotion()

	const handleAnimationTrigger = () => {
		if (animateOnHover && !isAnimating && !shouldReduceMotion) {
			iterationCount.current = 0
			setIsAnimating(true)
		}
	}

	useEffect(() => {
		setDisplayText(graphemes)
		setIsAnimating(false)
	}, [children])

	useEffect(() => {
		if (shouldReduceMotion) {
			setDisplayText(graphemes)
			return
		}

		let startTimer: ReturnType<typeof setTimeout> | undefined
		const startAnimation = () => {
			startTimer = setTimeout(() => setIsAnimating(true), Math.max(0, delay))
		}

		if (!startOnView) {
			startAnimation()
			return () => {
				if (startTimer) clearTimeout(startTimer)
			}
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					startAnimation()
					observer.disconnect()
				}
			},
			{ threshold: 0.1, rootMargin: '-30% 0px -30% 0px' },
		)

		if (elementRef.current) observer.observe(elementRef.current)

		return () => {
			observer.disconnect()
			if (startTimer) clearTimeout(startTimer)
		}
	}, [delay, shouldReduceMotion, startOnView])

	useEffect(() => {
		if (!isAnimating) return

		let animationFrameId: number | undefined
		const startTime = performance.now()
		const normalizedDuration = Math.max(1, duration)

		const animate = (currentTime: number) => {
			const progress = Math.min((currentTime - startTime) / normalizedDuration, 1)
			iterationCount.current = progress * graphemes.length
			setDisplayText((currentText) =>
				currentText.map((letter, index) =>
					letter === ' '
						? letter
						: index <= iterationCount.current
							? (graphemes[index] ?? '')
							: getRandomCharacter(availableCharacters),
				),
			)

			if (progress < 1) animationFrameId = requestAnimationFrame(animate)
			else setIsAnimating(false)
		}

		animationFrameId = requestAnimationFrame(animate)
		return () => {
			if (animationFrameId !== undefined) cancelAnimationFrame(animationFrameId)
		}
	}, [availableCharacters, duration, graphemes, isAnimating])

	return (
		<MotionComponent
			{...props}
			ref={elementRef}
			aria-label={children}
			className={cn('inline-block overflow-hidden', className)}
			onFocus={handleAnimationTrigger}
			onMouseEnter={handleAnimationTrigger}
		>
			<AnimatePresence>
				{displayText.map((letter, index) => (
					<motion.span aria-hidden='true' key={`${index}-${graphemes[index]}`}>
						{letter}
					</motion.span>
				))}
			</AnimatePresence>
		</MotionComponent>
	)
}
