import { MemoryDocumentStore } from '@rahrow/core/storage/json-store.ts'
import { JsonSubscriptionStore } from '@rahrow/core/storage/subscription-store.ts'
import type { SingBoxConfig } from '@rahrow/engine/sing-box/sing-box-engine.ts'
import type { XrayConfig } from '@rahrow/engine/xray/xray-engine.ts'
import { describe, expect, it } from 'vitest'

import {
	createDesktopRuntime,
	createDesktopSubscriptionFetcher,
} from './app-runtime.ts'
import type { DesktopNativeCommands } from './connection-commands.ts'
import type { DesktopNativePlatformCommands } from './platform-capabilities.ts'

const profile = {
	id: 'home-profile',
	protocol: 'vless' as const,
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

class FakeNativeCommands implements DesktopNativeCommands {
	readonly startedConfigs: XrayConfig[] = []
	readonly startedSingBoxConfigs: SingBoxConfig[] = []
	running = false
	singBoxRunning = false
	lastProbe: { readonly host: string; readonly port: number } | undefined

	async startXray(config: XrayConfig): Promise<void> {
		this.startedConfigs.push(config)
		this.running = true
	}

	async stopXray(): Promise<void> {
		this.running = false
	}

	async statusXray(): Promise<{ readonly running: boolean }> {
		return { running: this.running }
	}

	async startSingBox(config: SingBoxConfig): Promise<void> {
		this.startedSingBoxConfigs.push(config)
		this.singBoxRunning = true
	}

	async stopSingBox(): Promise<void> {
		this.singBoxRunning = false
	}

	async statusSingBox(): Promise<{ readonly running: boolean }> {
		return { running: this.singBoxRunning }
	}

	async probeTcp(
		host: string,
		port: number,
	): Promise<{
		readonly reachable: boolean
		readonly latencyMs?: number
		readonly error?: string
	}> {
		this.lastProbe = { host, port }

		return {
			reachable: true,
			latencyMs: 17,
		}
	}
}

const fakePlatformNative: DesktopNativePlatformCommands = {
	async networkIdentity() {
		return { localAddresses: ['192.168.1.20', 'fd00::20'] }
	},
	async enableAutostart() {},
	async disableAutostart() {},
	async statusAutostart() {
		return { capability: 'autostart', supported: false }
	},
	async showTray() {},
	async hideTray() {},
	async statusTray() {
		return { capability: 'tray', supported: true, enabled: true }
	},
	async enableSystemProxy() {},
	async disableSystemProxy() {},
	async statusSystemProxy() {
		return { capability: 'system-proxy', supported: false }
	},
	async diagnostics() {
		return {
			capabilities: [
				{ capability: 'xray-sidecar', supported: true, enabled: false },
				{ capability: 'vpn-tunnel', supported: true, enabled: false },
			],
		}
	},
}

describe('createDesktopRuntime', () => {
	it('exposes native desktop network identity by default', async () => {
		const runtime = createDesktopRuntime({
			advertisingDocument: new MemoryDocumentStore(),
			native: new FakeNativeCommands(),
			platformNative: fakePlatformNative,
			profileDocument: new MemoryDocumentStore(),
			settingsDocument: new MemoryDocumentStore(),
			subscriptionDocument: new MemoryDocumentStore(),
		})

		await expect(
			runtime.capabilities.networkIdentity?.snapshot(),
		).resolves.toEqual({
			localAddresses: ['192.168.1.20', 'fd00::20'],
		})
		expect(runtime.subscriptionStore).toBeInstanceOf(JsonSubscriptionStore)
		expect(runtime.capabilities.autostart).toBeDefined()
		expect(runtime.capabilities.systemProxy).toBeDefined()
		expect(runtime.capabilities.vpn).toBeDefined()
		expect(runtime.capabilities.lanProxySharing).toMatchObject({
			supported: false,
		})
		expect(runtime.networkQuality).toBeDefined()
		expect(runtime.advertising?.provider.id).toBe('house-development')
	})

	it('exposes host build metadata and clears app stores through the reset capability', async () => {
		const settingsDocument = new MemoryDocumentStore()
		const profileDocument = new MemoryDocumentStore()
		const subscriptionDocument = new MemoryDocumentStore()
		let credentialsCleared = 0
		const rawDocument = new AtomicMemoryDocumentStore()
		const runtime = createDesktopRuntime({
			buildMetadata: {
				version: '2.0.0',
				build: 'desktop-42',
				engines: [{ id: 'xray', version: '26.7.28', license: 'MPL-2.0' }],
			},
			clearSecureCredentials: async () => {
				credentialsCleared += 1
			},
			native: new FakeNativeCommands(),
			platformNative: fakePlatformNative,
			settingsDocument,
			profileDocument,
			subscriptionDocument,
			rawEngineDocumentStore: () => rawDocument,
		})
		await runtime.profileStore.save(profile)
		await runtime.subscriptionStore.save({
			id: 'main',
			url: 'https://example.com/subscription',
		})
		await runtime.settingsStore.write({ theme: 'dark', engineId: 'xray' })
		await rawDocument.writeAtomic('{"outbounds":[]}')

		await expect(runtime.reset?.reset('app-data')).resolves.toMatchObject({
			status: 'completed',
		})
		expect(runtime.buildMetadata?.build).toBe('desktop-42')
		expect(runtime.buildMetadata?.engines?.[0]?.version).toBe('26.7.28')
		expect(runtime.rawEngineDocuments?.adapters).toMatchObject([
			{ engineId: 'xray', engineVersion: '26.7.28' },
		])
		expect(runtime.rawEngineDocuments?.storeFor('xray')).toBe(rawDocument)
		await expect(rawDocument.read()).resolves.toBe('')
		await expect(runtime.profileStore.list()).resolves.toEqual([])
		await expect(runtime.subscriptionStore.list()).resolves.toEqual([])
		await expect(runtime.settingsStore.read()).resolves.toMatchObject({
			connectionMode: 'vpn',
		})
		expect((await runtime.settingsStore.read()).theme).toBeUndefined()
		expect(credentialsCleared).toBe(1)
	})

	it('captures only validated metadata returned by the native fetch command', async () => {
		const fetcher = createDesktopSubscriptionFetcher({
			async nativeRequest(input) {
				expect(input).toEqual({
					url: 'https://subscriptions.example/list?token=secret',
				})
				return {
					body: 'trojan://secret@example.net:443',
					subscriptionUserinfo: 'download=1024; total=4096; token=secret',
					supportUrl: 'https://user:secret@support.example/help',
					profileWebPageUrl: 'https://provider.example/account',
				}
			},
		})

		await expect(
			fetcher.fetchWithMetadata?.({
				id: 'main',
				url: 'https://subscriptions.example/list?token=secret',
			}),
		).resolves.toEqual({
			body: 'trojan://secret@example.net:443',
			metadata: {
				usage: { downloadBytes: 1024, totalBytes: 4096 },
				profileUrl: 'https://provider.example/account',
			},
		})
	})

	it('passes resolved credentials through the native transport contract', async () => {
		let receivedAuthorization: string | undefined
		const fetcher = createDesktopSubscriptionFetcher({
			async resolveCredential(credentialId) {
				expect(credentialId).toBe('desktop-credential')
				return 'Bearer desktop-secret'
			},
			async nativeRequest(input) {
				receivedAuthorization = input.authorization
				return { body: 'vless://profile' }
			},
		})

		await fetcher.fetch({
			id: 'main',
			url: 'https://subscriptions.example/list',
			credentialId: 'desktop-credential',
		})

		expect(receivedAuthorization).toBe('Bearer desktop-secret')
	})

	it('exposes an explicitly injected native network identity port', async () => {
		const networkIdentity = {
			async snapshot() {
				return { localAddresses: ['192.168.1.20'] }
			},
		}
		const runtime = createDesktopRuntime({
			native: new FakeNativeCommands(),
			platformNative: fakePlatformNative,
			networkIdentity,
			profileDocument: new MemoryDocumentStore(),
			settingsDocument: new MemoryDocumentStore(),
			subscriptionDocument: new MemoryDocumentStore(),
		})

		expect(runtime.capabilities.networkIdentity).toBe(networkIdentity)
		await expect(
			runtime.capabilities.networkIdentity?.snapshot(),
		).resolves.toEqual({ localAddresses: ['192.168.1.20'] })
	})

	it('fails closed before engine launch when the OS VPN provider is unavailable', async () => {
		const native = new FakeNativeCommands()
		const runtime = createDesktopRuntime({
			native,
			platformNative: {
				...fakePlatformNative,
				async diagnostics() {
					return {
						capabilities: [
							{
								capability: 'vpn-tunnel',
								supported: false,
								detail: 'This build has no registered OS tunnel provider.',
							},
						],
					}
				},
			},
			profileDocument: new MemoryDocumentStore(),
			settingsDocument: new MemoryDocumentStore(),
			subscriptionDocument: new MemoryDocumentStore(),
		})

		await expect(
			runtime.connection.connect(profile, { mode: 'vpn', localPort: 12080 }),
		).rejects.toThrow('This build has no registered OS tunnel provider.')
		expect(native.startedConfigs).toEqual([])
	})

	it('does not launch a sidecar when diagnostics advertise VPN support without a connected provider', async () => {
		const native = new FakeNativeCommands()
		const runtime = createDesktopRuntime({
			native,
			platformNative: fakePlatformNative,
			profileDocument: new MemoryDocumentStore(),
			settingsDocument: new MemoryDocumentStore(),
			subscriptionDocument: new MemoryDocumentStore(),
		})

		await expect(
			runtime.connection.connect(profile, { mode: 'vpn', localPort: 12080 }),
		).rejects.toThrow('no registered OS tunnel provider')
		expect(native.startedConfigs).toEqual([])
	})

	it('routes the TUN device into the engine SOCKS listener in VPN mode', async () => {
		const native = new FakeNativeCommands()
		const tunnelCalls: string[] = []
		let tunnelRunning = false
		const runtime = createDesktopRuntime({
			native,
			platformNative: {
				...fakePlatformNative,
				async diagnostics() {
					return {
						capabilities: [
							{
								capability: 'vpn-tunnel',
								supported: true,
								enabled: tunnelRunning,
							},
						],
					}
				},
				async startTunnel(input) {
					expect(native.running).toBe(true)
					tunnelCalls.push(
						`start:${input.socksPort}:${input.serverHost}:${input.serverPort}`,
					)
					tunnelRunning = true
				},
				async stopTunnel() {
					tunnelCalls.push(`stop:engine-running=${native.running}`)
					tunnelRunning = false
				},
			},
			profileDocument: new MemoryDocumentStore(),
			settingsDocument: new MemoryDocumentStore(),
			subscriptionDocument: new MemoryDocumentStore(),
		})

		await runtime.settingsStore.write({ engineId: 'xray' })
		await runtime.connection.connect(profile, { mode: 'vpn', localPort: 12080 })

		expect(native.startedConfigs[0]?.inbounds[0]).toMatchObject({
			listen: '127.0.0.1',
			port: 12080,
			protocol: 'socks',
		})
		expect(tunnelCalls).toEqual(['start:12080:example.com:443'])
		await expect(runtime.connection.status()).resolves.toMatchObject({
			state: 'connected',
			mode: 'vpn',
			engineId: 'xray',
			profileId: 'home-profile',
		})

		await runtime.connection.disconnect()

		expect(tunnelCalls).toEqual([
			'start:12080:example.com:443',
			'stop:engine-running=true',
		])
		expect(native.running).toBe(false)
		await expect(runtime.connection.status()).resolves.toMatchObject({
			state: 'disconnected',
		})
	})

	it('stops the engine when the TUN device fails to start', async () => {
		const native = new FakeNativeCommands()
		const runtime = createDesktopRuntime({
			native,
			platformNative: {
				...fakePlatformNative,
				async startTunnel() {
					throw new Error('Tunnel authorization was cancelled.')
				},
				async stopTunnel() {},
			},
			profileDocument: new MemoryDocumentStore(),
			settingsDocument: new MemoryDocumentStore(),
			subscriptionDocument: new MemoryDocumentStore(),
		})

		await runtime.settingsStore.write({ engineId: 'xray' })
		await expect(
			runtime.connection.connect(profile, { mode: 'vpn', localPort: 12080 }),
		).rejects.toThrow('Tunnel authorization was cancelled.')
		expect(native.startedConfigs).toHaveLength(1)
		expect(native.running).toBe(false)
	})

	it('uses system proxy only as an explicit fallback and restores it on disconnect', async () => {
		const native = new FakeNativeCommands()
		const proxyCalls: string[] = []
		const runtime = createDesktopRuntime({
			native,
			platformNative: {
				...fakePlatformNative,
				async enableSystemProxy(input) {
					proxyCalls.push(`enable:${input.host}:${input.port}`)
				},
				async disableSystemProxy() {
					proxyCalls.push('disable')
				},
				async statusSystemProxy() {
					return { capability: 'system-proxy', supported: true }
				},
			},
			profileDocument: new MemoryDocumentStore(),
			settingsDocument: new MemoryDocumentStore(),
			subscriptionDocument: new MemoryDocumentStore(),
		})

		await runtime.profileStore.save(profile)
		await runtime.settingsStore.write({ engineId: 'xray' })
		await runtime.connection.connect(profile, {
			mode: 'proxy',
			localPort: 12080,
		})

		expect(runtime.logs.records().map((record) => record.msg)).toEqual(
			expect.arrayContaining([
				'Connecting',
				'Starting Xray',
				'Xray started',
				'Connected',
			]),
		)
		expect(native.startedConfigs).toHaveLength(1)
		expect(native.startedConfigs[0]?.inbounds[0]).toMatchObject({
			listen: '127.0.0.1',
			port: 12080,
			protocol: 'socks',
		})
		expect(native.startedConfigs[0]?.outbounds[0]?.protocol).toBe('vless')
		expect(proxyCalls).toEqual(['enable:127.0.0.1:12080'])

		await expect(runtime.connection.status()).resolves.toMatchObject({
			state: 'connected',
			engineStatus: 'running',
			profileId: 'home-profile',
		})
		await expect(runtime.profileStore.list()).resolves.toEqual([profile])

		await runtime.settingsStore.write({
			activeProfileId: profile.id,
			localPort: 12080,
			engineId: 'xray',
		})
		await expect(runtime.settingsStore.read()).resolves.toMatchObject({
			activeProfileId: 'home-profile',
			localPort: 12080,
		})

		await expect(runtime.connection.test(profile)).resolves.toEqual({
			reachable: true,
			latencyMs: 17,
		})
		expect(native.lastProbe).toEqual({ host: 'example.com', port: 443 })

		await runtime.connection.disconnect()
		expect(proxyCalls).toEqual(['enable:127.0.0.1:12080', 'disable'])
		await expect(runtime.connection.status()).resolves.toMatchObject({
			state: 'disconnected',
		})
	})

	it('runs sing-box for explicit system proxy mode and stops the owning engine', async () => {
		const native = new FakeNativeCommands()
		const proxyCalls: string[] = []
		const runtime = createDesktopRuntime({
			native,
			platformNative: {
				...fakePlatformNative,
				async enableSystemProxy(input) {
					proxyCalls.push(`enable:${input.host}:${input.port}`)
				},
				async disableSystemProxy() {
					proxyCalls.push('disable')
				},
				async statusSystemProxy() {
					return { capability: 'system-proxy', supported: true }
				},
			},
			profileDocument: new MemoryDocumentStore(),
			settingsDocument: new MemoryDocumentStore(),
			subscriptionDocument: new MemoryDocumentStore(),
		})

		await runtime.settingsStore.write({ engineId: 'sing-box' })
		await runtime.connection.connect(profile, {
			mode: 'proxy',
			localPort: 12080,
		})

		expect(native.startedSingBoxConfigs).toHaveLength(1)
		expect(native.startedSingBoxConfigs[0]?.inbounds[0]).toMatchObject({
			type: 'mixed',
			listen: '127.0.0.1',
			listen_port: 12080,
		})
		expect(proxyCalls).toEqual(['enable:127.0.0.1:12080'])

		await runtime.connection.disconnect()

		expect(native.singBoxRunning).toBe(false)
		expect(proxyCalls).toEqual(['enable:127.0.0.1:12080', 'disable'])
	})

	it('does not overwrite a pre-existing system proxy configuration', async () => {
		const native = new FakeNativeCommands()
		const runtime = createDesktopRuntime({
			native,
			platformNative: {
				...fakePlatformNative,
				async statusSystemProxy() {
					return {
						capability: 'system-proxy',
						supported: true,
						enabled: true,
					}
				},
			},
			profileDocument: new MemoryDocumentStore(),
			settingsDocument: new MemoryDocumentStore(),
			subscriptionDocument: new MemoryDocumentStore(),
		})

		await expect(
			runtime.connection.connect(profile, { mode: 'proxy', localPort: 12080 }),
		).rejects.toThrow(
			'System proxy is already enabled. Disable it before using RahRow proxy fallback.',
		)
		expect(native.startedConfigs).toEqual([])
	})

	it('records diagnostics refreshes and forwards new native engine output once', async () => {
		const runtime = createDesktopRuntime({
			native: new FakeNativeCommands(),
			platformNative: {
				...fakePlatformNative,
				async diagnostics() {
					return {
						capabilities: [
							{
								capability: 'xray-sidecar',
								supported: true,
								enabled: false,
							},
						],
						output: [
							{
								sequence: 1,
								source: 'xray',
								stream: 'stderr' as const,
								line: 'transport handshake failed',
								observedAt: 1,
							},
						],
					}
				},
			},
			profileDocument: new MemoryDocumentStore(),
			settingsDocument: new MemoryDocumentStore(),
			subscriptionDocument: new MemoryDocumentStore(),
		})

		await runtime.diagnostics.snapshot()
		await runtime.diagnostics.snapshot()

		const records = runtime.logs.records()
		expect(
			records.filter((record) => record.msg === 'Diagnostics refreshed'),
		).toHaveLength(2)
		expect(
			records.filter((record) => record.msg === 'transport handshake failed'),
		).toHaveLength(1)
		expect(
			records.find((record) => record.msg === 'transport handshake failed'),
		).toMatchObject({
			level: 'warn',
			module: 'xray',
			bindings: { stream: 'stderr', nativeObservedAt: 1 },
		})
	})
})
