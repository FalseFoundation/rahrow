import type { AdGateController } from '@rahrow/ads/ad-gate.ts'
import type { AdProvider } from '@rahrow/ads/ad-provider.ts'
import type { ConnectionMode } from '@rahrow/core/connection/connection-mode.ts'
import type { LogsPort } from '@rahrow/core/logging/log-buffer.ts'
import type { Logger } from '@rahrow/core/logging/logger.ts'
import type { NetworkQualityProbe } from '@rahrow/core/network/cloudflare-network-quality.ts'
import type {
	Autostart,
	Clipboard,
	ExternalNavigation,
	FilePick,
	FileSave,
	NetworkIdentity,
	QrDecoder,
	QrEncoder,
	Share,
	SystemProxy,
	Vpn,
} from '@rahrow/core/platform/capabilities.ts'
import type { EgressIdentity } from '@rahrow/core/platform/egress-identity.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type { RawEngineDocumentAdapter } from '@rahrow/core/profile/raw-engine-document.ts'
import type { ProtocolRegistry } from '@rahrow/core/protocol/connection-protocol.ts'
import type {
	EngineId,
	EngineManifest,
	ProxyEngine,
} from '@rahrow/core/runtime/proxy-engine.ts'
import type {
	ResetOutcome,
	ResetScope,
} from '@rahrow/core/settings/reset-orchestrator.ts'
import type {
	ProfileStore,
	SettingsStore,
	StringDocumentStore,
} from '@rahrow/core/storage/json-store.ts'
import type {
	SubscriptionFetcher,
	SubscriptionStore,
} from '@rahrow/core/subscription/subscription-import.ts'
import { createContext, type ReactNode, use } from 'react'

import { ShareDrawerProvider } from '../share/ShareDrawer.tsx'
import type { SmartConnectRuntime } from '../smart-connect/smart-connect-runtime.ts'

export interface ConnectionSnapshot {
	readonly state: string
	readonly profile?: ConnectionProfile
	readonly mode?: ConnectionMode
	readonly engineId?: EngineId
	readonly localPort?: number
	readonly engineStatus?: string
	readonly profileId?: string
	readonly error?: string
}

export interface LatencySnapshot {
	readonly reachable: boolean
	readonly latencyMs?: number
	readonly error?: string
}

export interface ConnectionPort {
	connect(
		profile: ConnectionProfile,
		options: {
			readonly mode: ConnectionMode
			readonly engineId?: EngineId
			readonly localPort?: number
		},
	): Promise<void>
	canConnect?(
		profile: ConnectionProfile,
		options: {
			readonly mode: ConnectionMode
			readonly engineId?: EngineId
			readonly localPort?: number
		},
	): Promise<void>
	disconnect(): Promise<void>
	status(): Promise<ConnectionSnapshot>
	test(profile: ConnectionProfile): Promise<LatencySnapshot>
	subscribe?(listener: (snapshot: ConnectionSnapshot) => void): () => void
}

export interface DiagnosticCapability {
	readonly name: string
	readonly supported: boolean
	readonly enabled?: boolean
	readonly detail?: string
}

export interface DiagnosticsSnapshot {
	readonly engineStatus?: string
	readonly lastError?: string
	readonly capabilities: readonly DiagnosticCapability[]
}

export interface DiagnosticsPort {
	snapshot(): Promise<DiagnosticsSnapshot>
}

export interface AppCapabilities {
	readonly clipboard: Clipboard
	readonly externalNavigation?: ExternalNavigation
	readonly share?: Share
	readonly fileSave?: FileSave
	readonly filePick?: FilePick
	readonly qrEncoder: QrEncoder
	readonly qrDecoder?: QrDecoder
	readonly autostart?: Autostart
	readonly vpn?: Vpn
	readonly systemProxy?: SystemProxy
	readonly networkIdentity?: NetworkIdentity
	readonly lanProxySharing?: {
		readonly supported: boolean
		readonly detail?: string
	}
}

export interface AppRuntime {
	readonly buildMetadata?: {
		readonly version?: string
		readonly build?: string
		readonly engines?: readonly {
			readonly id: EngineId
			readonly version?: string
			readonly license?: string
		}[]
		readonly about?: {
			readonly telegramUrl?: string
			readonly donationUrl?: string
		}
	}
	readonly profileStore: ProfileStore
	readonly settingsStore: SettingsStore
	readonly subscriptionStore: SubscriptionStore
	readonly registry: ProtocolRegistry
	readonly engine: ProxyEngine
	readonly availableEngines?: readonly EngineManifest[]
	readonly connection: ConnectionPort
	readonly rawEngineDocuments?: {
		readonly adapters: readonly RawEngineDocumentAdapter[]
		readonly storeFor: (
			engineId: RawEngineDocumentAdapter['engineId'],
		) => StringDocumentStore
	}
	readonly reset?: {
		reset(scope: ResetScope): Promise<ResetOutcome>
	}
	readonly smartConnect?: SmartConnectRuntime
	readonly egressIdentity?: EgressIdentity
	readonly networkQuality?: NetworkQualityProbe
	readonly capabilities: AppCapabilities
	readonly diagnostics: DiagnosticsPort
	readonly subscriptionFetcher: SubscriptionFetcher
	readonly logger: Logger
	readonly logs: LogsPort
	readonly renderQrCameraPreview?: () => ReactNode
	readonly advertising?: {
		readonly gate: AdGateController
		readonly provider: AdProvider
	}
}

const AppRuntimeContext = createContext<AppRuntime | null>(null)

export function AppRuntimeProvider({
	runtime,
	children,
}: {
	readonly runtime: AppRuntime
	readonly children: ReactNode
}) {
	return (
		<AppRuntimeContext value={runtime}>
			<ShareDrawerProvider capabilities={runtime.capabilities}>
				{children}
			</ShareDrawerProvider>
		</AppRuntimeContext>
	)
}

export function useAppRuntime(): AppRuntime {
	const runtime = use(AppRuntimeContext)

	if (!runtime) {
		throw new Error('AppRuntime is missing')
	}

	return runtime
}
