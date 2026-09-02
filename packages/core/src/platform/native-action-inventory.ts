import { type NativeActionId, nativeActionIds } from './capabilities.ts'

export const nativePlatforms = [
	'android',
	'ios',
	'macos',
	'linux',
	'windows',
	'cli',
] as const

export type NativePlatform = (typeof nativePlatforms)[number]
export type NativeActionState =
	| 'available'
	| 'unavailable'
	| 'verification-required'
export type NativeCancellation =
	| 'not-cancellable'
	| 'user-cancellable'
	| 'abort-signal'
	| 'idempotent-stop'

export interface RepositorySeamEvidence {
	readonly kind: 'repository'
	readonly path: string
	readonly seam: string
}

export interface MissingNativeActionEvidence {
	readonly kind: 'missing'
	readonly reason: string
}

export type NativeActionEvidence =
	| RepositorySeamEvidence
	| MissingNativeActionEvidence

export interface NativeActionPlatformEvidence {
	readonly platform: NativePlatform
	readonly state: NativeActionState
	readonly builds: readonly ('debug' | 'preview' | 'release')[]
	readonly architectures: readonly string[]
	readonly adapter: NativeActionEvidence
	readonly permissionOrEntitlement: string
	readonly cancellation: NativeCancellation
	readonly diagnostics: NativeActionEvidence
	readonly installedArtifactTest: NativeActionEvidence
	readonly unavailableReason?: string
}

export interface NativeActionDefinition {
	readonly id: NativeActionId
	readonly owningContract: string
	readonly errorTaxonomy: readonly string[]
	readonly secretHandling: string
	readonly consumers: readonly NativeActionEvidence[]
	readonly platforms: Readonly<
		Record<NativePlatform, NativeActionPlatformEvidence>
	>
}

export type NativeActionInventory = Record<
	NativeActionId,
	NativeActionDefinition
>

export interface NativeActionInventoryValidationOptions {
	readonly readRepositoryFile: (path: string) => string | undefined
}

export interface RuntimeNativeCapabilityStatus {
	readonly supported: boolean
	readonly detail?: string
}

export interface DerivedNativeActionStatus {
	readonly actionId: NativeActionId
	readonly platform: NativePlatform
	readonly supported: boolean
	readonly detail?: string
}

type TargetOverride = Partial<
	Omit<NativeActionPlatformEvidence, 'platform' | 'builds' | 'architectures'>
>

const repository = (path: string, seam: string): RepositorySeamEvidence => ({
	kind: 'repository',
	path,
	seam,
})
const missing = (reason: string): MissingNativeActionEvidence => ({
	kind: 'missing',
	reason,
})

const platformArchitectures: Record<NativePlatform, readonly string[]> = {
	android: ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'],
	ios: ['arm64', 'simulator-arm64', 'simulator-x86_64'],
	macos: ['aarch64', 'x86_64'],
	linux: ['x86_64', 'aarch64'],
	windows: ['x86_64', 'aarch64'],
	cli: ['host-supported'],
}

function platformEvidence(
	actionId: NativeActionId,
	platform: NativePlatform,
	override: TargetOverride = {},
): NativeActionPlatformEvidence {
	const state = override.state ?? 'unavailable'
	return {
		platform,
		state,
		builds: ['debug', 'preview', 'release'],
		architectures: platformArchitectures[platform],
		adapter:
			override.adapter ?? missing(`${platform} adapter has not been implemented`),
		permissionOrEntitlement: override.permissionOrEntitlement ?? 'none',
		cancellation: override.cancellation ?? 'not-cancellable',
		diagnostics:
			override.diagnostics ??
			missing(`${platform} action diagnostics have not been implemented`),
		installedArtifactTest:
			override.installedArtifactTest ??
			missing(`${platform} installed-artifact verification has not been run`),
		...(state === 'available'
			? {}
			: {
					unavailableReason:
						override.unavailableReason ??
						`${actionId} has no verified ${platform} release adapter`,
				}),
	}
}

function targets(
	actionId: NativeActionId,
	overrides: Partial<Record<NativePlatform, TargetOverride>> = {},
): Record<NativePlatform, NativeActionPlatformEvidence> {
	return Object.fromEntries(
		nativePlatforms.map((platform) => [
			platform,
			platformEvidence(actionId, platform, overrides[platform]),
		]),
	) as Record<NativePlatform, NativeActionPlatformEvidence>
}

const verificationRequired = (
	adapter: RepositorySeamEvidence,
	overrides: Omit<TargetOverride, 'state' | 'adapter'> = {},
): TargetOverride => ({
	state: 'verification-required',
	adapter,
	unavailableReason:
		overrides.unavailableReason ??
		'The adapter exists, but installed-artifact evidence is incomplete',
	...overrides,
})

const desktop = (
	seam: string,
	cancellation: NativeCancellation = 'not-cancellable',
): Partial<Record<NativePlatform, TargetOverride>> => {
	const target = verificationRequired(
		repository('apps/desktop/src/lib/platform-capabilities.ts', seam),
		{
			cancellation,
			diagnostics: repository(
				'apps/desktop/src/lib/platform-capabilities.ts',
				'DesktopNativeDiagnosticsProvider',
			),
			unavailableReason:
				'The adapter exists, but no installed desktop artifact test proves this action',
		},
	)
	return { macos: target, linux: target, windows: target }
}

const desktopWebview = (
	seam: string,
): Partial<Record<NativePlatform, TargetOverride>> => {
	const target = verificationRequired(
		repository('apps/desktop/src/lib/platform-capabilities.ts', seam),
		{
			unavailableReason:
				'The WebView adapter is runtime-conditional and has no native diagnostics or installed-app test',
		},
	)
	return { macos: target, linux: target, windows: target }
}

const mobile = (
	path: string,
	seam: string,
	overrides: Omit<TargetOverride, 'state' | 'adapter'> = {},
): Partial<Record<NativePlatform, TargetOverride>> => {
	const target = verificationRequired(repository(path, seam), {
		...overrides,
		unavailableReason:
			overrides.unavailableReason ??
			'The adapter exists, but no installed-device test proves this action',
	})
	return { android: target, ios: target }
}

const engineTargets: Partial<Record<NativePlatform, TargetOverride>> = {
	...mobile(
		'apps/mobile/src/lib/capacitor-engine-runtime.ts',
		'CapacitorEngineProcess',
		{ cancellation: 'idempotent-stop' },
	),
	macos: verificationRequired(
		repository(
			'packages/engine/src/runtime/node-engine-process-spawner.ts',
			'NodeEngineProcessSpawner',
		),
		{ cancellation: 'idempotent-stop' },
	),
	linux: verificationRequired(
		repository(
			'packages/engine/src/runtime/node-engine-process-spawner.ts',
			'NodeEngineProcessSpawner',
		),
		{ cancellation: 'idempotent-stop' },
	),
	windows: verificationRequired(
		repository(
			'packages/engine/src/runtime/node-engine-process-spawner.ts',
			'NodeEngineProcessSpawner',
		),
		{ cancellation: 'idempotent-stop' },
	),
	cli: verificationRequired(
		repository(
			'packages/engine/src/runtime/node-engine-process-spawner.ts',
			'NodeEngineProcessSpawner',
		),
		{
			cancellation: 'idempotent-stop',
			diagnostics: repository('apps/cli/src/commands.ts', 'runStatus'),
			unavailableReason:
				'Bundled-runtime tests exist, but an installed CLI artifact test is missing',
		},
	),
}

interface ActionInput {
	readonly owningContract: string
	readonly consumer: NativeActionEvidence
	readonly targets?: Partial<Record<NativePlatform, TargetOverride>>
	readonly errors?: readonly string[]
	readonly secretHandling?: string
}

function action(
	id: NativeActionId,
	input: ActionInput,
): NativeActionDefinition {
	return {
		id,
		owningContract: input.owningContract,
		errorTaxonomy: input.errors ?? ['unavailable', 'operation-failed'],
		secretHandling:
			input.secretHandling ?? 'No secret payload is accepted or retained.',
		consumers: [input.consumer],
		platforms: targets(id, input.targets),
	}
}

const consumer = repository
const missingConsumer = (action: string): MissingNativeActionEvidence =>
	missing(`${action} has no wired UI or CLI consumer yet`)
const publicText =
	'Treat text as user data; never include it in logs or diagnostics.'
const desktopAndMobile = (
	desktopSeam: string,
	mobileSeam: string,
): Partial<Record<NativePlatform, TargetOverride>> => ({
	...desktopWebview(desktopSeam),
	...mobile('apps/mobile/src/lib/app-runtime.ts', mobileSeam),
})

export const nativeActionInventory = {
	'clipboard.read': action('clipboard.read', {
		owningContract: 'Clipboard.read',
		consumer: consumer('packages/features/src/import/useImport.ts', 'clipboard'),
		targets: desktopWebview('WebviewClipboard'),
		secretHandling: publicText,
	}),
	'clipboard.write': action('clipboard.write', {
		owningContract: 'Clipboard.write',
		consumer: consumer(
			'packages/features/src/share/ShareDrawer.tsx',
			'clipboard',
		),
		targets: desktopWebview('WebviewClipboard'),
		secretHandling: publicText,
	}),
	'clipboard.paste': action('clipboard.paste', {
		owningContract: 'Clipboard.read',
		consumer: consumer('packages/features/src/import/Import.tsx', 'clipboard'),
		targets: desktopWebview('WebviewClipboard'),
		secretHandling: publicText,
	}),
	'qr.camera.permission': action('qr.camera.permission', {
		owningContract: 'QrCameraPreviewPort.authorizeCamera',
		consumer: consumer(
			'packages/features/src/import/QrCameraPreview.tsx',
			'startPreview',
		),
		targets: mobile('apps/mobile/src/lib/mobile-qr.ts', 'CapacitorQrDecoder', {
			permissionOrEntitlement: 'CAMERA / NSCameraUsageDescription',
			cancellation: 'user-cancellable',
		}),
	}),
	'qr.camera.preview': action('qr.camera.preview', {
		owningContract: 'QrCameraPreviewPort',
		consumer: consumer(
			'packages/features/src/import/QrCameraPreview.tsx',
			'QrCameraPreview',
		),
		targets: mobile('apps/mobile/src/lib/mobile-qr.ts', 'nativeRahRowQr', {
			permissionOrEntitlement: 'CAMERA / NSCameraUsageDescription',
			cancellation: 'user-cancellable',
		}),
	}),
	'qr.decode': action('qr.decode', {
		owningContract: 'QrDecoder.decode',
		consumer: consumer('packages/features/src/import/useImport.ts', 'qrDecoder'),
		targets: mobile('apps/mobile/src/lib/mobile-qr.ts', 'CapacitorQrDecoder', {
			cancellation: 'user-cancellable',
		}),
		secretHandling: publicText,
	}),
	'qr.encode': action('qr.encode', {
		owningContract: 'QrEncoder.encode',
		consumer: missingConsumer('QR encoding'),
		targets: desktopAndMobile('DesktopQrEncoder', 'MobileQrEncoder'),
		secretHandling: publicText,
	}),
	'share.system': action('share.system', {
		owningContract: 'Share.share',
		consumer: consumer('packages/features/src/share/ShareDrawer.tsx', 'share'),
		targets: desktopWebview('WebviewShare'),
		secretHandling: publicText,
	}),
	'file.save': action('file.save', {
		owningContract: 'FileSave.save',
		consumer: consumer('packages/features/src/share/ShareDrawer.tsx', 'fileSave'),
		targets: desktopWebview('WebviewFileSave'),
		secretHandling: publicText,
	}),
	'file.download': action('file.download', {
		owningContract: 'FileSave.save',
		consumer: consumer('packages/features/src/share/ShareDrawer.tsx', 'download'),
		targets: desktopWebview('WebviewFileSave'),
		secretHandling: publicText,
	}),
	'file.pick': action('file.pick', {
		owningContract: 'FilePicker.pick',
		consumer: missingConsumer('Native file picking'),
	}),
	'link.external.open': action('link.external.open', {
		owningContract: 'ExternalLink.open',
		consumer: missingConsumer('External-link opening'),
	}),
	'link.email.open': action('link.email.open', {
		owningContract: 'ExternalLink.openEmail',
		consumer: missingConsumer('Email-link opening'),
	}),
	'notification.show': action('notification.show', {
		owningContract: 'Notifications.notify',
		consumer: missingConsumer('Native notifications'),
		targets: desktopWebview('WebviewNotifications'),
		secretHandling: 'Notification text must never expose connection credentials.',
	}),
	'haptics.impact': action('haptics.impact', {
		owningContract: 'Haptics.impact',
		consumer: missingConsumer('Haptic feedback'),
	}),
	'autostart.manage': action('autostart.manage', {
		owningContract: 'Autostart',
		consumer: consumer(
			'packages/features/src/settings/Settings.tsx',
			'autostart',
		),
		targets: desktop('TauriDesktopAutostart'),
	}),
	'tray.manage': action('tray.manage', {
		owningContract: 'Tray',
		consumer: missingConsumer('Tray management'),
		targets: desktop('TauriDesktopTray'),
	}),
	'network.lan.address': action('network.lan.address', {
		owningContract: 'NetworkIdentity.snapshot',
		consumer: missingConsumer('LAN address display'),
		targets: {
			...desktop('TauriDesktopNetworkIdentity'),
			...mobile('apps/mobile/src/lib/mobile-vpn.ts', 'networkIdentity', {
				diagnostics: repository('apps/mobile/src/lib/mobile-vpn.ts', 'diagnostics'),
			}),
		},
	}),
	'network.lan.listener': action('network.lan.listener', {
		owningContract: 'LanListener',
		consumer: missingConsumer('LAN listener management'),
	}),
	'network.firewall.manage': action('network.firewall.manage', {
		owningContract: 'Firewall',
		consumer: missingConsumer('Firewall management'),
	}),
	'engine.runtime.process': action('engine.runtime.process', {
		owningContract: 'EngineProcessSpawner',
		consumer: consumer(
			'packages/engine/src/runtime/managed-engine-process.ts',
			'ManagedEngineProcess',
		),
		targets: engineTargets,
		secretHandling:
			'Pass configuration through private app storage and redact process output.',
	}),
	'vpn.tunnel': action('vpn.tunnel', {
		owningContract: 'VpnTunnelProvider',
		consumer: consumer(
			'packages/core/src/platform/vpn-tunnel-provider.ts',
			'VpnTunnelProvider',
		),
		targets: {
			...desktop('TauriDesktopVpn', 'idempotent-stop'),
			...mobile('apps/mobile/src/lib/mobile-vpn.ts', 'CapacitorMobileVpn', {
				cancellation: 'idempotent-stop',
				diagnostics: repository('apps/mobile/src/lib/mobile-vpn.ts', 'diagnostics'),
			}),
		},
	}),
	'proxy.system': action('proxy.system', {
		owningContract: 'SystemProxy',
		consumer: consumer('packages/features/src/home/useHome.ts', 'systemProxy'),
		targets: desktop('TauriDesktopSystemProxy', 'idempotent-stop'),
	}),
	'diagnostics.native': action('diagnostics.native', {
		owningContract: 'DiagnosticsPort.snapshot',
		consumer: consumer(
			'packages/features/src/diagnostics/useDiagnostics.ts',
			'diagnostics',
		),
		targets: {
			...desktop('TauriDesktopDiagnostics'),
			...mobile('apps/mobile/src/lib/mobile-vpn.ts', 'diagnostics', {
				diagnostics: repository('apps/mobile/src/lib/mobile-vpn.ts', 'diagnostics'),
			}),
		},
	}),
	'diagnostics.status': action('diagnostics.status', {
		owningContract: 'DiagnosticsPort.snapshot',
		consumer: consumer(
			'packages/features/src/diagnostics/Diagnostics.tsx',
			'Diagnostics',
		),
		targets: {
			...desktop('TauriDesktopDiagnostics'),
			...mobile('apps/mobile/src/lib/mobile-vpn.ts', 'diagnostics', {
				diagnostics: repository('apps/mobile/src/lib/mobile-vpn.ts', 'diagnostics'),
			}),
		},
	}),
} satisfies NativeActionInventory

export function deriveNativeActionStatus(
	actionId: NativeActionId,
	platform: NativePlatform,
	runtimeStatus: RuntimeNativeCapabilityStatus,
	inventory: NativeActionInventory = nativeActionInventory,
): DerivedNativeActionStatus {
	const evidence = inventory[actionId].platforms[platform]
	if (evidence.state !== 'available') {
		return {
			actionId,
			platform,
			supported: false,
			detail: evidence.unavailableReason,
		}
	}
	if (!runtimeStatus.supported) {
		return { actionId, platform, supported: false, detail: runtimeStatus.detail }
	}
	return { actionId, platform, supported: true }
}

export function getNativeActionAvailability(
	actionId: NativeActionId,
	platform: NativePlatform,
): { readonly available: boolean; readonly reason?: string } {
	const status = deriveNativeActionStatus(actionId, platform, {
		supported: true,
	})
	return status.supported
		? { available: true }
		: { available: false, reason: status.detail }
}

export function validateNativeActionInventory(
	inventory: NativeActionInventory,
	options: NativeActionInventoryValidationOptions,
): readonly string[] {
	const issues: string[] = []
	const validateEvidence = (
		label: string,
		evidence: NativeActionEvidence,
		required: boolean,
	) => {
		if (evidence.kind === 'missing') {
			if (required) issues.push(`${label} is missing: ${evidence.reason}`)
			return
		}
		const source = options.readRepositoryFile(evidence.path)
		if (source === undefined)
			issues.push(`${label} path does not exist: ${evidence.path}`)
		else if (!source.includes(evidence.seam))
			issues.push(
				`${label} seam does not exist: ${evidence.path}#${evidence.seam}`,
			)
	}

	for (const actionId of nativeActionIds) {
		const action = inventory[actionId]
		if (!action) {
			issues.push(`${actionId}: inventory entry is required`)
			continue
		}
		if (action.id !== actionId) issues.push(`${actionId}: id must match its key`)
		if (action.consumers.length === 0)
			issues.push(`${actionId}: at least one consumer is required`)
		if (action.errorTaxonomy.length === 0)
			issues.push(`${actionId}: error taxonomy is required`)
		const consumerRequired = nativePlatforms.some(
			(platform) => action.platforms[platform].state === 'available',
		)
		for (const evidence of action.consumers)
			validateEvidence(`${actionId}: consumer`, evidence, consumerRequired)

		for (const platform of nativePlatforms) {
			const evidence = action.platforms[platform]
			if (!evidence) {
				issues.push(`${actionId}/${platform}: platform evidence is required`)
				continue
			}
			const prefix = `${actionId}/${platform}`
			const required = evidence.state === 'available'
			validateEvidence(`${prefix}: adapter`, evidence.adapter, required)
			validateEvidence(`${prefix}: diagnostics`, evidence.diagnostics, required)
			validateEvidence(
				`${prefix}: installed-artifact test`,
				evidence.installedArtifactTest,
				required,
			)
			if (evidence.architectures.length === 0)
				issues.push(`${prefix}: architecture coverage is required`)
			if (evidence.builds.length === 0)
				issues.push(`${prefix}: build coverage is required`)
			if (evidence.state !== 'available' && !evidence.unavailableReason?.trim())
				issues.push(`${prefix}: unavailable reason is required`)
		}
	}
	return issues
}
