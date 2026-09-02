'use client'

import {
	useInView,
	useMotionValue,
	useReducedMotion,
	useSpring,
} from 'motion/react'
import {
	type ComponentPropsWithoutRef,
	useEffect,
	useMemo,
	useRef,
} from 'react'
import { cn } from '../../lib/utils'

interface NumberTickerProps extends ComponentPropsWithoutRef<'span'> {
	value: number
	startValue?: number
	direction?: 'up' | 'down'
	delay?: number
	decimalPlaces?: number
}

export function NumberTicker({
	value,
	startValue = 0,
	direction = 'up',
	delay = 0,
	className,
	decimalPlaces = 0,
	...props
}: NumberTickerProps) {
	const ref = useRef<HTMLSpanElement>(null)
	const initialValue = direction === 'down' ? value : startValue
	const targetValue = direction === 'down' ? startValue : value
	const normalizedDecimalPlaces = Math.min(
		20,
		Math.max(0, Math.trunc(decimalPlaces)),
	)
	const formatter = useMemo(
		() =>
			new Intl.NumberFormat('en-US', {
				minimumFractionDigits: normalizedDecimalPlaces,
				maximumFractionDigits: normalizedDecimalPlaces,
			}),
		[normalizedDecimalPlaces],
	)
	const motionValue = useMotionValue(initialValue)
	const springValue = useSpring(motionValue, {
		damping: 60,
		stiffness: 100,
	})
	const isInView = useInView(ref, { once: true, margin: '0px' })
	const shouldReduceMotion = useReducedMotion()

	useEffect(() => {
		if (!isInView) return

		if (shouldReduceMotion) {
			if (ref.current) ref.current.textContent = formatter.format(targetValue)
			return
		}

		const timer = setTimeout(
			() => motionValue.set(targetValue),
			Math.max(0, delay) * 1000,
		)

		return () => clearTimeout(timer)
	}, [delay, formatter, isInView, motionValue, shouldReduceMotion, targetValue])

	useEffect(
		() =>
			springValue.on('change', (latest) => {
				if (ref.current) {
					ref.current.textContent = formatter.format(
						Number(latest.toFixed(normalizedDecimalPlaces)),
					)
				}
			}),
		[formatter, normalizedDecimalPlaces, springValue],
	)

	return (
		<span {...props} className={cn('inline-block tabular-nums', className)}>
			<span aria-hidden='true' ref={ref}>
				{formatter.format(initialValue)}
			</span>
			<span className='sr-only'>
				{props['aria-label'] ?? formatter.format(targetValue)}
			</span>
		</span>
	)
}
