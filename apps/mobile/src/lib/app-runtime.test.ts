import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { MemoryDocumentStore } from '@rahrow/core/storage/json-store.ts'
import { JsonSubscriptionStore } from '@rahrow/core/storage/subscription-store.ts'
import { describe, expect, it } from 'vitest'

import {
	createMobileHelperCapabilities,
	createMobileRuntime,
	resolveNativeAdConfiguration,
} from './app-runtime.ts'
import {
	CapacitorMobileVpn,
	type MobileVpnDiagnostics,
	type MobileVpnStatus,
	type RahRowVpnPlugin,
} from './mobile-vpn.ts'

const profile: ConnectionProfile = {
	id: 'home-profile',
	protocol: 'vless',
	endpoint: {
		host: 'example.com',
		port: 443,
	},
	authentication: {
		id: '11111111-1111-4111-8111-111111111111',
	},
}

class AtomicMemoryDocumentStore extends MemoryDocumentStore {
	async writeAtomic(value: string) {
		await this.write(value)
	}
}

class FakeRahRowVpnPlugin implements RahRowVpnPlugin {
	connectedProfileId: string | undefined
	receivedEngineId: string | undefined
	receivedConfig: unknown
	receivedSocksPort: number | undefined
	lastProbe: { readonly host: string; readonly port: number } | undefined
	localAddresses: readonly string[] = ['192.168.50.4', 'fd00::4']

	async networkIdentity() {
		return { localAddresses: this.localAddresses }
	}

	async connect(input: {
		readonly profileId: string
		readonly engineId?: string
		readonly engineConfig?: unknown
		readonly socksPort?: number
	}): Promise<void> {
		this.connectedProfileId = input.profileId
		this.receivedEngineId = input.engineId
		this.receivedConfig = input.engineConfig
		this.receivedSocksPort = input.socksPort
	}

	async disconnect(): Promise<void> {
		this.connectedProfileId = undefined
		this.receivedEngineId = undefined
		this.receivedConfig = undefined
		this.receivedSocksPort = undefined
	}

	async status(): Promise<MobileVpnStatus> {
		return {
			connected: this.connectedProfileId !== undefined,
			state: this.connectedProfileId ? 'connected' : 'disconnected',
			profileId: this.connectedProfileId,
		}
	}

	async diagnostics(): Promise<MobileVpnDiagnostics> {
		return {
			platform: 'android',
			nativeReady: true,
			readiness: 'ready',
		}
	}

	async probe(input: { readonly host: string; readonly port: number }): Promise<{
		readonly reachable: boolean
		readonly latencyMs?: number
		readonly error?: string
	}> {
		this.lastProbe = input

		return {
			reachable: true,
			latencyMs: 17,
		}
	}
}

describe('createMobileRuntime', () => {
	it.each([
		[
			'android',
			'Android keeps an active VPN connection in a foreground service.',
		],
		['ios', 'iOS keeps an active VPN connection in its packet-tunnel extension.'],
	] as const)(
		'reports persistent tunnel ownership and opportunistic Smart Connect scheduling on %s',
		async (platform, expectedTunnelDetail) => {
			const plugin = new FakeRahRowVpnPlugin()
			plugin.diagnostics = async () => ({
				platform,
				nativeReady: true,
				readiness: 'ready',
				activeConnectionInBackground: true,
				periodicSmartConnectInBackground: 'opportunistic',
			})
			const runtime = createMobileRuntime({
				platform,
				vpn: new CapacitorMobileVpn(plugin),
				profileDocument: new MemoryDocumentStore(),
				settingsDocument: new MemoryDocumentStore(),
				subscriptionDocument: new MemoryDocumentStore(),
			})

			await expect(runtime.diagnostics.snapshot()).resolves.toMatchObject({
				capabilities: expect.arrayContaining([
					expect.objectContaining({
						name: 'background-vpn',
						supported: true,
						detail: expectedTunnelDetail,
					}),
					expect.objectContaining({
						name: 'background-smart-connect',
						supported: false,
					}),
				]),
			})
			expect(runtime.networkQuality).toBeDefined()
		},
	)

	it.each(['android', 'ios', 'web'] as const)(
		'fails closed for clipboard and share without a native %s bridge',
		async (platform) => {
			const capabilities = createMobileHelperCapabilities(platform)

			expect(capabilities.clipboard.supported).toBe(false)
			expect(capabilities.share).toBeUndefined()
			await expect(capabilities.clipboard.read()).rejects.toMatchObject({
				code: 'unsupported_capability',
			})
		},
	)

	it.each(['android', 'ios'] as const)(
		'exposes explicitly injected %s native helper bridges',
		async (platform) => {
			const clipboard = {
				supported: true,
				async read() {
					return 'vless://native'
				},
				async write() {},
			}
			const share = { async share() {} }

			const capabilities = createMobileHelperCapabilities(platform, {
				clipboard,
				share,
			})

			expect(capabilities.clipboard).toBe(clipboard)
			expect(capabilities.share).toBe(share)
			await expect(capabilities.clipboard.read()).resolves.toBe('vless://native')
		},
	)

	it('gates external navigation on an explicitly provided platform adapter', async () => {
		const opened: string[] = []
		const externalNavigation = {
			async open(target: string) {
				opened.push(target)
			},
		}
		const runtime = createMobileRuntime({
			externalNavigation,
			vpn: new CapacitorMobileVpn(new FakeRahRowVpnPlugin()),
			profileDocument: new MemoryDocumentStore(),
			settingsDocument: new MemoryDocumentStore(),
			subscriptionDocument: new MemoryDocumentStore(),
		})

		expect(runtime.capabilities.externalNavigation).toBe(externalNavigation)
		await runtime.capabilities.externalNavigation?.open(
			'https://false.foundation/',
		)
		expect(opened).toEqual(['https://false.foundation/'])
		expect(
			createMobileRuntime({
				vpn: new CapacitorMobileVpn(new FakeRahRowVpnPlugin()),
				profileDocument: new MemoryDocumentStore(),
				settingsDocument: new MemoryDocumentStore(),
				subscriptionDocument: new MemoryDocumentStore(),
			}).capabilities.externalNavigation,
		).toBeUndefined()
	})
	it('uses the Google test interstitial in Android preview builds', () => {
		expect(resolveNativeAdConfiguration('android', undefined, true)).toEqual({
			adUnitId: 'ca-app-pub-3940256099942544/1033173712',
			isTesting: true,
		})
		expect(resolveNativeAdConfiguration('android', undefined, false)).toBe(
			undefined,
		)
	})

	it('exposes the native plugin network identity by default', async () => {
		const plugin = new FakeRahRowVpnPlugin()
		const runtime = createMobileRuntime({
			advertisingDocument: new MemoryDocumentStore(),
			vpn: new CapacitorMobileVpn(plugin),
			profileDocument: new MemoryDocumentStore(),
			settingsDocument: new MemoryDocumentStore(),
			subscriptionDocument: new MemoryDocumentStore(),
		})

		await expect(
			runtime.capabilities.networkIdentity?.snapshot(),
		).resolves.toEqual({
			localAddresses: ['192.168.50.4', 'fd00::4'],
		})
		expect(runtime.subscriptionStore).toBeInstanceOf(JsonSubscriptionStore)
		expect(runtime.capabilities.vpn).toBeDefined()
		expect(runtime.capabilities.autostart).toBeUndefined()
		expect(runtime.capabilities.systemProxy).toBeUndefined()
		expect(runtime.capabilities.lanProxySharing).toMatchObject({
			supported: false,
		})
		expect(runtime.advertising?.provider.id).toBe('house-development')
	})

	it('cleans the active native tunnel and durable stores during an app-data reset', async () => {
		const plugin = new FakeRahRowVpnPlugin()
		let credentialsCleared = 0
		const rawDocument = new AtomicMemoryDocumentStore()
		const runtime = createMobileRuntime({
			platform: 'android',
			vpn: new CapacitorMobileVpn(plugin),
			clearSecureCredentials: async () => {
				credentialsCleared += 1
			},
			buildMetadata: {
				version: '2.0.0',
				build: 'android-42',
				engines: [
					{ id: 'sing-box', version: '1.13.19', license: 'GPL-3.0-or-later' },
				],
			},
			profileDocument: new MemoryDocumentStore(),
			settingsDocument: new MemoryDocumentStore(),
			subscriptionDocument: new MemoryDocumentStore(),
			rawEngineDocumentStore: () => rawDocument,
		})
		await runtime.profileStore.save(profile)
		await runtime.subscriptionStore.save({
			id: 'main',
			url: 'https://example.com/subscription',
		})
		await runtime.settingsStore.write({ theme: 'dark', engineId: 'sing-box' })
		await rawDocument.writeAtomic('{"outbounds":[]}')
		await runtime.connection.connect(profile, { mode: 'vpn' })

		await expect(runtime.reset?.reset('app-data')).resolves.toMatchObject({
			status: 'completed',
		})
		expect(plugin.connectedProfileId).toBeUndefined()
		expect(runtime.buildMetadata?.build).toBe('android-42')
		expect(runtime.rawEngineDocuments?.adapters).toMatchObject([
			{ engineId: 'sing-box', engineVersion: '1.13.19' },
		])
		expect(runtime.rawEngineDocuments?.storeFor('sing-box')).toBe(rawDocument)
		await expect(rawDocument.read()).resolves.toBe('')
		await expect(runtime.profileStore.list()).resolves.toEqual([])
		await expect(runtime.subscriptionStore.list()).resolves.toEqual([])
		await expect(runtime.settingsStore.read()).resolves.toMatchObject({
			connectionMode: 'vpn',
		})
		expect((await runtime.settingsStore.read()).theme).toBeUndefined()
		expect(credentialsCleared).toBe(1)
	})

	it('exposes an explicitly injected native network identity port', async () => {
		const networkIdentity = {
			async snapshot() {
				return { localAddresses: ['10.0.0.8'] }
			},
		}
		const runtime = createMobileRuntime({
			vpn: new CapacitorMobileVpn(new FakeRahRowVpnPlugin()),
			networkIdentity,
			profileDocument: new MemoryDocumentStore(),
			settingsDocument: new MemoryDocumentStore(),
			subscriptionDocument: new MemoryDocumentStore(),
		})

		expect(runtime.capabilities.networkIdentity).toBe(networkIdentity)
		await expect(
			runtime.capabilities.networkIdentity?.snapshot(),
		).resolves.toEqual({ localAddresses: ['10.0.0.8'] })
	})

	it('builds sing-box config by default and sends it to the native VPN plugin', async () => {
		const plugin = new FakeRahRowVpnPlugin()
		const runtime = createMobileRuntime({
			vpn: new CapacitorMobileVpn(plugin),
			profileDocument: new MemoryDocumentStore(),
			settingsDocument: new MemoryDocumentStore(),
			subscriptionDocument: new MemoryDocumentStore(),
		})

		await runtime.profileStore.save(profile)
		await runtime.connection.connect(profile, { mode: 'vpn', localPort: 12080 })

		expect(plugin.connectedProfileId).toBe('home-profile')
		expect(plugin.receivedSocksPort).toBe(12080)
		expect(plugin.receivedConfig).toMatchObject({
			inbounds: [{ type: 'tun', auto_route: true }],
			route: { auto_detect_interface: true, final: 'proxy' },
		})
		expect(plugin.receivedConfig).toEqual(
			expect.objectContaining({
				outbounds: expect.arrayContaining([
					expect.objectContaining({ type: 'vless' }),
				]),
			}),
		)
		await expect(runtime.connection.status()).resolves.toMatchObject({
			state: 'connected',
			engineStatus: 'running',
			profileId: 'home-profile',
		})
		await expect(runtime.connection.test(profile)).resolves.toEqual({
			reachable: true,
			latencyMs: 17,
		})
		expect(plugin.lastProbe).toEqual({ host: 'example.com', port: 443 })

		await runtime.connection.disconnect()
		await expect(runtime.connection.status()).resolves.toMatchObject({
			state: 'disconnected',
		})
	})

	it('builds Xray config when the persisted engine selection requests it', async () => {
		const plugin = new FakeRahRowVpnPlugin()
		const settingsDocument = new MemoryDocumentStore()
		const runtime = createMobileRuntime({
			vpn: new CapacitorMobileVpn(plugin),
			profileDocument: new MemoryDocumentStore(),
			settingsDocument,
			subscriptionDocument: new MemoryDocumentStore(),
		})

		await runtime.settingsStore.write({ engineId: 'xray' })
		await runtime.connection.connect(profile, { mode: 'vpn', localPort: 12080 })

		expect(plugin.receivedConfig).toMatchObject({
			inbounds: [
				{
					protocol: 'tun',
					settings: {
						gateway: ['172.19.0.1/30', 'fdfe:dcba:9876::1/126'],
					},
				},
			],
		})
		expect(plugin.receivedEngineId).toBe('xray')
	})

	it('advertises and starts both bundled VPN engines on Android', async () => {
		const plugin = new FakeRahRowVpnPlugin()
		const settingsDocument = new MemoryDocumentStore()
		const runtime = createMobileRuntime({
			platform: 'android',
			vpn: new CapacitorMobileVpn(plugin),
			profileDocument: new MemoryDocumentStore(),
			settingsDocument,
			subscriptionDocument: new MemoryDocumentStore(),
		})

		await runtime.settingsStore.write({ engineId: 'xray' })
		await runtime.connection.connect(profile, { mode: 'vpn', localPort: 12080 })

		expect(runtime.availableEngines?.map(({ id }) => id)).toEqual([
			'xray',
			'sing-box',
		])
		await expect(runtime.settingsStore.read()).resolves.toMatchObject({
			engineId: 'xray',
		})
		expect(plugin.receivedEngineId).toBe('xray')
		expect(plugin.receivedConfig).toMatchObject({
			inbounds: [{ protocol: 'tun' }],
		})
	})

	it('rejects proxy fallback because mobile connections must use the OS VPN', async () => {
		const plugin = new FakeRahRowVpnPlugin()
		const runtime = createMobileRuntime({
			vpn: new CapacitorMobileVpn(plugin),
			profileDocument: new MemoryDocumentStore(),
			settingsDocument: new MemoryDocumentStore(),
			subscriptionDocument: new MemoryDocumentStore(),
		})

		await expect(
			runtime.connection.connect(profile, { mode: 'proxy', localPort: 12080 }),
		).rejects.toThrow(
			'System proxy fallback is not available on mobile. Use VPN/TUN mode.',
		)
		expect(plugin.connectedProfileId).toBeUndefined()
	})

	it('preflights Smart Connect mode changes without tearing down an active VPN', async () => {
		const plugin = new FakeRahRowVpnPlugin()
		const runtime = createMobileRuntime({
			vpn: new CapacitorMobileVpn(plugin),
			profileDocument: new MemoryDocumentStore(),
			settingsDocument: new MemoryDocumentStore(),
			subscriptionDocument: new MemoryDocumentStore(),
		})
		await runtime.profileStore.save(profile)
		await runtime.connection.connect(profile, {
			mode: 'vpn',
			engineId: 'sing-box',
			localPort: 12080,
		})
		await runtime.settingsStore.write({
			connectionMode: 'proxy',
			engineId: 'sing-box',
			localPort: 12080,
			smartConnect: { enabled: true },
		})

		await expect(runtime.smartConnect?.orchestrator.runIfDue()).rejects.toThrow(
			'System proxy fallback is not available on mobile',
		)
		expect(plugin.connectedProfileId).toBe(profile.id)
	})
})
