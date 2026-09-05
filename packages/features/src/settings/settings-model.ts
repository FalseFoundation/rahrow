export interface CapabilityAvailability {
	readonly supported: boolean
	readonly detail?: string
}

export type SettingsRegistryId =
	| 'connection-mode'
	| 'engine'
	| 'routing'
	| 'system-proxy'
	| 'lan-proxy-sharing'
	| 'autostart'
	| 'language'
	| 'appearance'
	| 'backup'
	| 'diagnostics'
	| 'privacy'
	| 'reset-settings'
	| 'about'
	| 'app-version'

export interface SettingsRegistryContext {
	readonly vpnSupported: boolean
	readonly systemProxySupported: boolean
	readonly lanProxySharingSupported?: boolean
	readonly autostartSupported: boolean
	readonly privacyOptionsSupported: boolean
	readonly connectionMode: 'vpn' | 'proxy'
	readonly selectableLocaleCount: number
}

export interface SettingsRegistryEntry {
	readonly id: SettingsRegistryId
	readonly section: 'connection' | 'app' | 'about'
	readonly titleKey: string
	readonly descriptionKey: string
	readonly icon: 'connection' | 'settings' | 'info'
	readonly route:
		| 'connection-mode'
		| 'engine'
		| 'routing'
		| 'proxy'
		| 'language'
		| 'appearance'
		| 'backup'
		| 'diagnostics'
		| 'reset'
		| 'about'
		| null
	readonly searchKeywords: readonly string[]
	readonly effect: 'none' | 'reconnect' | 'restart'
	readonly sensitivity: 'public' | 'local' | 'sensitive'
	readonly resetScope: 'tunnel' | 'settings' | 'app-data' | null
	readonly isAvailable: (context: SettingsRegistryContext) => boolean
}

const alwaysAvailable = () => true

export const SETTINGS_REGISTRY = [
	{
		id: 'connection-mode',
		section: 'connection',
		titleKey: 'settings.connection.mode',
		descriptionKey: 'settings.connection.vpnDescription',
		icon: 'connection',
		route: 'connection-mode',
		searchKeywords: ['VPN', 'TUN', 'system proxy', 'connection mode'],
		effect: 'reconnect',
		sensitivity: 'local',
		resetScope: 'tunnel',
		isAvailable: (context) =>
			context.vpnSupported || context.systemProxySupported,
	},
	{
		id: 'engine',
		section: 'connection',
		titleKey: 'settings.connection.engine',
		descriptionKey: 'settings.connection.engine',
		icon: 'connection',
		route: 'engine',
		searchKeywords: ['engine', 'Xray', 'sing-box'],
		effect: 'reconnect',
		sensitivity: 'local',
		resetScope: 'settings',
		isAvailable: alwaysAvailable,
	},
	{
		id: 'routing',
		section: 'connection',
		titleKey: 'settings.connection.routing',
		descriptionKey: 'settings.connection.routing',
		icon: 'connection',
		route: 'routing',
		searchKeywords: ['routing', 'traffic policy', 'rules', 'direct'],
		effect: 'reconnect',
		sensitivity: 'local',
		resetScope: 'tunnel',
		isAvailable: alwaysAvailable,
	},
	{
		id: 'system-proxy',
		section: 'connection',
		titleKey: 'settings.connection.proxy',
		descriptionKey: 'settings.connection.proxyDescription',
		icon: 'connection',
		route: 'proxy',
		searchKeywords: ['system proxy', 'SOCKS', 'local port'],
		effect: 'reconnect',
		sensitivity: 'local',
		resetScope: 'tunnel',
		isAvailable: (context) =>
			context.systemProxySupported && context.connectionMode === 'proxy',
	},
	{
		id: 'lan-proxy-sharing',
		section: 'connection',
		titleKey: 'settings.connection.lanSharing',
		descriptionKey: 'settings.connection.lanSharingDescription',
		icon: 'connection',
		route: null,
		searchKeywords: ['LAN proxy sharing', 'local network', 'SOCKS', 'HTTP'],
		effect: 'reconnect',
		sensitivity: 'sensitive',
		resetScope: 'tunnel',
		isAvailable: (context) => context.lanProxySharingSupported === true,
	},
	{
		id: 'autostart',
		section: 'app',
		titleKey: 'settings.app.autostart',
		descriptionKey: 'settings.app.autostartDescription',
		icon: 'settings',
		route: null,
		searchKeywords: ['launch', 'startup', 'autostart'],
		effect: 'none',
		sensitivity: 'local',
		resetScope: 'settings',
		isAvailable: (context) => context.autostartSupported,
	},
	{
		id: 'language',
		section: 'app',
		titleKey: 'settings.language.label',
		descriptionKey: 'settings.language.pickerLabel',
		icon: 'settings',
		route: 'language',
		searchKeywords: ['language', 'locale', 'English', 'فارسی'],
		effect: 'none',
		sensitivity: 'local',
		resetScope: 'settings',
		isAvailable: (context) => context.selectableLocaleCount >= 2,
	},
	{
		id: 'appearance',
		section: 'app',
		titleKey: 'settings.app.appearance',
		descriptionKey: 'settings.app.appearance',
		icon: 'settings',
		route: 'appearance',
		searchKeywords: ['appearance', 'theme', 'light', 'dark', 'system'],
		effect: 'none',
		sensitivity: 'local',
		resetScope: 'settings',
		isAvailable: alwaysAvailable,
	},
	{
		id: 'backup',
		section: 'app',
		titleKey: 'backup.title.menu',
		descriptionKey: 'backup.description.menu',
		icon: 'settings',
		route: 'backup',
		searchKeywords: ['backup', 'import', 'export'],
		effect: 'none',
		sensitivity: 'sensitive',
		resetScope: null,
		isAvailable: alwaysAvailable,
	},
	{
		id: 'diagnostics',
		section: 'app',
		titleKey: 'settings.app.diagnostics',
		descriptionKey: 'settings.app.diagnosticsDescription',
		icon: 'settings',
		route: 'diagnostics',
		searchKeywords: ['diagnostics', 'logs', 'troubleshooting'],
		effect: 'none',
		sensitivity: 'sensitive',
		resetScope: 'app-data',
		isAvailable: alwaysAvailable,
	},
	{
		id: 'privacy',
		section: 'app',
		titleKey: 'settings.app.privacy',
		descriptionKey: 'settings.app.privacyDescription',
		icon: 'settings',
		route: null,
		searchKeywords: ['privacy', 'advertising', 'consent'],
		effect: 'none',
		sensitivity: 'sensitive',
		resetScope: 'settings',
		isAvailable: (context) => context.privacyOptionsSupported,
	},
	{
		id: 'reset-settings',
		section: 'app',
		titleKey: 'settings.app.reset',
		descriptionKey: 'settings.app.resetDescription',
		icon: 'settings',
		route: 'reset',
		searchKeywords: ['reset', 'restore defaults'],
		effect: 'none',
		sensitivity: 'sensitive',
		resetScope: 'settings',
		isAvailable: alwaysAvailable,
	},
	{
		id: 'about',
		section: 'about',
		titleKey: 'settings.about.title',
		descriptionKey: 'settings.about.description',
		icon: 'info',
		route: 'about',
		searchKeywords: ['about', 'license', 'source', 'support'],
		effect: 'none',
		sensitivity: 'public',
		resetScope: null,
		isAvailable: alwaysAvailable,
	},
	{
		id: 'app-version',
		section: 'about',
		titleKey: 'settings.about.appVersion',
		descriptionKey: 'settings.about.appVersion',
		icon: 'info',
		route: null,
		searchKeywords: ['version', 'build'],
		effect: 'none',
		sensitivity: 'public',
		resetScope: null,
		isAvailable: alwaysAvailable,
	},
] as const satisfies readonly SettingsRegistryEntry[]

export function availableSettings(
	context: SettingsRegistryContext,
): readonly SettingsRegistryEntry[] {
	return SETTINGS_REGISTRY.filter((setting) => setting.isAvailable(context))
}

export function persistableBoolean(
	requested: boolean,
	availability: CapabilityAvailability | undefined,
): boolean {
	return requested && availability?.supported === true
}

export function toggleDisabled(
	availability: CapabilityAvailability | undefined,
): boolean {
	return availability?.supported !== true
}

export function settingsQueryMatches(
	query: string,
	terms: readonly string[],
): boolean {
	const normalized = query.trim().toLowerCase()
	return (
		normalized.length === 0 ||
		terms.some((term) => term.toLowerCase().includes(normalized))
	)
}
