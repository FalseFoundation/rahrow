import type { AppRuntime } from '@rahrow/features/app/runtime.tsx'
import { setTheme } from '@tauri-apps/api/app'
import { useEffect } from 'react'

import { bindDesktopTray } from './lib/desktop-tray.ts'

interface BackgroundSchedule {
	start(): Promise<void>
	stop(): void
}

export function useNativeShell(
	runtime: AppRuntime,
	schedule?: BackgroundSchedule,
) {
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
		const unbindTray = bindDesktopTray(runtime)
		return () => {
			observer.disconnect()
			unbindTray()
			schedule?.stop()
		}
	}, [runtime, schedule])
}
