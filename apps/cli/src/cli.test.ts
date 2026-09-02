import {
	createRahrowBackup,
	openRahrowBackup,
} from '@rahrow/core/backup/backup-envelope.ts'
import { silentLogger } from '@rahrow/core/logging/silent-logger.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type {
	EngineHealth,
	EngineStartInput,
	LatencyResult,
	ProxyEngine,
} from '@rahrow/core/runtime/proxy-engine.ts'
import {
	JsonProfileStore,
	JsonSettingsStore,
	MemoryDocumentStore,
} from '@rahrow/core/storage/json-store.ts'
import {
	createFetchSubscriptionTransport,
	createHttpSubscriptionFetcher,
} from '@rahrow/core/subscription/http-subscription-fetcher.ts'
import type { SubscriptionFetcher } from '@rahrow/core/subscription/subscription-import.ts'
import { createEngineRegistry } from '@rahrow/engine/registry/engine-registry.ts'
import { createXrayEngine } from '@rahrow/engine/runtime/create-xray-engine.ts'
import type {
	EngineProcessExit,
	EngineProcessSpawner,
	EngineProcessSpawnInput,
	ManagedEngineProcessHandle,
} from '@rahrow/engine/runtime/managed-engine-process.ts'
import { NoopXrayLatencyProbe } from '@rahrow/engine/xray/xray-engine.ts'
import { describe, expect, it } from 'vitest'

import { runCli } from './cli.ts'
import { createCliContext, createMemoryCliContext } from './commands.ts'

class SmartTestEngine implements ProxyEngine {
	readonly id = 'sing-box'
	readonly manifest = { id: this.id, supportedProtocols: ['trojan'] as const }
	#running = false

	async start(_input: EngineStartInput) {
		this.#running = true
	}

	async stop() {
		this.#running = false
	}

	async restart(input: EngineStartInput) {
		await this.stop()
		await this.start(input)
	}

	async status(): Promise<EngineHealth> {
		return {
			status: this.#running ? 'running' : 'stopped',
			checkedAt: '2026-09-02T00:00:00.000Z',
		}
	}

	async test(candidate: ConnectionProfile): Promise<LatencyResult> {
		return {
			profileId: candidate.id,
			reachable: true,
			latencyMs: candidate.endpoint.host.startsWith('fast') ? 10 : 100,
			checkedAt: '2026-09-02T00:00:00.000Z',
		}
	}
}

function backupRuntime(
	files = new Map<string, string>(),
	environment: Readonly<Record<string, string>> = {},
) {
	return {
		files,
		runtime: {
			async readFile(path: string) {
				const value = files.get(path)
				if (value === undefined) throw new Error(`missing test file: ${path}`)
				return value
			},
			async readStdin() {
				return files.get('-') ?? ''
			},
			async writeFile(path: string, value: string) {
				files.set(path, value)
			},
			readEnvironment(name: string) {
				return environment[name]
			},
		},
	}
}

function createTestIo() {
	const stdout: string[] = []
	const stderr: string[] = []

	return {
		io: {
			stdout(value: string) {
				stdout.push(value)
			},
			stderr(value: string) {
				stderr.push(value)
			},
		},
		stdout,
		stderr,
	}
}

async function onlyProfileId(
	context: ReturnType<typeof createMemoryCliContext>,
) {
	const profiles = await context.profileStore.list()
	expect(profiles).toHaveLength(1)
	return profiles[0]?.id ?? ''
}

describe('RahRow CLI command framework', () => {
	it('requires acknowledgement and exports only selected connections as plaintext', async () => {
		const { io, stdout, stderr } = createTestIo()
		const host = backupRuntime()
		const context = createCliContext(io, {
			profileStore: new JsonProfileStore(new MemoryDocumentStore()),
			settingsStore: new JsonSettingsStore(new MemoryDocumentStore()),
			subscriptionDocument: new MemoryDocumentStore(),
			runtime: host.runtime,
			logger: silentLogger,
		})
		await runCli(
			['import', 'trojan://alpha-secret@alpha.example.com:443#Alpha'],
			io,
			context,
		)
		const id = await onlyProfileId(context)

		await expect(
			runCli(
				['backup', 'export', '--output', 'backup.json', '--plaintext'],
				io,
				context,
			),
		).resolves.toBe(1)
		await expect(
			runCli(
				[
					'backup',
					'export',
					'--output',
					'backup.json',
					'--scope',
					'connections',
					'--connection',
					id,
					'--plaintext',
					'--acknowledge-sensitive',
				],
				io,
				context,
			),
		).resolves.toBe(0)

		expect(host.files.get('backup.json')).toContain('alpha-secret')
		expect(stdout.at(-1)).not.toContain('alpha-secret')
		expect(stderr.at(-1)).toContain('--acknowledge-sensitive')
	})

	it('exports password-protected backups through an environment reference', async () => {
		const { io, stdout } = createTestIo()
		const host = backupRuntime(new Map(), { BACKUP_PASSWORD: 'correct horse' })
		const context = createCliContext(io, {
			profileStore: new JsonProfileStore(new MemoryDocumentStore()),
			settingsStore: new JsonSettingsStore(new MemoryDocumentStore()),
			subscriptionDocument: new MemoryDocumentStore(),
			runtime: host.runtime,
			logger: silentLogger,
		})
		await runCli(
			['import', 'trojan://alpha-secret@alpha.example.com:443#Alpha'],
			io,
			context,
		)

		await expect(
			runCli(
				[
					'backup',
					'export',
					'--output',
					'backup.json',
					'--password-env',
					'BACKUP_PASSWORD',
				],
				io,
				context,
			),
		).resolves.toBe(0)
		const document = host.files.get('backup.json') ?? ''

		expect(document).not.toContain('alpha-secret')
		expect(document).not.toContain('correct horse')
		expect(
			(await openRahrowBackup(document, 'correct horse')).connections,
		).toHaveLength(1)
		expect(stdout.at(-1)).not.toContain('correct horse')
	})

	it('previews imports without mutation and preserves locked profiles on apply', async () => {
		const { io, stdout } = createTestIo()
		const current: ConnectionProfile = {
			id: 'locked-profile',
			protocol: 'trojan',
			endpoint: { host: 'current.example.com', port: 443 },
			authentication: { password: 'current-secret' },
			metadata: {
				name: 'Locked',
				source: 'subscription',
				subscriptionId: 'locked',
			},
		}
		const incoming: ConnectionProfile = {
			...current,
			endpoint: { host: 'incoming.example.com', port: 443 },
			authentication: { password: 'incoming-secret' },
		}
		const document = await createRahrowBackup({
			connections: [incoming],
			settings: {},
			selection: 'all',
		})
		const host = backupRuntime(
			new Map([['backup.json', JSON.stringify(document.document)]]),
		)
		const profileStore = new JsonProfileStore(new MemoryDocumentStore())
		await profileStore.replaceAll([current])
		const context = createCliContext(io, {
			profileStore,
			settingsStore: new JsonSettingsStore(new MemoryDocumentStore()),
			subscriptionDocument: new MemoryDocumentStore(),
			runtime: host.runtime,
			logger: silentLogger,
		})
		await runCli(
			['subscription', 'add', 'locked', 'https://example.com/locked.txt'],
			io,
			context,
		)
		await runCli(['subscription', 'lock', 'locked'], io, context)

		await expect(
			runCli(
				['backup', 'import', '--file', 'backup.json', '--acknowledge-sensitive'],
				io,
				context,
			),
		).resolves.toBe(0)
		expect((await profileStore.get(current.id))?.endpoint.host).toBe(
			'current.example.com',
		)
		expect(stdout.at(-1)).not.toContain('incoming-secret')

		await expect(
			runCli(
				[
					'backup',
					'import',
					'--file',
					'backup.json',
					'--acknowledge-sensitive',
					'--apply',
					'--policy',
					'replace',
				],
				io,
				context,
			),
		).resolves.toBe(0)
		expect((await profileStore.get(current.id))?.endpoint.host).toBe(
			'current.example.com',
		)
		expect(stdout.at(-1)).toContain('"lockedSkips": 1')
		expect(stdout.at(-1)).not.toContain('incoming-secret')
	})
	it('prints deterministic help output', async () => {
		const { io, stdout, stderr } = createTestIo()

		await expect(runCli(['--help'], io)).resolves.toBe(0)

		expect(stderr).toEqual([])
		expect(stdout.join('\n')).toContain('Usage: rahrow <command> [options]')
		expect(stdout.join('\n')).toContain(
			'subscription  Manage subscription sources (add, remove, parse, refresh).',
		)
		expect(stdout.join('\n')).toContain('refresh')
		expect(stdout.join('\n')).toContain('about')
	})

	it('prints verified About metadata without pretending to open links', async () => {
		const { io, stdout, stderr } = createTestIo()

		await expect(runCli(['about'], io)).resolves.toBe(0)

		expect(stderr).toEqual([])
		expect(JSON.parse(stdout.join('\n'))).toMatchObject({
			product: 'RahRow',
			owner: 'False Foundation',
			license: 'MIT',
			source: 'https://github.com/FalseFoundation/rahrow',
			supportEmail: 'falsefoundation.co@gmail.com',
		})
	})

	it('routes remaining future commands to stable placeholder handlers', async () => {
		const { io, stdout, stderr } = createTestIo()

		await expect(runCli(['connect'], io)).resolves.toBe(1)

		expect(stdout).toEqual([])
		expect(stderr).toEqual(['rahrow connect: missing profile id'])
	})

	it('rejects unknown commands with deterministic output', async () => {
		const { io, stdout, stderr } = createTestIo()

		await expect(runCli(['unknown'], io)).resolves.toBe(1)

		expect(stdout).toEqual([])
		expect(stderr[0]).toBe('rahrow: unknown command "unknown"')
		expect(stderr.join('\n')).toContain('Usage: rahrow <command> [options]')
	})

	it('imports, lists, and exports protocol URLs through shared core parsers', async () => {
		const { io, stdout, stderr } = createTestIo()
		const context = createMemoryCliContext(io)
		const url =
			'vless://00000000-0000-0000-0000-000000000000@example.com:443?security=tls#Example'

		await expect(runCli(['import', url], io, context)).resolves.toBe(0)
		const profileId = await onlyProfileId(context)
		await expect(runCli(['profiles'], io, context)).resolves.toBe(0)
		await expect(runCli(['export', profileId], io, context)).resolves.toBe(0)

		expect(stderr).toEqual([])
		expect(stdout[0]).toContain('"imported"')
		expect(stdout[1]).toContain('"protocol": "vless"')
		expect(stdout[2]).toContain(
			'vless://00000000-0000-0000-0000-000000000000@example.com:443',
		)
	})

	it('adds, removes, and parses subscription contents deterministically', async () => {
		const { io, stdout, stderr } = createTestIo()
		const context = createMemoryCliContext(io)
		const subscriptionBody = 'trojan://secret@example.com:443?security=tls#Trojan'

		await expect(
			runCli(
				[
					'subscription',
					'add',
					'main',
					'https://example.com/sub.txt',
					'--name',
					'Main',
				],
				io,
				context,
			),
		).resolves.toBe(0)
		await expect(runCli(['subscription'], io, context)).resolves.toBe(0)
		await expect(
			runCli(['subscription', 'parse', subscriptionBody], io, context),
		).resolves.toBe(0)
		await expect(
			runCli(['subscription', 'remove', 'main'], io, context),
		).resolves.toBe(0)

		expect(stderr).toEqual([])
		expect(stdout[0]).toContain('"added": "main"')
		expect(stdout[1]).toContain('"url": "https://example.com/sub.txt"')
		expect(stdout[2]).toMatch(/"trojan:example\.com:443\.[0-9a-f-]{36}"/u)
		expect(stdout[3]).toContain('"removed": "main"')
	})

	it('fails closed for destructive commands under a locked subscription aggregate', async () => {
		const { io, stdout, stderr } = createTestIo()
		const context = createMemoryCliContext(io)
		const subscriptionBody = 'trojan://secret@example.com:443?security=tls#Locked'

		await runCli(
			['subscription', 'add', 'locked', 'https://example.com/locked.txt'],
			io,
			context,
		)
		await runCli(['subscription', 'parse', subscriptionBody], io, context)
		const profile = (await context.profileStore.list())[0]
		if (!profile) throw new Error('Expected imported profile')
		await context.profileStore.save({
			...profile,
			metadata: { ...profile.metadata, subscriptionId: 'locked' },
		})
		await expect(
			runCli(['subscription', 'lock', 'locked'], io, context),
		).resolves.toBe(0)
		await expect(
			runCli(
				['profiles', 'cleanup', '--subscription', 'locked', '--commit'],
				io,
				context,
			),
		).resolves.toBe(0)

		await expect(
			runCli(['profiles', 'remove', profile.id], io, context),
		).resolves.toBe(1)
		await expect(
			runCli(['subscription', 'remove', 'locked'], io, context),
		).resolves.toBe(1)
		await expect(
			runCli(['subscription', 'refresh', 'locked'], io, context),
		).resolves.toBe(1)

		expect(await context.profileStore.get(profile.id)).not.toBeNull()
		expect(stderr).toEqual([
			expect.stringContaining('protected by locked subscription'),
			expect.stringContaining('subscription is locked'),
			expect.stringContaining('subscription is locked'),
		])
		expect(stdout.at(-1)).toContain('"skippedLocked": 2')
		expect(stdout.at(-1)).toContain('"removed": 0')
	})

	it('scopes cleanup dry-run and commit to an explicit subscription selector', async () => {
		const { io, stdout } = createTestIo()
		const context = createIsolatedContext(io, {
			subscriptionFetcher: {
				fetch: async () => 'trojan://secret@owned.example:443?security=tls#Owned',
			},
		})
		await runCli(
			['subscription', 'add', 'source', 'https://example.com/source.txt'],
			io,
			context,
		)
		await runCli(['subscription', 'refresh', 'source'], io, context)
		await runCli(
			[
				'import',
				'vless://00000000-0000-4000-8000-000000000000@local.example:443?security=tls#Local',
			],
			io,
			context,
		)
		const before = await context.profileStore.list()

		await expect(
			runCli(['profiles', 'cleanup', '--subscription', 'source'], io, context),
		).resolves.toBe(0)
		expect(await context.profileStore.list()).toEqual(before)
		expect(stdout.at(-1)).toContain('"dryRun": true')
		expect(stdout.at(-1)).toContain('"scope": "subscription:source"')

		await expect(
			runCli(
				['profiles', 'cleanup', '--subscription', 'source', '--commit'],
				io,
				context,
			),
		).resolves.toBe(0)
		const remaining = await context.profileStore.list()
		expect(remaining).toHaveLength(1)
		expect(remaining[0]?.endpoint.host).toBe('local.example')
		expect(stdout.at(-1)).toContain('"dryRun": false')

		await expect(
			runCli(['profiles', 'cleanup', '--group', 'local', '--commit'], io, context),
		).resolves.toBe(0)
		expect(await context.profileStore.list()).toEqual([])
		expect(stdout.at(-1)).toContain('"scope": "group:local"')
	})

	it('returns actionable errors for malformed import data', async () => {
		const { io, stdout, stderr } = createTestIo()
		const context = createMemoryCliContext(io)

		await expect(
			runCli(['import', 'vless://not-a-uuid@example.com:443'], io, context),
		).resolves.toBe(1)

		expect(stdout).toEqual([])
		expect(stderr).toEqual([
			expect.stringContaining('rahrow import skipped url entry 1:'),
			'rahrow import: no supported profiles found',
		])
	})

	it('imports valid profiles while reporting skipped malformed entries', async () => {
		const { io, stdout, stderr } = createTestIo()
		const context = createMemoryCliContext(io)
		const input = [
			'vless://00000000-0000-0000-0000-000000000000@example.com:443?security=tls#Example',
			'vless://not-a-uuid@example.com:443',
		].join('\n')

		await expect(runCli(['import', input], io, context)).resolves.toBe(0)

		expect(stdout[0]).toContain('"imported"')
		expect(stdout[0]).toContain('"skipped"')
		expect(stderr).toEqual([
			expect.stringContaining('rahrow import skipped url entry 2:'),
		])
	})

	it('parses valid subscription entries while reporting skipped malformed entries', async () => {
		const { io, stdout, stderr } = createTestIo()
		const context = createMemoryCliContext(io)
		const input = [
			'trojan://secret@example.com:443?security=tls#Trojan',
			'vless://not-a-uuid@example.com:443',
		].join('\n')

		await expect(
			runCli(['subscription', 'parse', input], io, context),
		).resolves.toBe(0)

		expect(stdout[0]).toMatch(/"trojan:example\.com:443\.[0-9a-f-]{36}"/u)
		expect(stdout[0]).toContain('"skipped"')
		expect(stderr).toEqual([
			expect.stringContaining(
				'rahrow subscription parse skipped subscription entry 2:',
			),
		])
	})

	it('returns stable exit codes and stderr for missing profiles', async () => {
		const { io, stdout, stderr } = createTestIo()
		const context = createMemoryCliContext(io)

		await expect(runCli(['export'], io, context)).resolves.toBe(1)
		await expect(runCli(['connect', 'missing'], io, context)).resolves.toBe(1)
		await expect(runCli(['test', 'missing'], io, context)).resolves.toBe(1)

		expect(stdout).toEqual([])
		expect(stderr).toEqual([
			'rahrow export: missing profile id',
			'rahrow connect: profile not found: missing',
			'rahrow test: profile not found: missing',
		])
	})

	it('fails closed when the default VPN mode cannot be registered by the CLI', async () => {
		const { io, stderr } = createTestIo()
		const context = createMemoryCliContext(io)
		const url = 'trojan://secret@example.com:443?security=tls#Example'

		await runCli(['import', url], io, context)
		const profileId = await onlyProfileId(context)
		await expect(runCli(['connect', profileId], io, context)).resolves.toBe(1)
		expect(stderr).toEqual([
			'rahrow connect: CLI cannot register an OS VPN/TUN connection. Use --mode proxy for the explicit local-proxy fallback.',
		])
	})

	it('connects, reports status, restarts, and disconnects with shared lifecycle state', async () => {
		const { io, stdout, stderr } = createTestIo()
		const context = createMemoryCliContext(io)
		const url =
			'vless://00000000-0000-0000-0000-000000000000@example.com:443?security=tls#Example'

		await runCli(['import', url], io, context)
		const profileId = await onlyProfileId(context)
		await expect(
			runCli(['connect', profileId, '--mode', 'proxy'], io, context),
		).resolves.toBe(0)
		await expect(runCli(['status'], io, context)).resolves.toBe(0)
		await expect(runCli(['restart'], io, context)).resolves.toBe(0)
		await expect(runCli(['disconnect'], io, context)).resolves.toBe(0)

		expect(stderr).toEqual([])
		expect(stdout[1]).toContain('"state": "connected"')
		expect(stdout[2]).toContain('"activeProfileId"')
		expect(stdout[2]).toContain('"status": "running"')
		expect(stdout[3]).toContain('"state": "connected"')
		expect(stdout[4]).toContain('"state": "disconnected"')
	})

	it('runs, enables, reports, and disables Smart Connect explicitly', async () => {
		const { io, stdout, stderr } = createTestIo()
		const context = createCliContext(io, {
			profileStore: new JsonProfileStore(new MemoryDocumentStore()),
			settingsStore: new JsonSettingsStore(new MemoryDocumentStore()),
			subscriptionDocument: new MemoryDocumentStore(),
			logger: silentLogger,
			engineRegistry: createEngineRegistry([new SmartTestEngine()]),
		})
		await runCli(
			['import', 'trojan://secret@slow.example.com:443#Slow'],
			io,
			context,
		)
		await runCli(
			['import', 'trojan://secret@fast.example.com:443#Fast'],
			io,
			context,
		)
		await context.settingsStore.write({
			engineId: 'sing-box',
			connectionMode: 'proxy',
		})

		await expect(runCli(['smart-connect', 'run'], io, context)).resolves.toBe(0)
		expect(stdout.at(-1)).toContain('"outcome": "connected"')
		expect(stdout.at(-1)).toContain('fast.example.com')
		await expect(runCli(['smart-connect', 'start'], io, context)).resolves.toBe(0)
		await expect(runCli(['smart-connect', 'status'], io, context)).resolves.toBe(
			0,
		)
		expect(stdout.at(-1)).toContain('"enabled": true')
		await expect(runCli(['smart-connect', 'stop'], io, context)).resolves.toBe(0)
		expect(stdout.at(-1)).toContain('"enabled": false')
		expect(stderr).toEqual([])
	})

	it('uses the persisted sing-box engine selection for connect and status', async () => {
		const { io, stdout, stderr } = createTestIo()
		const context = createMemoryCliContext(io)
		const url = 'trojan://secret@example.com:443?security=tls#Example'

		await runCli(['import', url], io, context)
		const profileId = await onlyProfileId(context)
		await context.settingsStore.write({ engineId: 'sing-box' })
		await expect(
			runCli(['connect', profileId, '--mode', 'proxy'], io, context),
		).resolves.toBe(0)
		await expect(runCli(['status'], io, context)).resolves.toBe(0)

		expect(stderr).toEqual([])
		expect(stdout.at(-2)).toContain('"state": "connected"')
		expect(stdout.at(-1)).toContain('"status": "running"')
		await expect(
			context.engineRegistry.get('sing-box').status(),
		).resolves.toMatchObject({ status: 'running' })
	})

	it('reports Xray latency runtime unavailability distinctly from malformed input', async () => {
		const { io, stdout, stderr } = createTestIo()
		const context = createMemoryCliContext(io)
		const url = 'trojan://secret@example.com:443?security=tls#Trojan'

		await runCli(['import', url], io, context)
		const profileId = await onlyProfileId(context)
		await context.settingsStore.write({ engineId: 'xray' })

		await expect(runCli(['test', profileId], io, context)).resolves.toBe(2)

		expect(stdout.at(-1)).toContain('"reachable": false')
		expect(stderr).toEqual([
			'rahrow test: Latency probing requires a platform Xray runtime adapter.',
		])
	})

	it('starts Xray through the shared engine process adapter', async () => {
		const { io, stdout, stderr } = createTestIo()
		const spawner = new FakeEngineProcessSpawner()
		const context = createIsolatedContext(io, {
			engineRegistry: createEngineRegistry([
				createXrayEngine({
					spawner,
					binaryPath: '/opt/xray/xray',
					latencyProbe: new NoopXrayLatencyProbe(),
				}),
			]),
		})
		const url =
			'vless://00000000-0000-0000-0000-000000000000@example.com:443?security=tls#Example'

		await runCli(['import', url], io, context)
		const profileId = await onlyProfileId(context)
		await context.settingsStore.write({ engineId: 'xray' })
		await expect(
			runCli(['connect', profileId, '--mode', 'proxy'], io, context),
		).resolves.toBe(0)

		expect(stderr).toEqual([])
		expect(stdout.at(-1)).toContain('"state": "connected"')
		expect(spawner.spawnInputs).toHaveLength(1)
		expect(spawner.spawnInputs[0]?.binaryPath).toBe('/opt/xray/xray')
		expect(spawner.spawnInputs[0]?.args).toEqual(['run', '-config', 'stdin:'])
	})

	it('refreshes a stored subscription URL through an injected fetcher', async () => {
		const { io, stdout, stderr } = createTestIo()
		const fetchedUrls: string[] = []
		const fetcher: SubscriptionFetcher = {
			async fetch(subscription) {
				fetchedUrls.push(subscription.url)

				return 'trojan://secret@example.com:443?security=tls#Fetched'
			},
		}
		const context = createIsolatedContext(io, { subscriptionFetcher: fetcher })

		await expect(
			runCli(
				['subscription', 'add', 'main', 'https://example.com/nodes.txt'],
				io,
				context,
			),
		).resolves.toBe(0)
		await expect(
			runCli(['subscription', 'refresh', 'main'], io, context),
		).resolves.toBe(0)

		expect(fetchedUrls).toEqual(['https://example.com/nodes.txt'])
		expect(stderr).toEqual([])
		expect(stdout.at(-1)).toContain('"refreshed": "main"')
		expect(stdout.at(-1)).toMatch(/"trojan:example\.com:443\.[0-9a-f-]{36}"/u)

		await expect(runCli(['profiles'], io, context)).resolves.toBe(0)
		expect(stdout.at(-1)).toMatch(
			/"id": "trojan:example\.com:443\.[0-9a-f-]{36}"/u,
		)
	})

	it('fails closed when subscription refresh receives an HTTP error', async () => {
		const { io, stdout, stderr } = createTestIo()
		const fetcher: SubscriptionFetcher = {
			async fetch(subscription) {
				throw new Error(`HTTP 503 fetching ${subscription.url}`)
			},
		}
		const context = createIsolatedContext(io, { subscriptionFetcher: fetcher })

		await runCli(
			['subscription', 'add', 'main', 'https://example.com/nodes.txt'],
			io,
			context,
		)
		await expect(
			runCli(['subscription', 'refresh', 'main'], io, context),
		).resolves.toBe(1)

		expect(stdout.at(-1)).not.toContain('imported')
		expect(stderr.some((line) => line.includes('HTTP 503'))).toBe(true)

		await expect(runCli(['profiles'], io, context)).resolves.toBe(0)
		expect(stdout.at(-1)).toContain('[]')
	})

	it('refreshes valid subscription entries while reporting skipped malformed entries', async () => {
		const { io, stdout, stderr } = createTestIo()
		const fetcher: SubscriptionFetcher = {
			async fetch() {
				return [
					'trojan://secret@example.com:443?security=tls#Trojan',
					'vless://not-a-uuid@example.com:443',
				].join('\n')
			},
		}
		const context = createIsolatedContext(io, { subscriptionFetcher: fetcher })

		await runCli(
			['subscription', 'add', 'main', 'https://example.com/nodes.txt'],
			io,
			context,
		)
		await expect(
			runCli(['subscription', 'refresh', 'main'], io, context),
		).resolves.toBe(0)

		expect(stdout.at(-1)).toMatch(/"trojan:example\.com:443\.[0-9a-f-]{36}"/u)
		expect(stdout.at(-1)).toContain('"skipped"')
		expect(stderr).toEqual([
			expect.stringContaining(
				'rahrow subscription refresh skipped subscription entry 2:',
			),
		])
	})
})

describe('createHttpSubscriptionFetcher', () => {
	it('fails closed on non-OK HTTP responses without exposing the body', async () => {
		const fetcher = createHttpSubscriptionFetcher({
			transport: createFetchSubscriptionTransport(
				async () =>
					new Response(
						'vless://00000000-0000-0000-0000-000000000000@evil.example:443?security=tls#Evil',
						{ status: 503, statusText: 'Service Unavailable' },
					),
			),
		})

		await expect(
			fetcher.fetch({
				id: 'main',
				url: 'https://example.com/nodes.txt',
			}),
		).rejects.toThrow(/HTTP 503/)
	})
})

function createIsolatedContext(
	io: ReturnType<typeof createTestIo>['io'],
	options: {
		readonly engineRegistry?: ReturnType<typeof createEngineRegistry>
		readonly subscriptionFetcher?: SubscriptionFetcher
	} = {},
) {
	return createCliContext(io, {
		profileStore: new JsonProfileStore(new MemoryDocumentStore()),
		settingsStore: new JsonSettingsStore(new MemoryDocumentStore()),
		subscriptionDocument: new MemoryDocumentStore(),
		logger: silentLogger,
		...options,
	})
}

class FakeXrayHandle implements ManagedEngineProcessHandle {
	pid = 42
	exit: EngineProcessExit | undefined

	async stop(): Promise<void> {}

	async kill(): Promise<void> {}

	async exited(): Promise<EngineProcessExit | undefined> {
		return this.exit
	}

	logs() {
		return []
	}
}

class FakeEngineProcessSpawner implements EngineProcessSpawner {
	spawnInputs: EngineProcessSpawnInput[] = []
	handle = new FakeXrayHandle()

	async assertExecutable(): Promise<void> {}

	async spawn(
		input: EngineProcessSpawnInput,
	): Promise<ManagedEngineProcessHandle> {
		this.spawnInputs.push(input)

		return this.handle
	}
}
