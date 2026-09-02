import {
	ThemeProvider,
	useTheme,
} from '@rahrow/ui/components/theme-provider.tsx'
import { Toaster } from '@rahrow/ui/components/ui/sonner.tsx'
import { QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from '@tanstack/react-router'
import { useEffect, useMemo } from 'react'

import { AdGateOutlet } from '../ads/AdGateOutlet.tsx'
import {
	APP_TOAST_MOBILE_OFFSET,
	APP_TOAST_OFFSET,
	AppOverlayPositioning,
} from './AppOverlayPositioning.tsx'
import { AppLocaleProvider } from './app-i18n.tsx'
import { createAppRouter } from './router.tsx'
import { type AppRuntime, AppRuntimeProvider } from './runtime.tsx'
import { useAppShellResources } from './useAppShellResources.ts'

export function AppShell({ runtime }: { readonly runtime: AppRuntime }) {
	const resources = useAppShellResources(runtime)
	const router = useMemo(
		() => createAppRouter(resources.runtime),
		[resources.runtime],
	)

	return (
		<AppLocaleProvider>
			<ThemeProvider defaultTheme='system' storageKey='rahrow-theme'>
				{resources.localeReady ? (
					<>
						<RuntimeTheme runtime={resources.runtime} />
						<AppRuntimeProvider runtime={resources.runtime}>
							<QueryClientProvider client={resources.queryClient}>
								<AppOverlayPositioning>
									<RouterProvider router={router} />
									{resources.runtime.advertising ? (
										<AdGateOutlet {...resources.runtime.advertising} />
									) : null}
									<Toaster
										offset={APP_TOAST_OFFSET}
										mobileOffset={APP_TOAST_MOBILE_OFFSET}
									/>
								</AppOverlayPositioning>
							</QueryClientProvider>
						</AppRuntimeProvider>
					</>
				) : null}
			</ThemeProvider>
		</AppLocaleProvider>
	)
}

function RuntimeTheme({ runtime }: { readonly runtime: AppRuntime }) {
	const { setTheme } = useTheme()

	useEffect(() => {
		let active = true
		void runtime.settingsStore
			.read()
			.then((settings) => {
				if (active && settings.theme) setTheme(settings.theme)
			})
			.catch(() => undefined)
		return () => {
			active = false
		}
	}, [runtime.settingsStore, setTheme])

	return null
}
