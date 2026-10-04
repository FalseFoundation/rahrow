import type { AppRuntime } from '@rahrow/features/app/runtime.tsx'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

import type { DesktopTraySyncInput } from './platform-capabilities.ts'

const TRAY_EVENT = 'rahrow-tray'

function profileLabel(
	runtime: AppRuntime,
	profileId: string | undefined,
): Promise<string | undefined> {
	if (!profileId) return Promise.resolve(undefined)
	return runtime.profileStore.get(profileId).then((profile) => {
		if (!profile) return undefined
		return (
			profile.metadata?.name ??
			`${profile.protocol} ${profile.endpoint.host}:${profile.endpoint.port}`
		)
	})
}

async function pushTraySync(input: DesktopTraySyncInput): Promise<void> {
	if (!('__TAURI_INTERNALS__' in globalThis)) return
	await invoke('rahrow_tray_sync', { input })
}

export async function syncDesktopTray(runtime: AppRuntime): Promise<void> {
	const [snapshot, settings] = await Promise.all([
		runtime.connection.status(),
		runtime.settingsStore.read(),
	])
	const connected =
		snapshot.state === 'connected' || snapshot.state === 'connecting'
	const profileId = snapshot.profileId ?? settings.activeProfileId ?? undefined
	const label = await profileLabel(runtime, profileId)

	await pushTraySync({
		connected: snapshot.state === 'connected',
		profileLabel: label,
		canConnect:
			!connected && Boolean(profileId) && snapshot.state !== 'disconnecting',
		canDisconnect:
			snapshot.state === 'connected' || snapshot.state === 'connecting',
	})
}

export async function handleDesktopTrayAction(
	runtime: AppRuntime,
	action: string,
): Promise<void> {
	if (action === 'disconnect') {
		await runtime.connection.disconnect()
		await syncDesktopTray(runtime)
		return
	}
	if (action !== 'connect') return

	const settings = await runtime.settingsStore.read()
	const profiles = await runtime.profileStore.list()
	const profile =
		profiles.find((item) => item.id === settings.activeProfileId) ?? profiles[0]
	if (!profile) return

	const connectionMode = settings.connectionMode ?? 'vpn'
	const connectOptions = {
		localPort: settings.localPort ?? 10808,
		mode: connectionMode,
		engineId: settings.engineId ?? 'sing-box',
	}
	await runtime.connection.canConnect?.(profile, connectOptions)
	await runtime.connection.connect(profile, connectOptions)
	await syncDesktopTray(runtime)
}

/** Keep the tray menu in sync and honor Connect/Disconnect without opening the window. */
export function bindDesktopTray(runtime: AppRuntime): () => void {
	let cancelled = false
	let unlisten: (() => void) | undefined
	const sync = () => {
		void syncDesktopTray(runtime).catch(() => undefined)
	}

	if ('__TAURI_INTERNALS__' in globalThis) {
		void listen<string>(TRAY_EVENT, (event) => {
			void handleDesktopTrayAction(runtime, event.payload)
				.catch(() => undefined)
				.finally(sync)
		}).then((stop) => {
			if (cancelled) {
				stop()
				return
			}
			unlisten = stop
		})
	}

	sync()
	const timer = window.setInterval(sync, 4_000)
	const onVisibility = () => {
		if (document.visibilityState === 'visible') sync()
	}
	document.addEventListener('visibilitychange', onVisibility)

	return () => {
		cancelled = true
		unlisten?.()
		window.clearInterval(timer)
		document.removeEventListener('visibilitychange', onVisibility)
	}
}
