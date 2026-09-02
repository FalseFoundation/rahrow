import type { RefObject } from 'react'
import { useEffect, useRef, useState } from 'react'

const REFRESH_THRESHOLD = 68
const MAX_PULL_DISTANCE = 96

export function usePullToRefresh(
	viewportRef: RefObject<HTMLDivElement | null>,
	onRefresh: () => Promise<void>,
) {
	const [distance, setDistance] = useState(0)
	const [refreshing, setRefreshing] = useState(false)
	const mountedRef = useRef(true)

	useEffect(() => {
		mountedRef.current = true
		return () => {
			mountedRef.current = false
		}
	}, [])

	useEffect(() => {
		const viewport = viewportRef.current
		if (!viewport) return undefined

		let pointerId: number | null = null
		let touchActive = false
		let startY = 0
		let currentDistance = 0
		let pendingDistance = 0
		let animationFrame: number | null = null

		const cancelPendingVisualUpdate = () => {
			if (animationFrame === null) return
			cancelAnimationFrame(animationFrame)
			animationFrame = null
		}
		const scheduleVisualUpdate = (nextDistance: number) => {
			pendingDistance = nextDistance
			if (animationFrame !== null) return
			animationFrame = requestAnimationFrame(() => {
				animationFrame = null
				setDistance(pendingDistance)
			})
		}

		const reset = () => {
			pointerId = null
			touchActive = false
			currentDistance = 0
			cancelPendingVisualUpdate()
			setDistance(0)
		}
		const begin = (clientY: number) => {
			startY = clientY
			currentDistance = 0
		}
		const move = (clientY: number, preventDefault: () => void) => {
			if (viewport.scrollTop > 0) return
			const delta = clientY - startY
			if (delta <= 0) {
				currentDistance = 0
				scheduleVisualUpdate(0)
				return
			}
			preventDefault()
			currentDistance = Math.min(MAX_PULL_DISTANCE, delta * 0.48)
			scheduleVisualUpdate(currentDistance)
		}
		const finishGesture = () => {
			if (currentDistance < REFRESH_THRESHOLD) {
				reset()
				return
			}
			pointerId = null
			touchActive = false
			cancelPendingVisualUpdate()
			setDistance(44)
			setRefreshing(true)
			void onRefresh().finally(() => {
				if (!mountedRef.current) return
				setRefreshing(false)
				setDistance(0)
			})
		}
		const onPointerDown = (event: PointerEvent) => {
			if (
				refreshing ||
				(event.pointerType !== 'pen' && event.pointerType !== '') ||
				viewport.scrollTop > 0 ||
				pointerId !== null
			) {
				return
			}
			pointerId = event.pointerId
			begin(event.clientY)
		}
		const onPointerMove = (event: PointerEvent) => {
			if (event.pointerId !== pointerId || viewport.scrollTop > 0) return
			move(event.clientY, () => event.preventDefault())
		}
		const finishPointer = (event: PointerEvent) => {
			if (event.pointerId !== pointerId) return
			finishGesture()
		}
		const onTouchStart = (event: TouchEvent) => {
			const touch = event.touches[0]
			if (
				!touch ||
				event.touches.length !== 1 ||
				refreshing ||
				viewport.scrollTop > 0 ||
				touchActive
			) {
				return
			}
			touchActive = true
			begin(touch.clientY)
		}
		const onTouchMove = (event: TouchEvent) => {
			const touch = event.touches[0]
			if (!touchActive || !touch) return
			move(touch.clientY, () => event.preventDefault())
		}
		const finishTouch = () => {
			if (!touchActive) return
			finishGesture()
		}
		const cancelTouch = () => {
			touchActive = false
			reset()
		}

		viewport.addEventListener('pointerdown', onPointerDown)
		viewport.addEventListener('pointermove', onPointerMove, { passive: false })
		viewport.addEventListener('pointerup', finishPointer)
		viewport.addEventListener('pointercancel', reset)
		viewport.addEventListener('touchstart', onTouchStart, { passive: true })
		viewport.addEventListener('touchmove', onTouchMove, { passive: false })
		viewport.addEventListener('touchend', finishTouch)
		viewport.addEventListener('touchcancel', cancelTouch)

		return () => {
			viewport.removeEventListener('pointerdown', onPointerDown)
			viewport.removeEventListener('pointermove', onPointerMove)
			viewport.removeEventListener('pointerup', finishPointer)
			viewport.removeEventListener('pointercancel', reset)
			viewport.removeEventListener('touchstart', onTouchStart)
			viewport.removeEventListener('touchmove', onTouchMove)
			viewport.removeEventListener('touchend', finishTouch)
			viewport.removeEventListener('touchcancel', cancelTouch)
			cancelPendingVisualUpdate()
		}
	}, [onRefresh, refreshing, viewportRef])

	return {
		distance,
		refreshing,
		armed: distance >= REFRESH_THRESHOLD,
	}
}
