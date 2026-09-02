import { setTheme } from '@tauri-apps/api/app'
import { useEffect } from 'react'

interface BackgroundSchedule {
	start(): Promise<void>
	stop(): void
}

export function useNativeShell(schedule?: BackgroundSchedule) {
	useEffect(() => {
		void schedule?.start()
		const syncTheme = () => {
			void setTheme(
				document.documentElement.classList.contains('dark') ? 'dark' : 'light',
			)
		}
		const observer = new MutationObserver(syncTheme)
		observer.observe(document.documentElement, {
			attributeFilter: ['class'],
			attributes: true,
		})
		syncTheme()
		return () => {
			observer.disconnect()
			schedule?.stop()
		}
	}, [schedule])
}
