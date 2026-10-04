import { invoke } from '@tauri-apps/api/core'

const PORT_SEARCH_SPAN = 50

/**
 * Prefer the configured local SOCKS port; if another app already owns it
 * (common with v2rayN on 10808), walk forward to the next free loopback port.
 */
export async function resolveAvailableLoopbackPort(
	preferred: number,
	isListening: (port: number) => Promise<boolean> = loopbackPortIsListening,
	identifyOccupant: (
		port: number,
	) => Promise<string | null> = loopbackPortOccupant,
): Promise<number> {
	const start =
		Number.isFinite(preferred) && preferred >= 1 && preferred <= 65535
			? Math.trunc(preferred)
			: 10808

	for (
		let port = start;
		port <= Math.min(start + PORT_SEARCH_SPAN - 1, 65535);
		port += 1
	) {
		if (!(await isListening(port))) return port
	}

	const occupant = await identifyOccupant(start).catch(() => null)
	if (occupant) {
		throw new Error(
			`Local port ${start} is already in use by ${occupant}. Stop ${occupant}, or change RahRow's local port in Settings.`,
		)
	}

	throw new Error(
		`Local port ${start} is already in use. Stop the other local proxy, or change RahRow's local port in Settings.`,
	)
}

async function loopbackPortIsListening(port: number): Promise<boolean> {
	// Unit tests drive fakes without Tauri IPC.
	if (!('__TAURI_INTERNALS__' in globalThis)) return false

	const probe = await invoke<{
		readonly reachable: boolean
	}>('rahrow_tcp_probe', {
		host: '127.0.0.1',
		port,
	})
	return probe.reachable === true
}

async function loopbackPortOccupant(port: number): Promise<string | null> {
	if (!('__TAURI_INTERNALS__' in globalThis)) return null
	const name = await invoke<string | null>('rahrow_loopback_port_occupant', {
		port,
	})
	return typeof name === 'string' && name.trim() ? name : null
}
