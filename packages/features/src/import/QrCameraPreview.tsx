import { Button } from '@rahrow/ui/components/ui/button.tsx'
import { useEffect, useRef, useState } from 'react'
import { useAppTranslation } from '../app/app-i18n.tsx'
import styles from './QrCameraPreview.module.css'

export interface QrCameraPreviewPort {
	startPreview(input: QrCameraPreviewRect): Promise<void>
	stopPreview(): Promise<void>
	openSettings?(): Promise<void>
}

export interface QrCameraPreviewRect {
	readonly x: number
	readonly y: number
	readonly width: number
	readonly height: number
	readonly pixelRatio: number
}

export interface QrCameraPreviewProps {
	readonly camera: QrCameraPreviewPort
	readonly active?: boolean
}

export function QrCameraPreview({
	camera,
	active = true,
}: QrCameraPreviewProps) {
	const { t } = useAppTranslation()
	const previewRef = useRef<HTMLDivElement>(null)
	const [error, setError] = useState<string>()
	const [retryAttempt, setRetryAttempt] = useState(0)

	useEffect(() => {
		if (!active) return
		const preview = previewRef.current
		if (!preview) return

		let frame: number | undefined
		let disposed = false
		let startPending = false
		let needsUpdate = false
		const startPreview = async () => {
			if (startPending) {
				needsUpdate = true
				return
			}
			const rect = preview.getBoundingClientRect()
			if (rect.width <= 0 || rect.height <= 0) {
				await camera.stopPreview().catch(() => undefined)
				return
			}
			startPending = true
			try {
				await camera.startPreview({
					x: rect.left,
					y: rect.top,
					width: rect.width,
					height: rect.height,
					pixelRatio: globalThis.devicePixelRatio || 1,
				})
				if (!disposed) setError(undefined)
			} catch {
				if (!disposed) {
					setError(t('import.errors.cameraUnavailable'))
				}
			} finally {
				startPending = false
				if (needsUpdate && !disposed) {
					needsUpdate = false
					void startPreview()
				}
			}
		}
		const updatePreview = () => {
			if (frame !== undefined) return
			frame = requestAnimationFrame(() => {
				frame = undefined
				if (!disposed && document.visibilityState !== 'hidden') {
					void startPreview()
				}
			})
		}
		const handleVisibility = () => {
			if (document.visibilityState === 'hidden') {
				void camera.stopPreview().catch(() => undefined)
				return
			}
			updatePreview()
		}
		const observer = new ResizeObserver(updatePreview)
		observer.observe(preview)
		window.addEventListener('resize', updatePreview)
		window.addEventListener('scroll', updatePreview, true)
		document.addEventListener('visibilitychange', handleVisibility)
		updatePreview()

		return () => {
			disposed = true
			if (frame !== undefined) cancelAnimationFrame(frame)
			observer.disconnect()
			window.removeEventListener('resize', updatePreview)
			window.removeEventListener('scroll', updatePreview, true)
			document.removeEventListener('visibilitychange', handleVisibility)
			void camera.stopPreview().catch(() => undefined)
		}
	}, [active, camera, retryAttempt, t])

	return (
		<div ref={previewRef} className={styles.preview}>
			{error ? (
				<div className={styles.error}>
					<p role='alert' aria-atomic='true'>
						{error}
					</p>
					<p>{t('import.errors.cameraRecovery')}</p>
					<div className={styles.actions}>
						<Button
							variant='outline'
							onClick={() => setRetryAttempt((attempt) => attempt + 1)}
						>
							{t('import.qr.tryCamera')}
						</Button>
						{camera.openSettings ? (
							<Button variant='outline' onClick={() => void camera.openSettings?.()}>
								{t('import.qr.openSettings')}
							</Button>
						) : null}
					</div>
				</div>
			) : null}
		</div>
	)
}
