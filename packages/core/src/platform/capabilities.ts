export interface Clipboard {
	readonly supported?: boolean
	read(): Promise<string>
	write(value: string): Promise<void>
}

export interface ShareInput {
	readonly title?: string
	readonly text: string
}

export interface Share {
	share(input: ShareInput): Promise<void>
}

/** Opens a vetted external URL at the application platform boundary. */
export interface ExternalNavigation {
	open(target: string): Promise<void>
}

export interface FileSaveInput {
	readonly dataUrl: string
	readonly filename: string
}

export interface FileSave {
	save(input: FileSaveInput): Promise<'saved' | 'cancelled'>
}

export interface FilePickResult {
	readonly filename: string
	readonly text: string
}

export interface FilePick {
	pick(input: {
		readonly accept: readonly string[]
	}): Promise<FilePickResult | null>
}

export interface QrEncoder {
	encode(value: string): Promise<unknown>
}

export interface QrDecoder {
	decode(input: unknown): Promise<string>
}

export interface NotificationInput {
	readonly title: string
	readonly body?: string
}

export interface Notifications {
	notify(input: NotificationInput): Promise<void>
}

export interface NetworkIdentitySnapshot {
	readonly localAddresses: readonly string[]
}

/**
 * Reads addresses selected by the native platform from the active underlying
 * network. This contract intentionally cannot report a public or tunnel exit
 * address; those require a separate, explicit external observer.
 */
export interface NetworkIdentity {
	snapshot(): Promise<NetworkIdentitySnapshot>
}

export interface VpnInput {
	readonly profileId: string
}

export interface VpnStatus {
	readonly connected: boolean
	readonly supported?: boolean
	readonly detail?: string
}

export interface Vpn {
	connect(input: VpnInput): Promise<void>
	disconnect(): Promise<void>
	status(): Promise<VpnStatus>
	/** Opens the operating system's VPN settings, where Always-on VPN lives. */
	openSystemSettings?(): Promise<void>
}

export interface ToggleStatus {
	readonly enabled: boolean
	readonly supported: boolean
	readonly detail?: string
}

export interface Autostart {
	enable(): Promise<void>
	disable(): Promise<void>
	status(): Promise<ToggleStatus>
}

export interface SystemProxy {
	enable(input: { readonly host: string; readonly port: number }): Promise<void>
	disable(): Promise<void>
	status(): Promise<ToggleStatus>
}

/**
 * Canonical IDs for behavior that crosses a RahRow platform boundary.
 * Adding an ID makes the native-action inventory require evidence for it on
 * every supported product platform before it can be advertised.
 */
export const nativeActionIds = [
	'clipboard.read',
	'clipboard.write',
	'clipboard.paste',
	'qr.camera.permission',
	'qr.camera.preview',
	'qr.decode',
	'qr.encode',
	'share.system',
	'file.save',
	'file.download',
	'file.pick',
	'link.external.open',
	'link.email.open',
	'notification.show',
	'haptics.impact',
	'autostart.manage',
	'tray.manage',
	'network.lan.address',
	'network.lan.listener',
	'network.firewall.manage',
	'engine.runtime.process',
	'vpn.tunnel',
	'proxy.system',
	'diagnostics.native',
	'diagnostics.status',
] as const

export type NativeActionId = (typeof nativeActionIds)[number]
