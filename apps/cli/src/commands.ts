import { homedir } from 'node:os'
import { join } from 'node:path'

import {
	applyRahrowBackupImport,
	BACKUP_FILE_NAME,
	BACKUP_SETTING_KEYS,
	createRahrowBackup,
	openRahrowBackup,
	planRahrowBackupImport,
} from '@rahrow/core/backup/backup-envelope.ts'
import {
	ConnectionController,
	SystemClock,
} from '@rahrow/core/connection/connection-controller.ts'
import { SmartConnectOrchestrator } from '@rahrow/core/connection/smart-connect.ts'
import type { Logger } from '@rahrow/core/logging/logger.ts'
import { createPinoLogger } from '@rahrow/core/logging/pino-logger.ts'
import { silentLogger } from '@rahrow/core/logging/silent-logger.ts'
import { createRahrowAboutManifest } from '@rahrow/core/product/about.ts'
import {
	isProfileProtectedByLock,
	protectedSubscriptionIds,
} from '@rahrow/core/profile/connection-lock-policy.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { replaceSubscriptionProfiles } from '@rahrow/core/profile/profile-workflow.ts'
import { ProtocolRegistry } from '@rahrow/core/protocol/connection-protocol.ts'
import type { EngineHealth } from '@rahrow/core/runtime/proxy-engine.ts'
import {
	JsonProfileStore,
	JsonSettingsStore,
	MemoryDocumentStore,
	type ProfileStore,
	type Settings,
	type SettingsStore,
	type StringDocumentStore,
} from '@rahrow/core/storage/json-store.ts'
import { createHttpSubscriptionFetcher } from '@rahrow/core/subscription/http-subscription-fetcher.ts'
import {
	type ImportIssue,
	isHttpSubscriptionUrl,
	parseImportedProfilesWithReport,
	refreshSubscription,
	type SubscriptionFetcher,
} from '@rahrow/core/subscription/subscription-import.ts'
import {
	createEngineRegistry,
	type EngineRegistry,
} from '@rahrow/engine/registry/engine-registry.ts'
import { SelectedEngine } from '@rahrow/engine/registry/selected-engine.ts'
import { createSingBoxEngine } from '@rahrow/engine/runtime/create-sing-box-engine.ts'
import { createXrayEngine } from '@rahrow/engine/runtime/create-xray-engine.ts'
import {
	NoopSingBoxLatencyProbe,
	NoopSingBoxProcess,
} from '@rahrow/engine/sing-box/sing-box-engine.ts'
import {
	NoopXrayLatencyProbe,
	NoopXrayProcess,
} from '@rahrow/engine/xray/xray-engine.ts'

import { FileDocumentStore } from './storage.ts'

export interface CliIo {
	stdout(value: string): void
	stderr(value: string): void
}

export interface CliRuntime {
	readFile(path: string): Promise<string>
	readStdin(): Promise<string>
	writeFile(path: string, value: string): Promise<void>
	readEnvironment(name: string): string | undefined
}

export interface CliContext {
	readonly io: CliIo
	readonly runtime: CliRuntime
	readonly profileStore: ProfileStore
	readonly settingsStore: SettingsStore
	readonly subscriptionDocument: StringDocumentStore
	readonly connectionController: ConnectionController
	readonly protocolRegistry: ProtocolRegistry
	readonly engineRegistry: ReturnType<typeof createEngineRegistry>
	readonly subscriptionFetcher: SubscriptionFetcher
	readonly logger: Logger
}

export interface CliCommand {
	readonly name: string
	readonly summary: string
	run(args: readonly string[], context: CliContext): Promise<number>
}

export interface CliContextOptions {
	readonly runtime?: CliRuntime
	readonly profileStore?: ProfileStore
	readonly settingsStore?: SettingsStore
	readonly subscriptionDocument?: StringDocumentStore
	readonly engineRegistry?: EngineRegistry
	readonly subscriptionFetcher?: SubscriptionFetcher
	readonly resolveSubscriptionCredential?: (
		credentialId: string,
	) => Promise<string | undefined>
	readonly logger?: Logger
}

export function createCliContext(
	io: CliIo,
	options: CliContextOptions = {},
): CliContext {
	const cliHome = process.env.RAHROW_CLI_HOME ?? join(homedir(), '.rahrow')
	const logger = options.logger ?? createPinoLogger({ name: 'rahrow-cli' })
	const settingsStore =
		options.settingsStore ??
		new JsonSettingsStore(new FileDocumentStore(join(cliHome, 'settings.json')))
	const engineRegistry =
		options.engineRegistry ??
		createEngineRegistry([
			createXrayEngine({ logger }),
			createSingBoxEngine({ logger }),
		])
	const engine = new SelectedEngine(engineRegistry, async () => {
		const settings = await settingsStore.read()
		return settings.engineId ?? 'sing-box'
	})

	return {
		io,
		runtime: options.runtime ?? nodeRuntime,
		profileStore:
			options.profileStore ??
			new JsonProfileStore(new FileDocumentStore(join(cliHome, 'profiles.json'))),
		settingsStore,
		subscriptionDocument:
			options.subscriptionDocument ??
			new FileDocumentStore(join(cliHome, 'subscriptions.json')),
		connectionController: new ConnectionController(engine, new SystemClock(), {
			logger,
		}),
		protocolRegistry: new ProtocolRegistry(),
		engineRegistry,
		subscriptionFetcher:
			options.subscriptionFetcher ??
			createHttpSubscriptionFetcher({
				resolveCredential: options.resolveSubscriptionCredential,
			}),
		logger,
	}
}

export function createCliCommands(): readonly CliCommand[] {
	return [
		{
			name: 'about',
			summary: 'Print version, support, source, and license metadata.',
			run: runAbout,
		},
		{
			name: 'profiles',
			summary: 'Manage local connection profiles.',
			run: runProfiles,
		},
		{
			name: 'import',
			summary: 'Import a profile from text, file, or stdin.',
			run: runImport,
		},
		{
			name: 'export',
			summary: 'Export a stored profile.',
			run: runExport,
		},
		{
			name: 'backup',
			summary: 'Import or export a versioned RahRow backup.',
			run: runBackup,
		},
		{
			name: 'connect',
			summary: 'Start a connection through the shared core.',
			run: runConnect,
		},
		{
			name: 'disconnect',
			summary: 'Stop the active connection.',
			run: runDisconnect,
		},
		{
			name: 'restart',
			summary: 'Restart the selected connection.',
			run: runRestart,
		},
		{
			name: 'status',
			summary: 'Print connection and engine status.',
			run: runStatus,
		},
		{
			name: 'smart-connect',
			summary: 'Run or control Smart Connect scheduling.',
			run: runSmartConnect,
		},
		{
			name: 'test',
			summary: 'Run a speed test for a profile.',
			run: runTest,
		},
		{
			name: 'subscription',
			summary: 'Manage subscription sources.',
			run: runSubscription,
		},
	]
}

async function runSmartConnect(
	args: readonly string[],
	context: CliContext,
): Promise<number> {
	const [subcommand = 'status'] = args
	const smartConnect = new SmartConnectOrchestrator({
		profileStore: context.profileStore,
		settingsStore: context.settingsStore,
		connection: context.connectionController,
		probe: (profile) => context.connectionController.test(profile),
	})

	if (subcommand === 'status') {
		context.io.stdout(
			formatJson({
				...(await smartConnect.status()),
				scheduling: 'host-required',
			}),
		)
		return 0
	}
	if (subcommand === 'stop') {
		context.io.stdout(formatJson(await smartConnect.stop()))
		return 0
	}
	if (subcommand !== 'run' && subcommand !== 'start') {
		return error(context, 'usage: rahrow smart-connect <run|start|stop|status>')
	}

	const settings = await context.settingsStore.read()
	if (settings.connectionMode !== 'proxy') {
		throw new Error(
			'CLI Smart Connect requires the explicit proxy connection mode; run rahrow connect --mode proxy first.',
		)
	}
	if (subcommand === 'start') {
		context.io.stdout(
			formatJson({
				...(await smartConnect.start()),
				scheduling: 'host-required',
			}),
		)
		return 0
	}

	context.io.stdout(formatJson(await smartConnect.run()))
	return 0
}

async function runAbout(
	_args: readonly string[],
	context: CliContext,
): Promise<number> {
	const manifest = createRahrowAboutManifest()
	const target = (id: (typeof manifest.links)[number]['id']) =>
		manifest.links.find((link) => link.id === id)?.target

	context.io.stdout(
		formatJson({
			product: manifest.product,
			owner: manifest.owner,
			version: process.env.RAHROW_VERSION?.trim() || 'not-provided',
			license: manifest.license.spdx,
			source: target('source'),
			productSite: target('product-site'),
			organization: target('organization'),
			organizationSite: target('organization-site'),
			supportEmail: manifest.supportEmail,
		}),
	)

	return 0
}

async function runBackup(
	args: readonly string[],
	context: CliContext,
): Promise<number> {
	const [subcommand, ...options] = args
	if (subcommand === 'export') return runBackupExport(options, context)
	if (subcommand === 'import') return runBackupImport(options, context)
	return error(context, 'usage: rahrow backup <export|import> [options]')
}

async function runBackupExport(
	args: readonly string[],
	context: CliContext,
): Promise<number> {
	const output = requiredOption(args, '--output')
	const scope = optionValue(args, '--scope') ?? 'all'
	if (!['all', 'connections', 'settings'].includes(scope)) {
		throw new Error('--scope must be all, connections, or settings')
	}
	const selectedIds = optionValues(args, '--connection')
	if (scope === 'settings' && selectedIds.length > 0) {
		throw new Error('--connection cannot be used with --scope settings')
	}
	const plaintext = args.includes('--plaintext')
	if (plaintext && !args.includes('--acknowledge-sensitive')) {
		throw new Error(
			'plaintext backups contain sensitive data; pass --acknowledge-sensitive to continue',
		)
	}
	const password = plaintext ? undefined : passwordFromEnvironment(args, context)
	const [connections, settings] = await Promise.all([
		context.profileStore.list(),
		context.settingsStore.read(),
	])
	const connectionIds =
		scope === 'settings'
			? undefined
			: selectedIds.length > 0
				? selectedIds
				: connections.map(({ id }) => id)
	const settingKeys = scope === 'connections' ? undefined : BACKUP_SETTING_KEYS
	const backup = await createRahrowBackup({
		connections,
		settings,
		selection: { connectionIds, settingKeys },
		...(password === undefined ? {} : { password }),
	})
	await context.runtime.writeFile(
		output,
		`${JSON.stringify(backup.document, null, 2)}\n`,
	)
	context.io.stdout(
		formatJson({
			exported: BACKUP_FILE_NAME,
			output,
			protection: plaintext ? 'plaintext' : 'password',
			connections: connectionIds?.length ?? 0,
			settings: settingKeys?.length ?? 0,
		}),
	)
	return 0
}

async function runBackupImport(
	args: readonly string[],
	context: CliContext,
): Promise<number> {
	const path = optionValue(args, '--file')
	const useStdin = args.includes('--stdin')
	if ((path ? 1 : 0) + (useStdin ? 1 : 0) !== 1) {
		throw new Error('provide exactly one of --file <path> or --stdin')
	}
	const document = path
		? await context.runtime.readFile(path)
		: await context.runtime.readStdin()
	const plaintext = isPlaintextBackup(document)
	if (plaintext && !args.includes('--acknowledge-sensitive')) {
		throw new Error(
			'plaintext backups contain sensitive data; pass --acknowledge-sensitive to inspect or apply',
		)
	}
	const password = plaintext ? undefined : passwordFromEnvironment(args, context)
	const policyValue = optionValue(args, '--policy')
	if (
		policyValue !== undefined &&
		!['replace', 'keep-existing'].includes(policyValue)
	) {
		throw new Error('--policy must be replace or keep-existing')
	}
	const policy = policyValue as 'replace' | 'keep-existing' | undefined
	if (args.includes('--apply') && !policy) {
		throw new Error('--apply requires an explicit --policy replace|keep-existing')
	}
	const [payload, currentConnections, currentSettings, subscriptions] =
		await Promise.all([
			openRahrowBackup(document, password),
			context.profileStore.list(),
			context.settingsStore.read(),
			readSubscriptions(context),
		])
	const plan = await planRahrowBackupImport({
		document,
		password,
		currentConnections,
		currentSettings,
		connectionConflict: policy ?? 'reject',
		settingConflict: policy ?? 'reject',
	})
	const lockedSubscriptionIds = protectedSubscriptionIds(subscriptions)
	const currentById = new Map(
		currentConnections.map((profile) => [profile.id, profile]),
	)
	const lockedSkips = (payload.connections ?? []).filter((incoming) => {
		const current = currentById.get(incoming.id)
		return (
			isProfileProtectedByLock(incoming, lockedSubscriptionIds) ||
			(current !== undefined &&
				isProfileProtectedByLock(current, lockedSubscriptionIds))
		)
	}).length
	const summary = {
		createdAt: payload.createdAt,
		connections: payload.connections?.length ?? 0,
		settings: Object.keys(payload.settings ?? {}).length,
		conflicts: plan.conflicts.map(({ area, key, kind }) => ({ area, key, kind })),
		lockedSkips,
		canApply: plan.canApply,
	}
	if (!args.includes('--apply')) {
		context.io.stdout(formatJson({ preview: summary }))
		return 0
	}
	await applyRahrowBackupImport(plan, {
		profileStore: context.profileStore,
		settingsStore: context.settingsStore,
		subscriptionStore: { list: async () => subscriptions },
	})
	context.io.stdout(formatJson({ imported: summary, policy }))
	return 0
}

async function runConnect(
	args: readonly string[],
	context: CliContext,
): Promise<number> {
	const profile = await profileFromArgsOrSettings(args, context)
	const settings = await context.settingsStore.read()
	const requestedMode = optionValue(args, '--mode') ?? settings.connectionMode
	if (requestedMode !== 'proxy') {
		throw new Error(
			'CLI cannot register an OS VPN/TUN connection. Use --mode proxy for the explicit local-proxy fallback.',
		)
	}
	context.logger.info(
		{
			action: 'connection-mode.select',
			connectionMode: 'proxy',
			outcome: 'selected',
		},
		'Connection mode selected: proxy',
	)
	const connection = await context.connectionController.connect({
		profile,
		localPort: settings.localPort,
	})

	await context.settingsStore.write({
		...settings,
		activeProfileId: profile.id,
		connectionMode: 'proxy',
	})
	context.io.stdout(formatJson(connection))

	return 0
}

async function runDisconnect(
	_args: readonly string[],
	context: CliContext,
): Promise<number> {
	const settings = await context.settingsStore.read()
	const connection = await context.connectionController.disconnect()

	await context.settingsStore.write(clearActiveProfile(settings))
	context.io.stdout(formatJson({ state: connection?.state ?? 'disconnected' }))

	return 0
}

async function runRestart(
	args: readonly string[],
	context: CliContext,
): Promise<number> {
	const profile = await profileFromArgsOrSettings(args, context)
	const settings = await context.settingsStore.read()
	const requestedMode = optionValue(args, '--mode') ?? settings.connectionMode
	if (requestedMode !== 'proxy') {
		throw new Error(
			'CLI cannot register an OS VPN/TUN connection. Use --mode proxy for the explicit local-proxy fallback.',
		)
	}
	const connection = await context.connectionController.reconfigure({
		profile,
		localPort: settings.localPort,
	})
	await context.settingsStore.write({
		...settings,
		activeProfileId: profile.id,
		connectionMode: 'proxy',
	})
	context.io.stdout(formatJson(connection))

	return 0
}

async function runStatus(
	_args: readonly string[],
	context: CliContext,
): Promise<number> {
	const settings = await context.settingsStore.read()
	const engine = context.engineRegistry.get(settings.engineId ?? 'sing-box')
	const health = await engine.status()

	context.io.stdout(
		formatJson({
			activeProfileId: settings.activeProfileId,
			connectionState:
				context.connectionController.current?.state ?? 'disconnected',
			engine: engineStatusSummary(health),
		}),
	)

	return 0
}

async function runTest(
	args: readonly string[],
	context: CliContext,
): Promise<number> {
	const profile = await profileFromArgsOrSettings(args, context)
	const result = await context.connectionController.test(profile)

	context.io.stdout(formatJson(result))

	if (result.error) {
		context.io.stderr(`rahrow test: ${result.error}`)

		return 2
	}

	return result.reachable ? 0 : 1
}

async function runProfiles(
	args: readonly string[],
	context: CliContext,
): Promise<number> {
	const [subcommand = 'list', id] = args

	if (subcommand === 'list') {
		const profiles = await context.profileStore.list()
		const lockedIds = protectedSubscriptionIds(await readSubscriptions(context))
		context.io.stdout(
			formatJson(profiles.map((profile) => profileSummary(profile, lockedIds))),
		)

		return 0
	}

	if (subcommand === 'show') {
		if (!id) {
			return error(context, 'rahrow profiles show: missing profile id')
		}
		const profile = await context.profileStore.get(id)
		if (!profile) {
			return error(context, `rahrow profiles show: profile not found: ${id}`)
		}
		const lockedIds = protectedSubscriptionIds(await readSubscriptions(context))
		context.io.stdout(formatJson(profileSummary(profile, lockedIds)))
		return 0
	}

	if (subcommand === 'cleanup') {
		return runProfilesCleanup(args.slice(1), context)
	}

	if (subcommand === 'remove') {
		if (!id) {
			return error(context, 'rahrow profiles remove: missing profile id')
		}

		const profile = await context.profileStore.get(id)
		if (profile) {
			const lockedIds = protectedSubscriptionIds(await readSubscriptions(context))
			if (isProfileProtectedByLock(profile, lockedIds)) {
				return error(
					context,
					`rahrow profiles remove: profile is protected by locked subscription ${profile.metadata?.subscriptionId}`,
				)
			}
		}

		await context.profileStore.remove(id)
		context.io.stdout(formatJson({ removed: id }))

		return 0
	}

	return error(context, `rahrow profiles: unknown subcommand "${subcommand}"`)
}

async function runProfilesCleanup(
	args: readonly string[],
	context: CliContext,
): Promise<number> {
	const subscriptionId = optionValue(args, '--subscription')
	const group = optionValue(args, '--group')
	if (
		(subscriptionId ? 1 : 0) + (group ? 1 : 0) !== 1 ||
		(group && group !== 'local')
	) {
		return error(
			context,
			'rahrow profiles cleanup: choose exactly one of --subscription <id> or --group local',
		)
	}
	const commit = args.includes('--commit')
	const [profileSnapshot, subscriptionSnapshot, settingsSnapshot] =
		await Promise.all([
			context.profileStore.list(),
			readSubscriptions(context),
			context.settingsStore.read(),
		])
	const scopedProfiles = profileSnapshot.filter((profile) =>
		subscriptionId
			? profile.metadata?.subscriptionId === subscriptionId
			: profile.metadata?.subscriptionId === undefined,
	)
	const scopedSubscription = subscriptionId
		? subscriptionSnapshot.find(({ id }) => id === subscriptionId)
		: undefined
	if (subscriptionId && !scopedSubscription) {
		return error(
			context,
			`rahrow profiles cleanup: subscription not found: ${subscriptionId}`,
		)
	}
	const failedProfileIds = new Set<string>()
	for (const profile of scopedProfiles) {
		const result = await context.connectionController.test(profile)
		if (!result.reachable || result.error) failedProfileIds.add(profile.id)
	}
	let subscriptionFailed = false
	if (scopedSubscription) {
		try {
			await context.subscriptionFetcher.fetch(scopedSubscription)
		} catch {
			subscriptionFailed = true
		}
	}

	const [currentProfiles, currentSubscriptions] = await Promise.all([
		context.profileStore.list(),
		readSubscriptions(context),
	])
	const withoutLocks = (subscriptions: readonly CliSubscription[]) =>
		subscriptions.map(({ locked: _locked, ...subscription }) => subscription)
	if (
		JSON.stringify(currentProfiles) !== JSON.stringify(profileSnapshot) ||
		JSON.stringify(withoutLocks(currentSubscriptions)) !==
			JSON.stringify(withoutLocks(subscriptionSnapshot))
	) {
		return error(
			context,
			'rahrow profiles cleanup: connections changed after the cleanup scan',
		)
	}
	const lockedIds = protectedSubscriptionIds(currentSubscriptions)
	const removableProfileIds = new Set(
		currentProfiles
			.filter(
				(profile) =>
					failedProfileIds.has(profile.id) &&
					!isProfileProtectedByLock(profile, lockedIds),
			)
			.map(({ id }) => id),
	)
	const skippedLockedProfileCount = currentProfiles.filter(
		(profile) =>
			failedProfileIds.has(profile.id) &&
			isProfileProtectedByLock(profile, lockedIds),
	).length
	const removeSubscription = Boolean(
		scopedSubscription &&
			subscriptionFailed &&
			!lockedIds.has(scopedSubscription.id),
	)
	const skippedLockedSubscriptionCount =
		scopedSubscription &&
		subscriptionFailed &&
		lockedIds.has(scopedSubscription.id)
			? 1
			: 0
	const checked = scopedProfiles.length + (scopedSubscription ? 1 : 0)
	const failed = failedProfileIds.size + (subscriptionFailed ? 1 : 0)
	const skippedLocked =
		skippedLockedProfileCount + skippedLockedSubscriptionCount
	const removable = removableProfileIds.size + (removeSubscription ? 1 : 0)

	if (commit && removable > 0) {
		if (!context.profileStore.replaceAll) {
			return error(
				context,
				'rahrow profiles cleanup: profile store does not support atomic replacement',
			)
		}
		const keptProfiles = currentProfiles.filter(
			({ id }) => !removableProfileIds.has(id),
		)
		const keptSubscriptions = removeSubscription
			? currentSubscriptions.filter(({ id }) => id !== scopedSubscription?.id)
			: currentSubscriptions
		try {
			await context.profileStore.replaceAll(keptProfiles)
			await writeSubscriptions(context, keptSubscriptions)
			if (
				settingsSnapshot.activeProfileId &&
				removableProfileIds.has(settingsSnapshot.activeProfileId)
			) {
				await context.settingsStore.write({
					...settingsSnapshot,
					activeProfileId: undefined,
				})
			}
		} catch (caught) {
			await Promise.allSettled([
				context.profileStore.replaceAll(profileSnapshot),
				writeSubscriptions(context, subscriptionSnapshot),
				context.settingsStore.write(settingsSnapshot),
			])
			throw caught
		}
	}

	context.io.stdout(
		formatJson({
			scope: subscriptionId ? `subscription:${subscriptionId}` : 'group:local',
			dryRun: !commit,
			checked,
			passed: checked - failed,
			failed,
			removable,
			skippedLocked,
			removed: commit ? removable : 0,
		}),
	)
	return 0
}

async function runImport(
	args: readonly string[],
	context: CliContext,
): Promise<number> {
	const input = await readUntrustedInput(args, context)
	const value = isHttpSubscriptionUrl(input.value)
		? await context.subscriptionFetcher.fetch({
				id: 'import-url',
				url: input.value.trim(),
			})
		: input.value
	const result = parseImportedProfilesWithReport(
		{
			value,
			source: isHttpSubscriptionUrl(input.value) ? 'subscription' : input.source,
		},
		context.protocolRegistry,
	)
	const profiles = result.profiles

	if (profiles.length === 0) {
		context.logger.warn(
			{
				action: 'profile.import',
				outcome: 'empty',
				source: input.source,
				skippedCount: result.issues.length,
			},
			`Profile import from ${input.source} found no supported profiles`,
		)
		writeImportIssues(context, result.issues, 'rahrow import')

		return error(context, 'rahrow import: no supported profiles found')
	}

	for (const profile of profiles) {
		await context.profileStore.save(profile)
	}
	context.logger.info(
		{
			action: 'profile.import',
			outcome: 'success',
			source: input.source,
			profileCount: profiles.length,
			skippedCount: result.issues.length,
		},
		`Imported ${profiles.length} profile${profiles.length === 1 ? '' : 's'} from ${input.source}`,
	)

	context.io.stdout(
		formatJson({
			imported: profiles.map((profile) => profile.id),
			skipped: result.issues,
		}),
	)
	writeImportIssues(context, result.issues, 'rahrow import')

	return 0
}

async function runExport(
	args: readonly string[],
	context: CliContext,
): Promise<number> {
	const [id] = args

	if (!id) {
		context.logger.warn(
			{ action: 'profile.export', outcome: 'failure', reason: 'missing-id' },
			'Profile export failed: missing profile id',
		)
		return error(context, 'rahrow export: missing profile id')
	}

	const profile = await context.profileStore.get(id)

	if (!profile) {
		context.logger.warn(
			{ action: 'profile.export', outcome: 'failure', reason: 'not-found' },
			'Profile export failed: profile not found',
		)
		return error(context, `rahrow export: profile not found: ${id}`)
	}

	context.io.stdout(context.protocolRegistry.serialize(profile))
	context.logger.info(
		{
			action: 'profile.export',
			outcome: 'success',
			protocol: profile.protocol,
			transport: 'stdout',
		},
		'Exported profile to stdout',
	)

	return 0
}

async function runSubscription(
	args: readonly string[],
	context: CliContext,
): Promise<number> {
	const [subcommand = 'list', first, second, ...rest] = args

	if (subcommand === 'list') {
		context.io.stdout(
			formatJson((await readSubscriptions(context)).map(subscriptionSummary)),
		)

		return 0
	}

	if (subcommand === 'show') {
		if (!first) {
			return error(context, 'rahrow subscription show: missing subscription id')
		}
		const subscription = (await readSubscriptions(context)).find(
			(candidate) => candidate.id === first,
		)
		if (!subscription) {
			return error(
				context,
				`rahrow subscription show: subscription not found: ${first}`,
			)
		}
		context.io.stdout(formatJson(subscriptionSummary(subscription)))
		return 0
	}

	if (subcommand === 'add') {
		if (!first || !second) {
			return error(context, 'rahrow subscription add: expected <id> <url>')
		}

		const name = optionValue(rest, '--name')
		const subscriptions = await readSubscriptions(context)
		const next = [
			...subscriptions.filter((subscription) => subscription.id !== first),
			{
				id: first,
				url: second,
				...(name ? { name } : {}),
			},
		].sort(compareSubscription)

		await writeSubscriptions(context, next)
		context.io.stdout(formatJson({ added: first }))

		return 0
	}

	if (subcommand === 'remove') {
		if (!first) {
			return error(context, 'rahrow subscription remove: missing subscription id')
		}

		const subscriptions = await readSubscriptions(context)
		const subscription = subscriptions.find((candidate) => candidate.id === first)
		if (subscription?.locked) {
			return error(
				context,
				`rahrow subscription remove: subscription is locked: ${first}`,
			)
		}
		const profilesBeforeRemoval = await context.profileStore.list()
		await replaceSubscriptionProfiles(context.profileStore, first, [])
		try {
			await writeSubscriptions(
				context,
				subscriptions.filter((candidate) => candidate.id !== first),
			)
		} catch (caught) {
			await context.profileStore.replaceAll?.(profilesBeforeRemoval)
			throw caught
		}
		context.io.stdout(formatJson({ removed: first }))

		return 0
	}

	if (subcommand === 'parse') {
		const input = await readUntrustedInput(args.slice(1), context)
		const result = parseImportedProfilesWithReport(
			{
				value: input.value,
				source: 'subscription',
			},
			context.protocolRegistry,
		)
		const profiles = result.profiles

		if (profiles.length === 0) {
			writeImportIssues(context, result.issues, 'rahrow subscription parse')

			return error(
				context,
				'rahrow subscription parse: no supported profiles found',
			)
		}

		for (const profile of profiles) {
			await context.profileStore.save(profile)
		}

		context.io.stdout(
			formatJson({
				imported: profiles.map((profile) => profile.id),
				skipped: result.issues,
			}),
		)
		writeImportIssues(context, result.issues, 'rahrow subscription parse')

		return 0
	}

	if (subcommand === 'lock' || subcommand === 'unlock') {
		if (!first) {
			return error(
				context,
				`rahrow subscription ${subcommand}: missing subscription id`,
			)
		}
		const subscriptions = await readSubscriptions(context)
		if (!subscriptions.some((candidate) => candidate.id === first)) {
			return error(
				context,
				`rahrow subscription ${subcommand}: subscription not found: ${first}`,
			)
		}
		await writeSubscriptions(
			context,
			subscriptions.map((candidate) =>
				candidate.id === first
					? { ...candidate, locked: subcommand === 'lock' }
					: candidate,
			),
		)
		context.io.stdout(
			formatJson({ [subcommand === 'lock' ? 'locked' : 'unlocked']: first }),
		)

		return 0
	}

	if (subcommand === 'refresh') {
		if (!first) {
			return error(context, 'rahrow subscription refresh: missing subscription id')
		}

		const subscriptions = await readSubscriptions(context)
		const subscription = subscriptions.find((candidate) => candidate.id === first)

		if (!subscription) {
			return error(
				context,
				`rahrow subscription refresh: subscription not found: ${first}`,
			)
		}
		if (subscription.locked) {
			return error(
				context,
				`rahrow subscription refresh: subscription is locked: ${first}`,
			)
		}

		let result: Awaited<ReturnType<typeof refreshSubscription>>

		try {
			result = await refreshSubscription(
				{
					id: subscription.id,
					url: subscription.url,
					...(subscription.name ? { name: subscription.name } : {}),
				},
				context.subscriptionFetcher,
				undefined,
				context.protocolRegistry,
			)
		} catch (caught) {
			const message =
				caught instanceof Error ? caught.message : 'subscription refresh failed'

			return error(context, `rahrow subscription refresh: ${message}`)
		}

		const profiles = result.profiles

		if (profiles.length === 0) {
			writeImportIssues(context, result.issues, 'rahrow subscription refresh')

			return error(
				context,
				'rahrow subscription refresh: no supported profiles found',
			)
		}

		const currentSubscriptions = await readSubscriptions(context)
		const currentSubscription = currentSubscriptions.find(
			(candidate) => candidate.id === first,
		)
		if (
			!currentSubscription ||
			currentSubscription.locked ||
			currentSubscription.url !== subscription.url ||
			currentSubscription.name !== subscription.name
		) {
			return error(
				context,
				`rahrow subscription refresh: subscription changed or is locked: ${first}`,
			)
		}
		const profilesBeforeRefresh = await context.profileStore.list()
		await replaceSubscriptionProfiles(context.profileStore, first, profiles)
		try {
			await writeSubscriptions(
				context,
				currentSubscriptions.map((candidate) =>
					candidate.id === first
						? {
								...candidate,
								...(result.subscription.updatedAt
									? { updatedAt: result.subscription.updatedAt }
									: {}),
							}
						: candidate,
				),
			)
		} catch (caught) {
			await context.profileStore.replaceAll?.(profilesBeforeRefresh)
			throw caught
		}

		context.io.stdout(
			formatJson({
				refreshed: first,
				imported: profiles.map((profile) => profile.id),
				skipped: result.issues,
			}),
		)
		writeImportIssues(context, result.issues, 'rahrow subscription refresh')

		return 0
	}

	return error(
		context,
		`rahrow subscription: unknown subcommand "${subcommand}"`,
	)
}

async function profileFromArgsOrSettings(
	args: readonly string[],
	context: CliContext,
): Promise<ConnectionProfile> {
	const profileId = positionalArgs(args, ['--mode'])[0]
	const settings = await context.settingsStore.read()
	const id = profileId ?? settings.activeProfileId

	if (!id) {
		throw new Error('missing profile id')
	}

	const profile = await context.profileStore.get(id)

	if (!profile) {
		throw new Error(`profile not found: ${id}`)
	}

	return profile
}

interface CliSubscription {
	readonly id: string
	readonly url: string
	readonly name?: string
	readonly locked?: boolean
	readonly updatedAt?: string
}

async function readSubscriptions(
	context: CliContext,
): Promise<readonly CliSubscription[]> {
	const raw = await context.subscriptionDocument.read()

	if (!raw) {
		return []
	}

	const parsed = JSON.parse(raw) as { subscriptions?: unknown }
	const subscriptions = Array.isArray(parsed.subscriptions)
		? parsed.subscriptions
		: []

	return subscriptions.filter(isSubscription).sort(compareSubscription)
}

async function writeSubscriptions(
	context: CliContext,
	subscriptions: readonly CliSubscription[],
) {
	await context.subscriptionDocument.write(
		formatJson({ version: 1, subscriptions }),
	)
}

async function readUntrustedInput(
	args: readonly string[],
	context: CliContext,
) {
	const [first, second] = args

	if (first === '--stdin') {
		return {
			value: await context.runtime.readStdin(),
			source: 'manual' as const,
		}
	}

	if (first === '--file') {
		if (!second) {
			throw new Error('Missing path after --file')
		}

		return {
			value: await context.runtime.readFile(second),
			source: 'file' as const,
		}
	}

	if (!first) {
		throw new Error('Missing input')
	}

	return {
		value: first,
		source: 'url' as const,
	}
}

function profileSummary(
	profile: ConnectionProfile,
	lockedSubscriptionIds: ReadonlySet<string>,
) {
	const subscriptionId = profile.metadata?.subscriptionId
	const locked = isProfileProtectedByLock(profile, lockedSubscriptionIds)
	return {
		id: profile.id,
		protocol: profile.protocol,
		...(profile.metadata?.name ? { name: profile.metadata.name } : {}),
		...(subscriptionId ? { subscriptionId } : {}),
		locked,
		...(locked ? { lockSource: 'subscription' as const } : {}),
	}
}

function subscriptionSummary(subscription: CliSubscription) {
	return {
		...subscription,
		locked: subscription.locked === true,
	}
}

function optionValue(args: readonly string[], name: string) {
	const index = args.indexOf(name)

	return index === -1 ? undefined : args[index + 1]
}

function optionValues(
	args: readonly string[],
	name: string,
): readonly string[] {
	const values: string[] = []
	for (let index = 0; index < args.length; index += 1) {
		const value = args[index + 1]
		if (args[index] === name && value) values.push(value)
	}
	return values
}

function requiredOption(args: readonly string[], name: string): string {
	const value = optionValue(args, name)
	if (!value) throw new Error(`Missing value after ${name}`)
	return value
}

function passwordFromEnvironment(
	args: readonly string[],
	context: CliContext,
): string {
	const name = requiredOption(args, '--password-env')
	if (!/^[A-Z_][A-Z0-9_]*$/u.test(name)) {
		throw new Error('--password-env must name an uppercase environment variable')
	}
	const password = context.runtime.readEnvironment(name)
	if (!password)
		throw new Error(`Password environment variable ${name} is empty`)
	return password
}

function isPlaintextBackup(document: string): boolean {
	try {
		const candidate = JSON.parse(document) as {
			readonly protection?: { readonly mode?: unknown }
		}
		return candidate.protection?.mode === 'none'
	} catch {
		return false
	}
}

function positionalArgs(
	args: readonly string[],
	optionsWithValues: readonly string[],
): readonly string[] {
	const values: string[] = []

	for (let index = 0; index < args.length; index += 1) {
		if (optionsWithValues.includes(args[index] ?? '')) {
			index += 1
			continue
		}
		values.push(args[index] ?? '')
	}

	return values
}

function isSubscription(input: unknown): input is CliSubscription {
	if (!input || typeof input !== 'object' || Array.isArray(input)) {
		return false
	}

	const candidate = input as Record<string, unknown>

	return typeof candidate.id === 'string' && typeof candidate.url === 'string'
}

function compareSubscription(left: CliSubscription, right: CliSubscription) {
	return left.id.localeCompare(right.id)
}

function formatJson(value: unknown) {
	return `${JSON.stringify(value, null, 2)}`
}

function clearActiveProfile(settings: Settings): Settings {
	return {
		...(settings.localPort === undefined
			? {}
			: { localPort: settings.localPort }),
		...(settings.engineId === undefined ? {} : { engineId: settings.engineId }),
	}
}

function engineStatusSummary(health: EngineHealth) {
	return {
		status: health.status,
		checkedAt: health.checkedAt,
		...(health.detail ? { detail: health.detail } : {}),
	}
}

function error(context: CliContext, message: string) {
	context.io.stderr(message)

	return 1
}

function writeImportIssues(
	context: CliContext,
	issues: readonly ImportIssue[],
	prefix: string,
) {
	for (const issue of issues) {
		context.io.stderr(
			`${prefix} skipped ${issue.source} entry ${issue.index + 1}: ${issue.message}`,
		)
	}
}

const nodeRuntime: CliRuntime = {
	async readFile(path) {
		const { readFile } = await import('node:fs/promises')

		return readFile(path, 'utf8')
	},
	async readStdin() {
		const chunks: Buffer[] = []

		for await (const chunk of process.stdin) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
		}

		return Buffer.concat(chunks).toString('utf8')
	},
	async writeFile(path, value) {
		await new FileDocumentStore(path).write(value)
	},
	readEnvironment(name) {
		return process.env[name]
	},
}

export function createMemoryCliContext(io: CliIo): CliContext {
	const profileDocument = new MemoryDocumentStore()

	return createCliContext(io, {
		profileStore: new JsonProfileStore(profileDocument),
		settingsStore: new JsonSettingsStore(new MemoryDocumentStore()),
		subscriptionDocument: new MemoryDocumentStore(),
		logger: silentLogger,
		engineRegistry: createEngineRegistry([
			createXrayEngine({
				process: new NoopXrayProcess(),
				latencyProbe: new NoopXrayLatencyProbe(),
			}),
			createSingBoxEngine({
				process: new NoopSingBoxProcess(),
				latencyProbe: new NoopSingBoxLatencyProbe(),
			}),
		]),
	})
}
