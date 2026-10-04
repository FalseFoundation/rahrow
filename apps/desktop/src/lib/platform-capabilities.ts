import { RahrowError } from '@rahrow/core/errors.ts'
import {
	createBrowserFilePick,
	createBrowserFileSave,
} from '@rahrow/core/platform/browser-file-capabilities.ts'
import type {
	Autostart,
	Clipboard,
	ExternalNavigation,
	FilePick,
	FilePickResult,
	FileSave,
	FileSaveInput,
	NetworkIdentity,
	NetworkIdentitySnapshot,
	NotificationInput,
	Notifications,
	QrDecoder,
	QrEncoder,
	Share,
	ShareInput,
	SystemProxy,
	ToggleStatus,
	Vpn,
	VpnStatus,
} from '@rahrow/core/platform/capabilities.ts'
import { invoke } from '@tauri-apps/api/core'

export interface DesktopQrPayload {
	readonly kind: 'qr-text'
	readonly value: string
}

export interface DesktopAutostart extends Autostart {}

export interface DesktopTraySyncInput {
	readonly connected: boolean
	readonly profileLabel?: string
	readonly canConnect: boolean
	readonly canDisconnect: boolean
}

export interface DesktopTray {
	show(): Promise<void>
	hide(): Promise<void>
	sync?(input: DesktopTraySyncInput): Promise<void>
}

export interface DesktopSystemProxy extends SystemProxy {}

export type DesktopNativeCapability =
	| 'autostart'
	| 'background-execution'
	| 'tray'
	| 'system-proxy'
	| 'vpn-tunnel'
	| 'xray-sidecar'
	| 'sing-box-sidecar'

export interface DesktopNativeCapabilityStatus {
	readonly capability: DesktopNativeCapability
	readonly supported: boolean
	readonly enabled?: boolean
	readonly detail?: string
}

export interface DesktopNativeDiagnostics {
	readonly capabilities: readonly DesktopNativeCapabilityStatus[]
	readonly output?: readonly DesktopNativeOutputLine[]
}

export interface DesktopNativeOutputLine {
	readonly sequence: number
	readonly source: string
	readonly stream: 'stdout' | 'stderr'
	readonly line: string
	readonly observedAt: number
}

export interface DesktopNativePlatformCommands {
	networkIdentity?(): Promise<NetworkIdentitySnapshot>
	enableAutostart(): Promise<void>
	disableAutostart(): Promise<void>
	statusAutostart(): Promise<DesktopNativeCapabilityStatus>
	showTray(): Promise<void>
	hideTray(): Promise<void>
	statusTray(): Promise<DesktopNativeCapabilityStatus>
	syncTray?(input: DesktopTraySyncInput): Promise<void>
	enableSystemProxy(input: {
		readonly host: string
		readonly port: number
	}): Promise<void>
	disableSystemProxy(): Promise<void>
	statusSystemProxy(): Promise<DesktopNativeCapabilityStatus>
	startTunnel?(input: DesktopTunnelStartInput): Promise<void>
	stopTunnel?(): Promise<void>
	diagnostics(): Promise<DesktopNativeDiagnostics>
}

/** The native TUN forwards every captured flow to the engine's loopback SOCKS listener. */
export interface DesktopTunnelStartInput {
	readonly socksPort: number
	readonly serverHost: string
	readonly serverPort: number
}

export interface DesktopTunnel {
	start(input: DesktopTunnelStartInput): Promise<void>
	stop(): Promise<void>
}

export interface DesktopPlatformCapabilities {
	readonly clipboard: Clipboard
	readonly externalNavigation?: ExternalNavigation
	readonly share?: Share
	readonly fileSave?: FileSave
	readonly filePick?: FilePick
	readonly qrEncoder: QrEncoder
	readonly qrDecoder?: QrDecoder
	readonly notifications: Notifications
	readonly autostart: DesktopAutostart
	readonly tray: DesktopTray
	readonly systemProxy: DesktopSystemProxy
	readonly vpn: Vpn
	readonly tunnel?: DesktopTunnel
	readonly diagnostics: DesktopNativeDiagnosticsProvider
	readonly networkIdentity?: NetworkIdentity
}

export interface DesktopNativeDiagnosticsProvider {
	diagnostics(): Promise<DesktopNativeDiagnostics>
}

export interface WebviewNotificationConstructor {
	new (title: string, options?: NotificationOptions): unknown
	permission: NotificationPermission
	requestPermission(): Promise<NotificationPermission>
}

export interface WebviewPlatformEnvironment {
	readonly clipboard?: {
		readText(): Promise<string>
		writeText(value: string): Promise<void>
	}
	readonly share?: (input: ShareInput) => Promise<void>
	readonly canShare?: (input: ShareInput) => boolean
	readonly openExternal?: (target: string) => Promise<void>
	readonly saveFile?: (input: FileSaveInput) => Promise<'saved' | 'cancelled'>
	readonly pickFile?: (input: {
		readonly accept: readonly string[]
	}) => Promise<FilePickResult | null>
	readonly Notification?: WebviewNotificationConstructor
}

export class WebviewExternalNavigation implements ExternalNavigation {
	constructor(
		private readonly openExternal: NonNullable<
			WebviewPlatformEnvironment['openExternal']
		>,
	) {}

	open(target: string): Promise<void> {
		return this.openExternal(target)
	}
}

export class WebviewClipboard implements Clipboard {
	constructor(
		private readonly clipboard: WebviewPlatformEnvironment['clipboard'],
	) {}

	get supported(): boolean {
		return this.clipboard !== undefined
	}

	async read(): Promise<string> {
		if (!this.clipboard) {
			throw unsupportedCapability('clipboard')
		}

		return this.clipboard.readText()
	}

	async write(value: string): Promise<void> {
		if (!this.clipboard) {
			throw unsupportedCapability('clipboard')
		}

		await this.clipboard.writeText(value)
	}
}

export class WebviewShare implements Share {
	constructor(
		private readonly shareApi: WebviewPlatformEnvironment['share'],
		private readonly canShare: WebviewPlatformEnvironment['canShare'],
	) {}

	async share(input: ShareInput): Promise<void> {
		if (!this.shareApi || this.canShare?.(input) === false) {
			throw unsupportedCapability('share')
		}

		await this.shareApi(input)
	}
}

export class WebviewFileSave implements FileSave {
	constructor(
		private readonly saveFile: WebviewPlatformEnvironment['saveFile'],
	) {}

	async save(input: FileSaveInput): Promise<'saved' | 'cancelled'> {
		if (!this.saveFile) throw unsupportedCapability('file-save')
		return this.saveFile(input)
	}
}

export class WebviewFilePick implements FilePick {
	constructor(
		private readonly pickFile: WebviewPlatformEnvironment['pickFile'],
	) {}

	pick(input: {
		readonly accept: readonly string[]
	}): Promise<FilePickResult | null> {
		if (!this.pickFile) throw unsupportedCapability('file-pick')
		return this.pickFile(input)
	}
}

export class DesktopQrEncoder implements QrEncoder {
	async encode(value: string): Promise<DesktopQrPayload> {
		return {
			kind: 'qr-text',
			value,
		}
	}
}

export class WebviewNotifications implements Notifications {
	constructor(
		private readonly NotificationApi: WebviewPlatformEnvironment['Notification'],
	) {}

	async notify(input: NotificationInput): Promise<void> {
		if (!this.NotificationApi) {
			throw unsupportedCapability('notifications')
		}

		const permission =
			this.NotificationApi.permission === 'default'
				? await this.NotificationApi.requestPermission()
				: this.NotificationApi.permission

		if (permission !== 'granted') {
			throw unsupportedCapability('notifications')
		}

		new this.NotificationApi(input.title, {
			body: input.body,
		})
	}
}

export class UnsupportedDesktopAutostart implements DesktopAutostart {
	async enable(): Promise<void> {
		throw unsupportedCapability('autostart')
	}

	async disable(): Promise<void> {
		throw unsupportedCapability('autostart')
	}

	async status(): Promise<ToggleStatus> {
		return {
			enabled: false,
			supported: false,
		}
	}
}

export class UnsupportedDesktopTray implements DesktopTray {
	async show(): Promise<void> {
		throw unsupportedCapability('tray')
	}

	async hide(): Promise<void> {
		throw unsupportedCapability('tray')
	}

	async sync(_input: DesktopTraySyncInput): Promise<void> {
		throw unsupportedCapability('tray')
	}
}

export class UnsupportedDesktopSystemProxy implements DesktopSystemProxy {
	async enable(_input: {
		readonly host: string
		readonly port: number
	}): Promise<void> {
		throw unsupportedCapability('system-proxy')
	}

	async disable(): Promise<void> {
		throw unsupportedCapability('system-proxy')
	}

	async status(): Promise<ToggleStatus> {
		return {
			enabled: false,
			supported: false,
		}
	}
}

export class UnsupportedDesktopVpn implements Vpn {
	async connect(): Promise<void> {
		throw unsupportedCapability(
			'vpn-tunnel',
			'An OS tunnel provider is not installed in this build.',
		)
	}

	async disconnect(): Promise<void> {}

	async status(): Promise<VpnStatus> {
		return {
			connected: false,
			supported: false,
			detail: 'An OS tunnel provider is not installed in this build.',
		}
	}
}

export class TauriDesktopAutostart implements DesktopAutostart {
	constructor(private readonly native: DesktopNativePlatformCommands) {}

	async enable(): Promise<void> {
		await this.native.enableAutostart()
	}

	async disable(): Promise<void> {
		await this.native.disableAutostart()
	}

	async status(): Promise<ToggleStatus> {
		const status = await this.native.statusAutostart()

		return {
			enabled: status.enabled ?? false,
			supported: status.supported,
			detail: status.detail,
		}
	}
}

export class TauriDesktopTray implements DesktopTray {
	constructor(private readonly native: DesktopNativePlatformCommands) {}

	async show(): Promise<void> {
		await this.native.showTray()
	}

	async hide(): Promise<void> {
		await this.native.hideTray()
	}

	async sync(input: DesktopTraySyncInput): Promise<void> {
		await this.native.syncTray?.(input)
	}
}

export class TauriDesktopSystemProxy implements DesktopSystemProxy {
	constructor(private readonly native: DesktopNativePlatformCommands) {}

	async enable(input: {
		readonly host: string
		readonly port: number
	}): Promise<void> {
		await this.native.enableSystemProxy(input)
	}

	async disable(): Promise<void> {
		await this.native.disableSystemProxy()
	}

	async status(): Promise<ToggleStatus> {
		const status = await this.native.statusSystemProxy()

		return {
			enabled: status.enabled ?? false,
			supported: status.supported,
			detail: status.detail,
		}
	}
}

export class TauriDesktopVpn implements Vpn {
	constructor(private readonly native: DesktopNativePlatformCommands) {}

	async connect(): Promise<void> {
		const status = await this.status()
		if (!status.supported) {
			throw unsupportedCapability('vpn-tunnel', status.detail)
		}
	}

	async disconnect(): Promise<void> {}

	async status(): Promise<VpnStatus> {
		const diagnostics = await this.native.diagnostics()
		const capability = diagnostics.capabilities.find(
			(item) => item.capability === 'vpn-tunnel',
		)

		return {
			connected: capability?.enabled ?? false,
			supported: capability?.supported ?? false,
			detail: capability?.detail,
		}
	}
}

export class TauriDesktopDiagnostics
	implements DesktopNativeDiagnosticsProvider
{
	constructor(private readonly native: DesktopNativePlatformCommands) {}

	async diagnostics(): Promise<DesktopNativeDiagnostics> {
		return this.native.diagnostics()
	}
}

export class TauriDesktopNetworkIdentity implements NetworkIdentity {
	constructor(private readonly native: DesktopNativePlatformCommands) {}

	async snapshot(): Promise<NetworkIdentitySnapshot> {
		return (await this.native.networkIdentity?.()) ?? { localAddresses: [] }
	}
}

export class StaticDesktopDiagnostics
	implements DesktopNativeDiagnosticsProvider
{
	constructor(private readonly diagnosticsValue: DesktopNativeDiagnostics) {}

	async diagnostics(): Promise<DesktopNativeDiagnostics> {
		return this.diagnosticsValue
	}
}

export function createDesktopPlatformCapabilities(
	environment: WebviewPlatformEnvironment = currentWebviewEnvironment(),
	native?: DesktopNativePlatformCommands,
): DesktopPlatformCapabilities {
	return {
		clipboard: new WebviewClipboard(environment.clipboard),
		...(environment.openExternal
			? {
					externalNavigation: new WebviewExternalNavigation(
						environment.openExternal,
					),
				}
			: {}),
		...(environment.share
			? { share: new WebviewShare(environment.share, environment.canShare) }
			: {}),
		...(environment.saveFile
			? { fileSave: new WebviewFileSave(environment.saveFile) }
			: {}),
		...(environment.pickFile
			? { filePick: new WebviewFilePick(environment.pickFile) }
			: {}),
		qrEncoder: new DesktopQrEncoder(),
		notifications: new WebviewNotifications(environment.Notification),
		autostart: native
			? new TauriDesktopAutostart(native)
			: new UnsupportedDesktopAutostart(),
		tray: native ? new TauriDesktopTray(native) : new UnsupportedDesktopTray(),
		systemProxy: native
			? new TauriDesktopSystemProxy(native)
			: new UnsupportedDesktopSystemProxy(),
		vpn: native ? new TauriDesktopVpn(native) : new UnsupportedDesktopVpn(),
		diagnostics: native
			? new TauriDesktopDiagnostics(native)
			: new StaticDesktopDiagnostics({
					capabilities: [
						unsupportedStatus('autostart'),
						unsupportedStatus('tray'),
						unsupportedStatus('system-proxy'),
						unsupportedStatus('vpn-tunnel'),
						unsupportedStatus('xray-sidecar'),
						unsupportedStatus('sing-box-sidecar'),
					],
				}),
		...(native?.startTunnel && native.stopTunnel
			? {
					tunnel: {
						start: native.startTunnel.bind(native),
						stop: native.stopTunnel.bind(native),
					},
				}
			: {}),
		...(native?.networkIdentity
			? { networkIdentity: new TauriDesktopNetworkIdentity(native) }
			: {}),
	}
}

export const desktopPlatformCapabilities = createDesktopPlatformCapabilities()

function currentWebviewEnvironment(): WebviewPlatformEnvironment {
	const browserFileSave = globalThis.document
		? createBrowserFileSave(globalThis.document)
		: undefined
	const browserFilePick = globalThis.document
		? createBrowserFilePick(globalThis.document)
		: undefined
	return {
		clipboard: globalThis.navigator?.clipboard,
		share: globalThis.navigator?.share?.bind(globalThis.navigator),
		canShare: globalThis.navigator?.canShare?.bind(globalThis.navigator),
		...(browserFileSave
			? { saveFile: (input) => browserFileSave.save(input) }
			: {}),
		...(browserFilePick
			? { pickFile: (input) => browserFilePick.pick(input) }
			: {}),
		Notification: globalThis.Notification,
	}
}

export function createTauriDesktopNativePlatformCommands(): DesktopNativePlatformCommands {
	return {
		networkIdentity() {
			return invoke<NetworkIdentitySnapshot>('rahrow_network_identity')
		},
		enableAutostart() {
			return invoke('rahrow_autostart_enable')
		},
		disableAutostart() {
			return invoke('rahrow_autostart_disable')
		},
		statusAutostart() {
			return invoke<DesktopNativeCapabilityStatus>('rahrow_autostart_status')
		},
		showTray() {
			return invoke('rahrow_tray_show')
		},
		hideTray() {
			return invoke('rahrow_tray_hide')
		},
		statusTray() {
			return invoke<DesktopNativeCapabilityStatus>('rahrow_tray_status')
		},
		syncTray(input) {
			return invoke('rahrow_tray_sync', { input })
		},
		enableSystemProxy(input) {
			return invoke('rahrow_system_proxy_enable', { input })
		},
		disableSystemProxy() {
			return invoke('rahrow_system_proxy_disable')
		},
		statusSystemProxy() {
			return invoke<DesktopNativeCapabilityStatus>('rahrow_system_proxy_status')
		},
		startTunnel(input) {
			return invoke('rahrow_tun_start', { input })
		},
		stopTunnel() {
			return invoke('rahrow_tun_stop')
		},
		diagnostics() {
			return invoke<DesktopNativeDiagnostics>('rahrow_desktop_diagnostics')
		},
	}
}

function unsupportedCapability(
	capability: string,
	detail?: string,
): RahrowError {
	return new RahrowError(
		'unsupported_capability',
		detail
			? `Desktop capability is not available: ${capability}: ${detail}`
			: `Desktop capability is not available: ${capability}`,
	)
}

function unsupportedStatus(
	capability: DesktopNativeCapability,
): DesktopNativeCapabilityStatus {
	return {
		capability,
		supported: false,
		enabled: false,
		detail: 'Native desktop command is not connected.',
	}
}
