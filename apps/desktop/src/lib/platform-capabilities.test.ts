import { describe, expect, it, vi } from 'vitest'

import {
	createDesktopPlatformCapabilities,
	type DesktopNativePlatformCommands,
	type WebviewNotificationConstructor,
	type WebviewPlatformEnvironment,
} from './platform-capabilities.ts'

describe('desktop platform capabilities', () => {
	it.each(['macos', 'linux', 'windows'] as const)(
		'fails closed for unavailable %s webview helpers',
		async () => {
			const capabilities = createDesktopPlatformCapabilities({})

			expect(capabilities.clipboard.supported).toBe(false)
			expect(capabilities.share).toBeUndefined()
			expect(capabilities.fileSave).toBeUndefined()
			await expect(capabilities.clipboard.read()).rejects.toMatchObject({
				code: 'unsupported_capability',
			})
		},
	)

	it('does not advertise a DOM anchor as native file-save support', () => {
		expect(createDesktopPlatformCapabilities().fileSave).toBeUndefined()
	})

	it('reads and writes clipboard text through the webview clipboard API', async () => {
		let text = 'initial'
		const capabilities = createDesktopPlatformCapabilities({
			clipboard: {
				async readText() {
					return text
				},
				async writeText(value) {
					text = value
				},
			},
		})

		await capabilities.clipboard.write('profile-url')

		await expect(capabilities.clipboard.read()).resolves.toBe('profile-url')
	})

	it('shares through navigator.share when the payload is supported', async () => {
		const share = vi.fn<NonNullable<WebviewPlatformEnvironment['share']>>()
		const capabilities = createDesktopPlatformCapabilities({
			share,
			canShare: () => true,
		})

		expect(capabilities.share).toBeDefined()
		await capabilities.share?.share({ title: 'Profile', text: 'vless://profile' })

		expect(share).toHaveBeenCalledWith({
			title: 'Profile',
			text: 'vless://profile',
		})
	})

	it('omits system sharing when the webview has no share API', () => {
		const capabilities = createDesktopPlatformCapabilities({})

		expect(capabilities.share).toBeUndefined()
		expect(capabilities.fileSave).toBeUndefined()
		expect(capabilities.externalNavigation).toBeUndefined()
	})

	it('opens external and email targets only through the injected adapter', async () => {
		const openExternal = vi.fn(async () => undefined)
		const capabilities = createDesktopPlatformCapabilities({ openExternal })

		await capabilities.externalNavigation?.open(
			'https://github.com/FalseFoundation/rahrow',
		)
		await capabilities.externalNavigation?.open(
			'mailto:falsefoundation.co@gmail.com',
		)

		expect(openExternal).toHaveBeenNthCalledWith(
			1,
			'https://github.com/FalseFoundation/rahrow',
		)
		expect(openExternal).toHaveBeenNthCalledWith(
			2,
			'mailto:falsefoundation.co@gmail.com',
		)
	})

	it('saves files only through the injected webview adapter', async () => {
		const saveFile = vi.fn(async () => 'saved' as const)
		const capabilities = createDesktopPlatformCapabilities({ saveFile })

		await expect(
			capabilities.fileSave?.save({
				dataUrl: 'data:image/png;base64,qr',
				filename: 'connection.png',
			}),
		).resolves.toBe('saved')
		expect(saveFile).toHaveBeenCalledOnce()
	})

	it('returns a QR text handoff payload without duplicating protocol parsing', async () => {
		const capabilities = createDesktopPlatformCapabilities()

		await expect(
			capabilities.qrEncoder.encode('trojan://profile'),
		).resolves.toEqual({
			kind: 'qr-text',
			value: 'trojan://profile',
		})
	})

	it('uses the webview notification API when permission is granted', async () => {
		const notifications: { title: string; body?: string }[] = []
		class FakeNotification {
			static permission: NotificationPermission = 'granted'
			static async requestPermission(): Promise<NotificationPermission> {
				return 'granted'
			}

			constructor(title: string, options?: NotificationOptions) {
				notifications.push({ title, body: options?.body })
			}
		}

		const capabilities = createDesktopPlatformCapabilities({
			Notification: FakeNotification as unknown as WebviewNotificationConstructor,
		})

		await capabilities.notifications.notify({
			title: 'Connected',
			body: 'RahRow is connected',
		})

		expect(notifications).toEqual([
			{
				title: 'Connected',
				body: 'RahRow is connected',
			},
		])
	})

	it('reports unsupported native-only capabilities with a stable code', async () => {
		const capabilities = createDesktopPlatformCapabilities()

		await expect(
			capabilities.systemProxy.enable({ host: '127.0.0.1', port: 10808 }),
		).rejects.toMatchObject({
			code: 'unsupported_capability',
			message: 'Desktop capability is not available: system-proxy',
		})
		await expect(capabilities.tray.show()).rejects.toMatchObject({
			code: 'unsupported_capability',
			message: 'Desktop capability is not available: tray',
		})
		expect(capabilities.qrDecoder).toBeUndefined()
		await expect(capabilities.diagnostics.diagnostics()).resolves.toMatchObject({
			capabilities: [
				{ capability: 'autostart', supported: false },
				{ capability: 'tray', supported: false },
				{ capability: 'system-proxy', supported: false },
				{ capability: 'vpn-tunnel', supported: false },
				{ capability: 'xray-sidecar', supported: false },
				{ capability: 'sing-box-sidecar', supported: false },
			],
		})
	})

	it('bridges native autostart tray system proxy and diagnostics commands', async () => {
		const calls: string[] = []
		const native: DesktopNativePlatformCommands = {
			async networkIdentity() {
				return { localAddresses: ['192.168.1.20', 'fd00::20'] }
			},
			async enableAutostart() {
				calls.push('autostart:enable')
			},
			async disableAutostart() {
				calls.push('autostart:disable')
			},
			async statusAutostart() {
				return {
					capability: 'autostart',
					supported: true,
					enabled: true,
				}
			},
			async showTray() {
				calls.push('tray:show')
			},
			async hideTray() {
				calls.push('tray:hide')
			},
			async statusTray() {
				return {
					capability: 'tray',
					supported: true,
					enabled: true,
				}
			},
			async enableSystemProxy(input) {
				calls.push(`proxy:enable:${input.host}:${input.port}`)
			},
			async disableSystemProxy() {
				calls.push('proxy:disable')
			},
			async statusSystemProxy() {
				return {
					capability: 'system-proxy',
					supported: true,
					enabled: true,
				}
			},
			async diagnostics() {
				return {
					capabilities: [
						{
							capability: 'xray-sidecar',
							supported: true,
							enabled: true,
						},
					],
				}
			},
		}
		const capabilities = createDesktopPlatformCapabilities({}, native)

		await capabilities.autostart.enable()
		await capabilities.tray.show()
		await capabilities.systemProxy.enable({ host: '127.0.0.1', port: 10808 })

		await expect(capabilities.autostart.status()).resolves.toEqual({
			enabled: true,
			supported: true,
		})
		await expect(capabilities.systemProxy.status()).resolves.toEqual({
			enabled: true,
			supported: true,
		})
		await expect(capabilities.vpn.status()).resolves.toEqual({
			connected: false,
			supported: false,
		})
		await expect(capabilities.diagnostics.diagnostics()).resolves.toEqual({
			capabilities: [
				{
					capability: 'xray-sidecar',
					supported: true,
					enabled: true,
				},
			],
		})
		await expect(capabilities.networkIdentity?.snapshot()).resolves.toEqual({
			localAddresses: ['192.168.1.20', 'fd00::20'],
		})
		expect(calls).toEqual([
			'autostart:enable',
			'tray:show',
			'proxy:enable:127.0.0.1:10808',
		])
	})

	it('maps unsupported native capability status to typed errors', async () => {
		const native: DesktopNativePlatformCommands = {
			async enableAutostart() {},
			async disableAutostart() {},
			async statusAutostart() {
				return {
					capability: 'autostart',
					supported: false,
					detail: 'requires signed app bundle',
				}
			},
			async showTray() {},
			async hideTray() {},
			async statusTray() {
				return {
					capability: 'tray',
					supported: false,
				}
			},
			async enableSystemProxy() {},
			async disableSystemProxy() {},
			async statusSystemProxy() {
				return {
					capability: 'system-proxy',
					supported: false,
					detail: 'not implemented for this OS',
				}
			},
			async diagnostics() {
				return {
					capabilities: [],
				}
			},
		}
		const capabilities = createDesktopPlatformCapabilities({}, native)

		await expect(capabilities.autostart.status()).resolves.toEqual({
			enabled: false,
			supported: false,
			detail: 'requires signed app bundle',
		})
		await expect(capabilities.systemProxy.status()).resolves.toEqual({
			enabled: false,
			supported: false,
			detail: 'not implemented for this OS',
		})
	})

	it('reports the native engine-owned tunnel as the desktop VPN capability', async () => {
		const native: DesktopNativePlatformCommands = {
			async enableAutostart() {},
			async disableAutostart() {},
			async statusAutostart() {
				return { capability: 'autostart', supported: false }
			},
			async showTray() {},
			async hideTray() {},
			async statusTray() {
				return { capability: 'tray', supported: true }
			},
			async enableSystemProxy() {},
			async disableSystemProxy() {},
			async statusSystemProxy() {
				return { capability: 'system-proxy', supported: true }
			},
			async diagnostics() {
				return {
					capabilities: [
						{
							capability: 'vpn-tunnel',
							supported: true,
							enabled: true,
							detail: 'native TUN active',
						},
					],
				}
			},
		}
		const capabilities = createDesktopPlatformCapabilities({}, native)

		await expect(capabilities.vpn.status()).resolves.toEqual({
			connected: true,
			supported: true,
			detail: 'native TUN active',
		})
	})
})
