import { Capacitor } from '@capacitor/core'
import { AdGateController } from '@rahrow/ads/ad-gate.ts'
import { createDevelopmentAdProvider } from '@rahrow/ads/house-ad-provider.ts'
import type { ConnectionMode } from '@rahrow/core/connection/connection-mode.ts'
import { RahrowError } from '@rahrow/core/errors.ts'
import { createLogBuffer } from '@rahrow/core/logging/log-buffer.ts'
import { createPinoLogger } from '@rahrow/core/logging/pino-logger.ts'
import {
	createCloudflareNetworkQualityProbe,
	type NetworkQualityProbe,
} from '@rahrow/core/network/cloudflare-network-quality.ts'
import {
	createBrowserFilePick,
	createBrowserFileSave,
} from '@rahrow/core/platform/browser-file-capabilities.ts'
import type {
	Clipboard,
	ExternalNavigation,
	FilePick,
	FileSave,
	NetworkIdentity,
	QrDecoder,
	QrEncoder,
	Share,
} from '@rahrow/core/platform/capabilities.ts'
import type {
	EgressIdentity,
	EgressIdentityRequester,
} from '@rahrow/core/platform/egress-identity.ts'
import { VpnTunnelCoordinator } from '@rahrow/core/platform/vpn-tunnel-provider.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { defaultProtocolRegistry } from '@rahrow/core/protocol/connection-protocol.ts'
import type {
	EngineId,
	ProxyEngine,
} from '@rahrow/core/runtime/proxy-engine.ts'
import {
	createStringDocumentReset,
	ResetOrchestrator,
} from '@rahrow/core/settings/reset-orchestrator.ts'
import {
	JsonProfileStore,
	JsonSettingsStore,
	type StringDocumentStore,
} from '@rahrow/core/storage/json-store.ts'
import { JsonSubscriptionStore } from '@rahrow/core/storage/subscription-store.ts'
import {
	SingBoxRawDocumentAdapter,
	XrayRawDocumentAdapter,
} from '@rahrow/engine/import/raw-engine-document.ts'
import { createEngineRegistry } from '@rahrow/engine/registry/engine-registry.ts'
import { SelectedEngine } from '@rahrow/engine/registry/selected-engine.ts'
import {
	SingBoxConfigBuilder,
	SingBoxEngine,
} from '@rahrow/engine/sing-box/sing-box-engine.ts'
import {
	XrayConfigBuilder,
	XrayEngine,
} from '@rahrow/engine/xray/xray-engine.ts'
import { redactDiagnosticsSnapshot } from '@rahrow/features/app/diagnostics-snapshot.ts'
import type {
	AppRuntime,
	ConnectionPort,
	DiagnosticsPort,
} from '@rahrow/features/app/runtime.tsx'
import { QrCameraPreview } from '@rahrow/features/import/QrCameraPreview.tsx'
import { createQrTextPayload } from '@rahrow/features/share/qr-text-payload.ts'
import { createSmartConnectRuntime } from '@rahrow/features/smart-connect/smart-connect-runtime.ts'
import { createElement } from 'react'
import singBoxRuntime from '../../../../engines/sing-box/runtime.json'
import xrayRuntime from '../../../../engines/xray/runtime.json'
import { AdMobAdProvider } from './admob-ad-provider.ts'
import {
	CapacitorEngineLatencyProbe,
	CapacitorEngineProcess,
} from './capacitor-engine-runtime.ts'
import { createMobileEgressIdentity } from './egress-identity.ts'
import { createMobileDocumentStore } from './mobile-document-store.ts'
import { createMobileQrDecoder, nativeRahRowQr } from './mobile-qr.ts'
import { createMobileSubscriptionFetcher } from './mobile-subscription-fetcher.ts'
import {
	type CapacitorMobileVpn,
	type MobileVpnPlatform,
	mobileVpn,
} from './mobile-vpn.ts'
import { MobileVpnTunnelProvider } from './mobile-vpn-tunnel-provider.ts'
import { createMobileRoutedHttpRequester } from './routed-http.ts'

export interface CreateMobileRuntimeOptions {
	readonly advertising?: AppRuntime['advertising'] | null
	readonly advertisingDocument?: StringDocumentStore
	readonly buildMetadata?: AppRuntime['buildMetadata']
	readonly clearSecureCredentials?: () => Promise<void>
	readonly platform?: MobileVpnPlatform
	readonly vpn?: CapacitorMobileVpn
	readonly qrDecoder?: QrDecoder
	readonly profileDocument?: StringDocumentStore
	readonly settingsDocument?: StringDocumentStore
	readonly subscriptionDocument?: StringDocumentStore
	readonly networkIdentity?: NetworkIdentity
	readonly egressIdentity?: EgressIdentity
	readonly networkQuality?: NetworkQualityProbe
	readonly routedRequest?: EgressIdentityRequester
	readonly externalNavigation?: ExternalNavigation
	readonly fileSave?: FileSave
	readonly filePick?: FilePick
	readonly helperCapabilities?: MobileHelperCapabilitiesInput
	readonly resolveSubscriptionCredential?: (
		credentialId: string,
	) => Promise<string>
	readonly rawEngineDocumentStore?: (
		engineId: 'xray' | 'sing-box',
	) => StringDocumentStore
}

export interface MobileHelperCapabilitiesInput {
	readonly clipboard?: Clipboard
	readonly share?: Share
}

export interface MobileHelperCapabilities {
	readonly clipboard: Clipboard
	readonly share?: Share
}

export function createMobileRuntime(
	options: CreateMobileRuntimeOptions = {},
): AppRuntime {
	const vpn = options.vpn ?? mobileVpn
	const platform = options.platform ?? Capacitor.getPlatform()
	const logs = createLogBuffer()
	const logger = createPinoLogger({
		name: 'RahRow',
		destination: logs,
		level: 'debug',
	})
	const settingsDocument =
		options.settingsDocument ?? createMobileDocumentStore('settings.json')
	const profileDocument =
		options.profileDocument ?? createMobileDocumentStore('profiles.json')
	const subscriptionDocument =
		options.subscriptionDocument ??
		createMobileDocumentStore('subscriptions.json')
	const settingsStore = new JsonSettingsStore(settingsDocument)
	const profileStore = new JsonProfileStore(profileDocument)
	const subscriptionStore = new JsonSubscriptionStore(subscriptionDocument)
	const xrayProcess = new CapacitorEngineProcess('xray', vpn)
	const singBoxProcess = new CapacitorEngineProcess('sing-box', vpn)
	const latencyProbe = new CapacitorEngineLatencyProbe(vpn)
	const xray = new XrayEngine(
		xrayProcess,
		new XrayConfigBuilder(),
		latencyProbe,
		undefined,
		logger,
	)
	const singBox = new SingBoxEngine(
		singBoxProcess,
		new SingBoxConfigBuilder(),
		latencyProbe,
		undefined,
		logger,
	)
	const engineRegistry = createEngineRegistry([xray, singBox])
	const selectEngine = async (): Promise<EngineId> => {
		return (await settingsStore.read()).engineId ?? 'sing-box'
	}
	const engine = new SelectedEngine(engineRegistry, selectEngine)
	const tunnel = new VpnTunnelCoordinator(
		new MobileVpnTunnelProvider(
			vpn,
			platform === 'android' || platform === 'ios' ? platform : 'unknown',
		),
	)
	const nativeQrDecoder = createMobileQrDecoder()
	const qrDecoder = options.qrDecoder ?? nativeQrDecoder
	const helperCapabilities = createMobileHelperCapabilities(
		platform,
		options.helperCapabilities,
	)
	const fileSave =
		options.fileSave ??
		(globalThis.document ? createBrowserFileSave(globalThis.document) : undefined)
	const filePick =
		options.filePick ??
		(globalThis.document ? createBrowserFilePick(globalThis.document) : undefined)
	const advertising =
		options.advertising === null
			? undefined
			: (options.advertising ??
				createMobileAdvertising(platform, options.advertisingDocument))
	const routedRequest =
		options.routedRequest ?? createMobileRoutedHttpRequester({ platform })

	const connection = createMobileConnectionPort(tunnel, engine, selectEngine)
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
		...(platform === 'android' || platform === 'ios' ? { platform } : {}),
		buildMetadata,
		...(advertising ? { advertising } : {}),
		profileStore,
		settingsStore,
		subscriptionStore,
		registry: defaultProtocolRegistry,
		engine,
		availableEngines: engineRegistry
			.list()
			.map((candidate) => candidate.manifest),
		connection,
		reset,
		rawEngineDocuments,
		smartConnect,
		egressIdentity:
			options.egressIdentity ??
			createMobileEgressIdentity(globalThis.fetch, routedRequest),
		egressPath: platform === 'android' ? 'local-proxy' : 'captured',
		networkQuality:
			options.networkQuality ??
			createCloudflareNetworkQualityProbe({ routedRequest }),
		capabilities: {
			clipboard: helperCapabilities.clipboard,
			...(options.externalNavigation
				? { externalNavigation: options.externalNavigation }
				: {}),
			...(helperCapabilities.share ? { share: helperCapabilities.share } : {}),
			...(fileSave ? { fileSave } : {}),
			...(filePick ? { filePick } : {}),
			qrEncoder: new MobileQrEncoder(),
			qrDecoder,
			vpn,
			lanProxySharing: {
				supported: false,
				detail:
					'LAN proxy sharing is not provided by the Android or iOS VPN adapter.',
			},
			networkIdentity: options.networkIdentity ?? vpn,
		},
		diagnostics: createMobileDiagnosticsPort(vpn),
		subscriptionFetcher: createMobileSubscriptionFetcher({
			resolveCredential: options.resolveSubscriptionCredential,
		}),
		logger,
		logs,
		...(nativeQrDecoder
			? {
					renderQrCameraPreview: () =>
						createElement(QrCameraPreview, { camera: nativeRahRowQr }),
				}
			: {}),
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
	) => createMobileDocumentStore(`raw-engine.${engineId}.json`),
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
			const supportedEngineId = engineId as 'xray' | 'sing-box'
			if (!adapters.some((adapter) => adapter.engineId === supportedEngineId)) {
				throw new Error(`Raw ${engineId} documents are unavailable in this build.`)
			}
			const store = stores.get(supportedEngineId) ?? createStore(supportedEngineId)
			stores.set(supportedEngineId, store)
			return store
		},
	}
}

const testInterstitialIds = {
	android: 'ca-app-pub-3940256099942544/1033173712',
	ios: 'ca-app-pub-3940256099942544/4411468910',
} as const

export function resolveNativeAdConfiguration(
	platform: string,
	configuredId: string | undefined,
	isPreviewBuild: boolean,
): { readonly adUnitId: string; readonly isTesting: boolean } | undefined {
	if (platform !== 'android' && platform !== 'ios') return undefined

	const normalizedId = configuredId?.trim()
	const adUnitId =
		normalizedId || (isPreviewBuild ? testInterstitialIds[platform] : '')
	if (!adUnitId) return undefined

	return {
		adUnitId,
		isTesting: isPreviewBuild || !normalizedId,
	}
}

function createMobileAdvertising(
	platform: string,
	advertisingDocument?: StringDocumentStore,
): AppRuntime['advertising'] | undefined {
	const isNative = Capacitor.isNativePlatform()
	const isPreviewBuild =
		import.meta.env.DEV || import.meta.env.MODE === 'preview'
	const storage =
		advertisingDocument ??
		(!isNative && typeof globalThis.localStorage === 'undefined'
			? undefined
			: createMobileDocumentStore('ads.json'))
	if (!storage) return undefined
	if (!isNative || (platform !== 'android' && platform !== 'ios'))
		return isPreviewBuild
			? {
					gate: new AdGateController({
						storage,
					}),
					provider: createDevelopmentAdProvider(),
				}
			: undefined
	if (!Capacitor.isPluginAvailable('AdMob'))
		return isPreviewBuild
			? {
					gate: new AdGateController({ storage }),
					provider: createDevelopmentAdProvider(),
				}
			: undefined

	const configuration = resolveNativeAdConfiguration(
		platform,
		import.meta.env.VITE_RAHROW_ADMOB_INTERSTITIAL_ID,
		isPreviewBuild,
	)
	if (!configuration) return undefined

	return {
		gate: new AdGateController({
			storage,
		}),
		provider: new AdMobAdProvider({
			...configuration,
		}),
	}
}

function createMobileConnectionPort(
	tunnel: VpnTunnelCoordinator,
	engine: ProxyEngine,
	selectEngine: () => Promise<EngineId>,
): ConnectionPort {
	let activeEngineId: EngineId | undefined
	let activeLocalPort: number | undefined
	let activeProfile: ConnectionProfile | undefined
	const assertSupportedMode = (mode: ConnectionMode) => {
		if (mode === 'proxy') {
			throw new Error(
				'System proxy fallback is not available on mobile. Use VPN/TUN mode.',
			)
		}
	}
	return {
		async canConnect(_profile, options) {
			assertSupportedMode(options.mode)
		},
		async connect(profile, options) {
			assertSupportedMode(options.mode)

			const engineId = options.engineId ?? (await selectEngine())
			await tunnel.connect({
				profile,
				engineId,
				localPort: options.localPort,
			})
			activeEngineId = engineId
			activeLocalPort = options.localPort
			activeProfile = profile
		},
		async disconnect() {
			await tunnel.disconnect()
			activeEngineId = undefined
			activeLocalPort = undefined
			activeProfile = undefined
		},
		async status() {
			try {
				const status = await tunnel.status()

				return {
					state: status.state,
					profile: status.state === 'connected' ? activeProfile : undefined,
					mode: status.state === 'connected' ? 'vpn' : undefined,
					engineId: status.engineId ?? activeEngineId,
					localPort: activeLocalPort,
					engineStatus: status.state === 'connected' ? 'running' : 'stopped',
					profileId: status.profileId ?? activeProfile?.id,
					error: status.detail,
				}
			} catch {
				return { state: 'unavailable' }
			}
		},
		async test(profile) {
			const result = await engine.test(profile)

			return {
				reachable: result.reachable,
				latencyMs: result.latencyMs,
				error: result.error,
			}
		},
	}
}

function createMobileDiagnosticsPort(vpn: CapacitorMobileVpn): DiagnosticsPort {
	return {
		async snapshot() {
			try {
				const result = await vpn.diagnostics()

				return redactDiagnosticsSnapshot({
					engineStatus: result.readiness,
					lastError: result.detail,
					capabilities: [
						{
							name: 'vpn',
							supported: result.nativeReady,
							detail: `${result.platform}: ${result.readiness}`,
						},
						{
							name: 'background-vpn',
							supported: result.activeConnectionInBackground === true,
							detail:
								result.platform === 'android'
									? 'Android keeps an active VPN connection in a foreground service.'
									: result.platform === 'ios'
										? 'iOS keeps an active VPN connection in its packet-tunnel extension.'
										: 'Background VPN ownership is unavailable on this platform.',
						},
						{
							name: 'background-smart-connect',
							supported: result.periodicSmartConnectInBackground === 'continuous',
							detail:
								result.periodicSmartConnectInBackground === 'continuous'
									? 'Smart Connect can run while RahRow remains in the background.'
									: 'Mobile systems schedule background work opportunistically. RahRow checks overdue Smart Connect work when the app becomes active.',
						},
						{
							name: 'hev-socks5-tunnel',
							supported: result.tunBackends?.['hev-socks5-tunnel'] === true,
							detail:
								result.tunBackends?.['hev-socks5-tunnel'] === true
									? 'HEV is the default VPN tunnel backend for compatible sing-box connections.'
									: result.platform === 'ios'
										? 'HEV remains experimental on Apple packet tunnels; RahRow uses the verified engine-native Network Extension backend.'
										: 'The pinned HEV native runtime is not bundled for this build.',
						},
					],
				})
			} catch (error) {
				return redactDiagnosticsSnapshot({
					engineStatus: 'unavailable',
					lastError:
						error instanceof Error ? error.message : 'VPN diagnostics failed',
					capabilities: [
						{
							name: 'vpn',
							supported: false,
							detail: 'Mobile VPN diagnostics are unavailable',
						},
					],
				})
			}
		},
	}
}

class UnsupportedMobileClipboard implements Clipboard {
	readonly supported = false

	constructor(private readonly platform: string) {}

	async read(): Promise<string> {
		throw this.error()
	}

	async write(): Promise<void> {
		throw this.error()
	}

	private error(): RahrowError {
		return new RahrowError(
			'unsupported_capability',
			`Mobile clipboard requires an installed native bridge on ${this.platform}`,
		)
	}
}

export function createMobileHelperCapabilities(
	platform: string,
	injected: MobileHelperCapabilitiesInput = {},
): MobileHelperCapabilities {
	if (platform !== 'android' && platform !== 'ios') {
		return { clipboard: new UnsupportedMobileClipboard(platform) }
	}

	return {
		clipboard: injected.clipboard ?? new UnsupportedMobileClipboard(platform),
		...(injected.share ? { share: injected.share } : {}),
	}
}

class MobileQrEncoder implements QrEncoder {
	async encode(value: string): Promise<unknown> {
		return createQrTextPayload(value)
	}
}
