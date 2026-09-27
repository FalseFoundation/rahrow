import { AdGateController } from '@rahrow/ads/ad-gate.ts'
import {
	createDevelopmentAdProvider,
	createHouseAdProvider,
} from '@rahrow/ads/house-ad-provider.ts'
import type { ConnectionMode } from '@rahrow/core/connection/connection-mode.ts'
import { createLogBuffer } from '@rahrow/core/logging/log-buffer.ts'
import type { Logger } from '@rahrow/core/logging/logger.ts'
import { createPinoLogger } from '@rahrow/core/logging/pino-logger.ts'
import {
	createCloudflareNetworkQualityProbe,
	type NetworkQualityProbe,
} from '@rahrow/core/network/cloudflare-network-quality.ts'
import type { NetworkIdentity } from '@rahrow/core/platform/capabilities.ts'
import type {
	EgressIdentity,
	EgressIdentityRequester,
} from '@rahrow/core/platform/egress-identity.ts'
import { VpnTunnelCoordinator } from '@rahrow/core/platform/vpn-tunnel-provider.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { defaultProtocolRegistry } from '@rahrow/core/protocol/connection-protocol.ts'
import {
	createStringDocumentReset,
	ResetOrchestrator,
} from '@rahrow/core/settings/reset-orchestrator.ts'
import type { StringDocumentStore } from '@rahrow/core/storage/json-store.ts'
import {
	JsonProfileStore,
	JsonSettingsStore,
} from '@rahrow/core/storage/json-store.ts'
import { JsonSubscriptionStore } from '@rahrow/core/storage/subscription-store.ts'
import {
	type BufferedSubscriptionHttpResponse,
	createBufferedSubscriptionResponse,
	createFetchSubscriptionTransport,
	createHttpSubscriptionFetcher,
} from '@rahrow/core/subscription/http-subscription-fetcher.ts'
import type { SubscriptionFetcher } from '@rahrow/core/subscription/subscription-import.ts'
import {
	SingBoxRawDocumentAdapter,
	XrayRawDocumentAdapter,
} from '@rahrow/engine/import/raw-engine-document.ts'
import { redactDiagnosticsSnapshot } from '@rahrow/features/app/diagnostics-snapshot.ts'
import type {
	AppRuntime,
	ConnectionPort,
	DiagnosticsPort,
} from '@rahrow/features/app/runtime.tsx'
import { createSmartConnectRuntime } from '@rahrow/features/smart-connect/smart-connect-runtime.ts'
import singBoxRuntime from '../../../../engines/sing-box/runtime.json'
import xrayRuntime from '../../../../engines/xray/runtime.json'

import {
	createDesktopConnectionStack,
	type DesktopConnectionCommands,
	type DesktopNativeCommands,
} from './connection-commands.ts'
import { DesktopVpnTunnelProvider } from './desktop-vpn-tunnel-provider.ts'
import { createDesktopEgressIdentity } from './egress-identity.ts'
import {
	createDesktopPlatformCapabilities,
	createTauriDesktopNativePlatformCommands,
	type DesktopNativePlatformCommands,
	type DesktopPlatformCapabilities,
	type WebviewPlatformEnvironment,
} from './platform-capabilities.ts'
import { createDesktopRoutedHttpRequester } from './routed-http.ts'
import { createDesktopDocumentStore } from './tauri-document-store.ts'

export interface CreateDesktopRuntimeOptions {
	readonly advertising?: AppRuntime['advertising'] | null
	readonly advertisingDocument?: StringDocumentStore
	readonly buildMetadata?: AppRuntime['buildMetadata']
	readonly clearSecureCredentials?: () => Promise<void>
	readonly native?: DesktopNativeCommands
	readonly platformNative?: DesktopNativePlatformCommands
	readonly environment?: WebviewPlatformEnvironment
	readonly profileDocument?: StringDocumentStore
	readonly settingsDocument?: StringDocumentStore
	readonly subscriptionDocument?: StringDocumentStore
	readonly subscriptionFetcher?: SubscriptionFetcher
	readonly resolveSubscriptionCredential?: (
		credentialId: string,
	) => Promise<string | undefined>
	readonly networkIdentity?: NetworkIdentity
	readonly egressIdentity?: EgressIdentity
	readonly networkQuality?: NetworkQualityProbe
	readonly routedRequest?: EgressIdentityRequester
	readonly rawEngineDocumentStore?: (
		engineId: 'xray' | 'sing-box',
	) => StringDocumentStore
}

export function createDesktopRuntime(
	options: CreateDesktopRuntimeOptions = {},
): AppRuntime {
	const logs = createLogBuffer()
	const logger = createPinoLogger({
		name: 'RahRow',
		destination: logs,
		level: 'debug',
	})
	const settingsDocument =
		options.settingsDocument ?? createDesktopDocumentStore('settings.json')
	const profileDocument =
		options.profileDocument ?? createDesktopDocumentStore('profiles.json')
	const subscriptionDocument =
		options.subscriptionDocument ??
		createDesktopDocumentStore('subscriptions.json')
	const settingsStore = new JsonSettingsStore(settingsDocument)
	const profileStore = new JsonProfileStore(profileDocument)
	const subscriptionStore = new JsonSubscriptionStore(subscriptionDocument)
	const stack = createDesktopConnectionStack(options.native, {
		logger,
		selectEngine: async () => (await settingsStore.read()).engineId ?? 'sing-box',
	})
	const platform = createDesktopPlatformCapabilities(
		options.environment,
		options.platformNative ?? createTauriDesktopNativePlatformCommands(),
	)
	const networkIdentity = options.networkIdentity ?? platform.networkIdentity
	const tunnel = new VpnTunnelCoordinator(
		new DesktopVpnTunnelProvider(platform.vpn, stack.commands, platform.tunnel),
	)
	const advertising =
		options.advertising === null
			? undefined
			: (options.advertising ??
				createDesktopAdvertising(options.advertisingDocument))
	const routedRequest =
		options.routedRequest ?? createDesktopRoutedHttpRequester()
	logger.child({ module: 'runtime' }).info('Desktop runtime initialized')
	const connection = createDesktopConnectionPort(
		stack.commands,
		platform,
		tunnel,
		async () => (await settingsStore.read()).engineId ?? 'sing-box',
	)
	const smartConnect = createSmartConnectRuntime({
		profileStore,
		settingsStore,
		connection,
		schedule: {
			onError: (error) =>
				logger
					.child({ module: 'smart-connect' })
					.warn(
						{ error: error instanceof Error ? error.message : String(error) },
						'Smart Connect background run failed',
					),
		},
	})
	const buildMetadata = options.buildMetadata ?? createBuildMetadata()
	const rawEngineDocuments = createRawEngineDocuments(
		buildMetadata,
		options.rawEngineDocumentStore,
	)
	const reset = new ResetOrchestrator({
		settings: settingsStore,
		profiles: profileStore,
		subscriptions: subscriptionStore,
		additionalAppData: rawEngineDocuments.adapters.map((adapter) => ({
			snapshot: () =>
				createStringDocumentReset(
					rawEngineDocuments.storeFor(adapter.engineId),
				).snapshot(),
			clear: () =>
				createStringDocumentReset(
					rawEngineDocuments.storeFor(adapter.engineId),
				).clear(),
			restore: (snapshot) =>
				createStringDocumentReset(
					rawEngineDocuments.storeFor(adapter.engineId),
				).restore(snapshot),
		})),
		disconnectAndCleanup: () => connection.disconnect(),
		...(options.clearSecureCredentials
			? { credentials: { clear: options.clearSecureCredentials } }
			: {}),
		clearTransientState: () => logs.clear(),
	})
	return {
		buildMetadata,
		...(advertising ? { advertising } : {}),
		profileStore,
		settingsStore,
		subscriptionStore,
		registry: defaultProtocolRegistry,
		engine: stack.engine,
		availableEngines: stack.registry.list().map((engine) => engine.manifest),
		connection,
		reset,
		rawEngineDocuments,
		smartConnect,
		egressIdentity:
			options.egressIdentity ??
			createDesktopEgressIdentity(globalThis.fetch, routedRequest),
		egressPath: 'local-proxy',
		networkQuality:
			options.networkQuality ??
			createCloudflareNetworkQualityProbe({ routedRequest }),
		capabilities: {
			clipboard: platform.clipboard,
			...(platform.externalNavigation
				? { externalNavigation: platform.externalNavigation }
				: {}),
			share: platform.share,
			...(platform.fileSave ? { fileSave: platform.fileSave } : {}),
			...(platform.filePick ? { filePick: platform.filePick } : {}),
			qrEncoder: platform.qrEncoder,
			...(platform.qrDecoder ? { qrDecoder: platform.qrDecoder } : {}),
			autostart: platform.autostart,
			vpn: platform.vpn,
			systemProxy: platform.systemProxy,
			lanProxySharing: {
				supported: false,
				detail:
					'LAN proxy sharing is unavailable until this desktop build provides authenticated listeners and firewall cleanup.',
			},
			...(networkIdentity ? { networkIdentity } : {}),
		},
		diagnostics: createDesktopDiagnosticsPort(stack.commands, platform, logger),
		subscriptionFetcher:
			options.subscriptionFetcher ??
			createDesktopSubscriptionFetcher({
				resolveCredential: options.resolveSubscriptionCredential,
			}),
		logger,
		logs,
	}
}

function createBuildMetadata(): NonNullable<AppRuntime['buildMetadata']> {
	const xrayVersion =
		import.meta.env.VITE_RAHROW_XRAY_VERSION?.trim() || xrayRuntime.version
	const singBoxVersion =
		import.meta.env.VITE_RAHROW_SING_BOX_VERSION?.trim() || singBoxRuntime.version
	return {
		...(import.meta.env.VITE_RAHROW_VERSION?.trim()
			? { version: import.meta.env.VITE_RAHROW_VERSION.trim() }
			: {}),
		...(import.meta.env.VITE_RAHROW_BUILD?.trim()
			? { build: import.meta.env.VITE_RAHROW_BUILD.trim() }
			: {}),
		engines: [
			{
				id: 'xray',
				...(xrayVersion ? { version: xrayVersion } : {}),
				license: 'MPL-2.0',
			},
			{
				id: 'sing-box',
				...(singBoxVersion ? { version: singBoxVersion } : {}),
				license: 'GPL-3.0-or-later',
			},
		],
		about: {
			...(import.meta.env.VITE_RAHROW_TELEGRAM_URL?.trim()
				? { telegramUrl: import.meta.env.VITE_RAHROW_TELEGRAM_URL.trim() }
				: {}),
			...(import.meta.env.VITE_RAHROW_DONATION_URL?.trim()
				? { donationUrl: import.meta.env.VITE_RAHROW_DONATION_URL.trim() }
				: {}),
		},
	}
}

function createRawEngineDocuments(
	buildMetadata: NonNullable<AppRuntime['buildMetadata']>,
	createStore: (engineId: 'xray' | 'sing-box') => StringDocumentStore = (
		engineId,
	) => createDesktopDocumentStore(`raw-engine/${engineId}.json`),
): NonNullable<AppRuntime['rawEngineDocuments']> {
	const versionFor = (engineId: 'xray' | 'sing-box') =>
		buildMetadata.engines?.find((engine) => engine.id === engineId)?.version
	const adapters = [
		...(versionFor('xray')
			? [new XrayRawDocumentAdapter(versionFor('xray') as string)]
			: []),
		...(versionFor('sing-box')
			? [new SingBoxRawDocumentAdapter(versionFor('sing-box') as string)]
			: []),
	]
	const stores = new Map<'xray' | 'sing-box', StringDocumentStore>()
	return {
		adapters,
		storeFor(engineId) {
			if (engineId !== 'xray' && engineId !== 'sing-box') {
				throw new Error(`Raw ${engineId} documents are unavailable in this build.`)
			}
			if (!adapters.some((adapter) => adapter.engineId === engineId)) {
				throw new Error(`Raw ${engineId} documents are unavailable in this build.`)
			}
			const store = stores.get(engineId) ?? createStore(engineId)
			stores.set(engineId, store)
			return store
		},
	}
}

function createDesktopAdvertising(
	advertisingDocument?: StringDocumentStore,
): AppRuntime['advertising'] | undefined {
	const sponsor = import.meta.env.VITE_RAHROW_AD_SPONSOR?.trim()
	const headline = import.meta.env.VITE_RAHROW_AD_HEADLINE?.trim()
	const body = import.meta.env.VITE_RAHROW_AD_BODY?.trim()
	const storage =
		advertisingDocument ??
		(typeof globalThis.localStorage === 'undefined' &&
		!('__TAURI_INTERNALS__' in globalThis)
			? undefined
			: createDesktopDocumentStore('ads.json'))
	if (!storage) return undefined
	if (
		import.meta.env.VITE_RAHROW_ADS_ENABLED !== 'true' ||
		!sponsor ||
		!headline ||
		!body
	)
		return import.meta.env.DEV
			? {
					gate: new AdGateController({
						storage,
					}),
					provider: createDevelopmentAdProvider(),
				}
			: undefined

	return {
		gate: new AdGateController({
			storage,
		}),
		provider: createHouseAdProvider({
			sponsor,
			headline,
			body,
			...(import.meta.env.VITE_RAHROW_AD_ACTION_LABEL?.trim()
				? { actionLabel: import.meta.env.VITE_RAHROW_AD_ACTION_LABEL.trim() }
				: {}),
			...(import.meta.env.VITE_RAHROW_AD_ACTION_URL?.trim()
				? { actionUrl: import.meta.env.VITE_RAHROW_AD_ACTION_URL.trim() }
				: {}),
		}),
	}
}

export interface DesktopSubscriptionHttpResponse
	extends BufferedSubscriptionHttpResponse {
	readonly body: string
}

export interface DesktopSubscriptionFetchInput {
	readonly url: string
	readonly authorization?: string
}

export interface DesktopSubscriptionFetcherOptions {
	readonly nativeRequest?: (
		input: DesktopSubscriptionFetchInput,
	) => Promise<DesktopSubscriptionHttpResponse>
	readonly fetch?: typeof globalThis.fetch
	readonly resolveCredential?: (
		credentialId: string,
	) => Promise<string | undefined>
}

export function createDesktopSubscriptionFetcher(
	options: DesktopSubscriptionFetcherOptions = {},
): SubscriptionFetcher {
	const nativeRequest =
		options.nativeRequest ??
		('__TAURI_INTERNALS__' in globalThis
			? async (input: DesktopSubscriptionFetchInput) => {
					const { invoke } = await import('@tauri-apps/api/core')
					return await invoke<DesktopSubscriptionHttpResponse>('rahrow_http_get', {
						url: input.url,
						authorization: input.authorization,
					})
				}
			: undefined)
	const transport = nativeRequest
		? {
				async request(input: {
					readonly url: string
					readonly headers: Readonly<Record<string, string>>
				}) {
					return createBufferedSubscriptionResponse(
						await nativeRequest({
							url: input.url,
							...(input.headers.Authorization
								? { authorization: input.headers.Authorization }
								: {}),
						}),
					)
				},
			}
		: createFetchSubscriptionTransport(options.fetch)

	return createHttpSubscriptionFetcher({
		transport,
		resolveCredential: options.resolveCredential,
	})
}

function createDesktopConnectionPort(
	commands: DesktopConnectionCommands,
	platform: DesktopPlatformCapabilities,
	tunnel: VpnTunnelCoordinator,
	selectEngine: () => Promise<'xray' | 'sing-box' | (string & {})>,
): ConnectionPort {
	let activeMode: ConnectionMode | undefined
	let activeEngineId: 'xray' | 'sing-box' | (string & {}) | undefined
	let activeLocalPort: number | undefined
	let activeProfile: ConnectionProfile | undefined
	const assertProxyAvailable = async () => {
		const proxyStatus = await platform.systemProxy.status()
		if (!proxyStatus.supported) {
			throw new Error(
				proxyStatus.detail ??
					'System proxy fallback is not available in this desktop build.',
			)
		}
		if (proxyStatus.enabled && activeMode !== 'proxy') {
			throw new Error(
				'System proxy is already enabled. Disable it before using RahRow proxy fallback.',
			)
		}
	}

	return {
		async canConnect(_profile, options) {
			if (options.mode === 'proxy') await assertProxyAvailable()
		},
		async connect(profile: ConnectionProfile, options) {
			if (options.mode === 'vpn') {
				// System proxy and TUN fight over the same flows; clear leftover
				// proxy mode (including Happ) before owning the tunnel.
				const proxyStatus = await platform.systemProxy.status()
				if (proxyStatus.enabled) {
					await platform.systemProxy.disable()
				}
				const engineId = options.engineId ?? (await selectEngine())
				await tunnel.connect({
					profile,
					engineId,
					localPort: options.localPort,
				})
				activeMode = 'vpn'
				activeEngineId = engineId
				activeLocalPort = options.localPort
				activeProfile = profile
				return
			}

			await assertProxyAvailable()

			const localPort = options.localPort ?? 10808
			const result = await commands.connect({
				profile,
				engineId: options.engineId,
				mode: 'proxy',
				localPort,
			})

			if (!result.ok) {
				throw new Error(result.error.message)
			}

			try {
				await platform.systemProxy.enable({ host: '127.0.0.1', port: localPort })
				activeMode = 'proxy'
				activeEngineId = options.engineId ?? (await selectEngine())
				activeLocalPort = localPort
				activeProfile = profile
			} catch (error) {
				await commands.disconnect()
				throw asError(error, 'Failed to enable system proxy fallback')
			}
		},
		async disconnect() {
			let proxyError: Error | undefined
			if (activeMode === 'proxy') {
				try {
					await platform.systemProxy.disable()
				} catch (error) {
					proxyError = asError(error, 'Failed to restore system proxy settings')
				}
			}
			if (activeMode === 'vpn') {
				await tunnel.disconnect()
				activeMode = undefined
				activeEngineId = undefined
				activeLocalPort = undefined
				activeProfile = undefined
				return
			}

			activeMode = undefined
			activeEngineId = undefined
			activeLocalPort = undefined
			activeProfile = undefined
			const result = await commands.disconnect()

			if (!result.ok) {
				throw new Error(result.error.message)
			}
			if (proxyError) {
				throw proxyError
			}
		},
		async status() {
			if (activeMode === 'vpn') {
				const status = await tunnel.status()
				return {
					state: status.state,
					profile: status.state === 'connected' ? activeProfile : undefined,
					mode: 'vpn',
					engineId: status.engineId ?? activeEngineId,
					localPort: activeLocalPort,
					engineStatus: status.state === 'connected' ? 'running' : 'stopped',
					profileId: status.profileId,
					error: status.detail,
				}
			}

			const result = await commands.status()

			if (!result.ok) {
				return {
					state: 'error',
					error: result.error.message,
				}
			}

			return {
				state: result.data.connection?.state ?? 'disconnected',
				profile: result.data.connection ? activeProfile : undefined,
				mode: activeMode,
				engineId: activeEngineId,
				localPort: activeLocalPort,
				engineStatus: result.data.engine.status,
				profileId: result.data.connection?.profile.id,
				error: result.data.connection?.error,
			}
		},
		async test(profile) {
			const result = await commands.latency(profile)

			if (!result.ok) {
				return {
					reachable: false,
					error: result.error.message,
				}
			}

			return {
				reachable: result.data.reachable,
				latencyMs: result.data.latencyMs,
				error: result.data.error,
			}
		},
	}
}

function createDesktopDiagnosticsPort(
	commands: DesktopConnectionCommands,
	platform: DesktopPlatformCapabilities,
	logger: Logger,
): DiagnosticsPort {
	const lastNativeOutputSequence = new Map<string, number>()

	return {
		async snapshot() {
			const [status, diagnostics] = await Promise.all([
				commands.status(),
				platform.diagnostics.diagnostics(),
			])

			for (const output of diagnostics.output ?? []) {
				const lastSequence = lastNativeOutputSequence.get(output.source) ?? 0
				if (output.sequence <= lastSequence) continue
				lastNativeOutputSequence.set(output.source, output.sequence)
				const nativeLogger = logger.child({
					module: output.source,
					stream: output.stream,
					nativeObservedAt: output.observedAt,
				})
				if (output.stream === 'stderr') nativeLogger.warn(output.line)
				else nativeLogger.info(output.line)
			}

			const snapshot = {
				engineStatus: status.ok ? status.data.engine.status : 'error',
				lastError: status.ok ? status.data.connection?.error : status.error.message,
				capabilities: diagnostics.capabilities.map((capability) => ({
					name: capability.capability,
					supported: capability.supported,
					enabled: capability.enabled,
					detail: capability.detail,
				})),
			}
			logger
				.child({ module: 'diagnostics' })
				.debug({ engineStatus: snapshot.engineStatus }, 'Diagnostics refreshed')
			return redactDiagnosticsSnapshot(snapshot)
		},
	}
}
