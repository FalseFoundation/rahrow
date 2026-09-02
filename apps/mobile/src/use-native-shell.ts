import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor, SystemBars, SystemBarsStyle } from '@capacitor/core'
import { useEffect } from 'react'

interface BackgroundSchedule {
	start(): Promise<void>
	resume(): Promise<void>
	stop(): void
}

interface AppActivationSource {
	addListener(
		event: 'appStateChange',
		listener: (state: { readonly isActive: boolean }) => void,
	): Promise<{ remove(): Promise<void> }>
}

export function observeAppActivation(
	schedule: Pick<BackgroundSchedule, 'resume'>,
	source: AppActivationSource = CapacitorApp,
): () => void {
	let disposed = false
	let removeListener: (() => Promise<void>) | undefined
	void source
		.addListener('appStateChange', ({ isActive }) => {
			if (isActive) void schedule.resume()
		})
		.then((handle) => {
			if (disposed) void handle.remove()
			else removeListener = () => handle.remove()
		})

	return () => {
		disposed = true
		void removeListener?.()
	}
}

export function handleAndroidBack(canGoBack: boolean) {
	if (canGoBack) {
		window.history.back()
		return
	}
	void CapacitorApp.minimizeApp()
}

export function useNativeShell(schedule?: BackgroundSchedule) {
	useEffect(() => {
		void schedule?.start()
		if (!Capacitor.isNativePlatform()) return () => schedule?.stop()

		const syncSystemBars = () => {
			const dark = document.documentElement.classList.contains('dark')
			void SystemBars.setStyle({
				style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
			})
		}
		const observer = new MutationObserver(syncSystemBars)
		observer.observe(document.documentElement, {
			attributeFilter: ['class'],
			attributes: true,
		})
		syncSystemBars()

		let disposed = false
		let removeBackListener: (() => Promise<void>) | undefined
		const stopObservingActivation = schedule
			? observeAppActivation(schedule)
			: undefined
		if (Capacitor.getPlatform() === 'android') {
			void CapacitorApp.addListener('backButton', ({ canGoBack }) => {
				handleAndroidBack(canGoBack)
			}).then((handle) => {
				if (disposed) void handle.remove()
				else removeBackListener = () => handle.remove()
			})
		}

		return () => {
			disposed = true
			observer.disconnect()
			void removeBackListener?.()
			stopObservingActivation?.()
			schedule?.stop()
		}
	}, [schedule])
}
