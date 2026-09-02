import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { runCli } from '../apps/cli/src/cli.ts'
import { createMemoryCliContext } from '../apps/cli/src/commands.ts'
import { createDesktopSubscriptionFetcher } from '../apps/desktop/src/lib/app-runtime.ts'
import {
	createDesktopConnectionCommands,
	type DesktopNativeCommands,
} from '../apps/desktop/src/lib/connection-commands.ts'
import { createMobileSubscriptionFetcher } from '../apps/mobile/src/lib/mobile-subscription-fetcher.ts'
import {
	CapacitorMobileVpn,
	type RahRowVpnPlugin,
} from '../apps/mobile/src/lib/mobile-vpn.ts'
import {
	JsonProfileStore,
	MemoryDocumentStore,
} from '../packages/core/src/storage/json-store.ts'
import { parseImportedProfiles } from '../packages/core/src/subscription/subscription-import.ts'
import type { XrayConfig } from '../packages/engine/src/xray/xray-engine.ts'
import { PRODUCT_SCREENS } from '../packages/features/src/app/product-screens.ts'

const REPO_ROOT = process.cwd()
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.css'])
const IGNORED_SOURCE_SEGMENTS = new Set(['dist', 'node_modules', '.turbo'])
const APP_ENTRY_FILES = new Set(['app.tsx', 'main.tsx'])
const FEATURE_SCREEN_MODULES = {
	home: 'home/Home',
	profiles: 'profiles/Profiles',
	subscriptions: 'subscriptions/Subscriptions',
	import: 'import/Import',
	settings: 'settings/Settings',
} as const
const APP_SHELL_IMPORT = "from '@rahrow/features/app/AppShell.tsx'"

const profileUrl =
	'vless://00000000-0000-0000-0000-000000000000@example.com:443?security=tls#Example'

interface SourceFile {
	readonly relativePath: string
	readonly source: string
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

class FakeDesktopNativeCommands implements DesktopNativeCommands {
	running = false

	async startXray(_config: XrayConfig): Promise<void> {
		this.running = true
	}

	async stopXray(): Promise<void> {
		this.running = false
	}

	async statusXray(): Promise<{ readonly running: boolean }> {
		return {
			running: this.running,
		}
	}

	async probeTcp() {
		return {
			reachable: false,
			error: 'Latency probing requires a platform Xray runtime adapter.',
		}
	}
}

class FakeMobileVpnPlugin implements RahRowVpnPlugin {
	profileId: string | undefined

	async networkIdentity() {
		return { localAddresses: ['192.0.2.10'] }
	}

	async connect(input: { readonly profileId: string }): Promise<void> {
		this.profileId = input.profileId
	}

	async disconnect(): Promise<void> {
		this.profileId = undefined
	}

	async status() {
		return {
			connected: this.profileId !== undefined,
			state: this.profileId ? 'connected' : 'disconnected',
			profileId: this.profileId,
		} as const
	}

	async diagnostics() {
		return {
			platform: 'ios',
			nativeReady: false,
			readiness: 'missing-vpn-entitlement',
			detail: 'Network Extension entitlement is not configured',
		} as const
	}

	async probe() {
		return {
			reachable: false,
			error: 'Mobile VPN probe is unavailable',
		}
	}
}

async function readSourceFiles(relativePath: string): Promise<SourceFile[]> {
	const directory = path.join(REPO_ROOT, relativePath)
	const entries = await readdir(directory, { withFileTypes: true })
	const files: SourceFile[] = []

	for (const entry of entries) {
		const entryRelativePath = path.join(relativePath, entry.name)

		if (IGNORED_SOURCE_SEGMENTS.has(entry.name)) {
			continue
		}

		if (entry.isDirectory()) {
			files.push(...(await readSourceFiles(entryRelativePath)))
			continue
		}

		if (!SOURCE_EXTENSIONS.has(path.extname(entry.name))) {
			continue
		}

		files.push({
			relativePath: entryRelativePath,
			source: await readFile(path.join(REPO_ROOT, entryRelativePath), 'utf8'),
		})
	}

	return files
}

function productionFiles(files: readonly SourceFile[]) {
	return files.filter(
		(file) =>
			!file.relativePath.endsWith('.test.ts') &&
			!file.relativePath.endsWith('.test.tsx'),
	)
}

function uniqueProductScreens(files: readonly SourceFile[]) {
	return productionFiles(files).filter((file) => {
		const basename = path.basename(file.relativePath)

		if (file.relativePath.endsWith('.module.css')) {
			return true
		}

		if (!file.relativePath.endsWith('.tsx')) {
			return false
		}

		return !APP_ENTRY_FILES.has(basename)
	})
}

describe('visual parity', () => {
	it('mounts the same feature screens and CSS Modules on desktop and mobile', async () => {
		const [desktopApp, mobileApp, desktopFiles, mobileFiles, featureFiles] =
			await Promise.all([
				readFile(path.join(REPO_ROOT, 'apps/desktop/src/app.tsx'), 'utf8'),
				readFile(path.join(REPO_ROOT, 'apps/mobile/src/app.tsx'), 'utf8'),
				readSourceFiles('apps/desktop/src'),
				readSourceFiles('apps/mobile/src'),
				readSourceFiles('packages/features/src'),
			])

		expect(desktopApp).toContain(APP_SHELL_IMPORT)
		expect(mobileApp).toContain(APP_SHELL_IMPORT)
		expect(desktopApp).toContain('<AppShell')
		expect(mobileApp).toContain('<AppShell')
		expect(PRODUCT_SCREENS.map((screen) => screen.id)).toEqual(
			Object.keys(FEATURE_SCREEN_MODULES),
		)

		for (const [id, stem] of Object.entries(FEATURE_SCREEN_MODULES)) {
			const screen = featureFiles.find((file) =>
				file.relativePath.endsWith(`${stem}.tsx`),
			)
			const styles = featureFiles.find((file) =>
				file.relativePath.endsWith(`${stem}.module.css`),
			)

			expect(screen, `${id} screen`).toBeDefined()
			expect(styles, `${id} CSS Module`).toBeDefined()
			expect(screen?.source).toContain('.module.css')
		}

		expect(
			featureFiles.some((file) =>
				file.relativePath.endsWith('app/AppShellLayout.module.css'),
			),
		).toBe(true)
		expect(
			uniqueProductScreens(desktopFiles).map((file) => file.relativePath),
		).toEqual([])
		expect(
			uniqueProductScreens(mobileFiles).map((file) => file.relativePath),
		).toEqual([])
	})

	it('fails if an app restyles shared features with local CSS', async () => {
		const [desktopStyles, mobileStyles, desktopFiles, mobileFiles] =
			await Promise.all([
				readFile(path.join(REPO_ROOT, 'apps/desktop/src/styles.css'), 'utf8'),
				readFile(path.join(REPO_ROOT, 'apps/mobile/src/styles.css'), 'utf8'),
				readSourceFiles('apps/desktop/src'),
				readSourceFiles('apps/mobile/src'),
			])

		expect(desktopStyles).toBe(mobileStyles)
		expect(desktopStyles).toContain('@import "@rahrow/ui/global.css"')
		expect(desktopStyles).not.toMatch(/\{[^}]*\}/s)
		expect(
			[...desktopFiles, ...mobileFiles]
				.filter((file) => file.relativePath.endsWith('.module.css'))
				.map((file) => file.relativePath),
		).toEqual([])
	})

	it('applies the same bundle budget and share chunk policy to both apps', async () => {
		const [desktopConfig, mobileConfig] = await Promise.all([
			readFile(path.join(REPO_ROOT, 'apps/desktop/vite.config.ts'), 'utf8'),
			readFile(path.join(REPO_ROOT, 'apps/mobile/vite.config.ts'), 'utf8'),
		])

		for (const config of [desktopConfig, mobileConfig]) {
			expect(config).toContain('webBundleBudgetPlugin()')
			expect(config).toContain('manualChunks: webManualChunks')
		}
	})

	it('keeps both viewports zoomable and the mobile viewport safe-area aware', async () => {
		const [desktopHtml, mobileHtml] = await Promise.all([
			readFile(path.join(REPO_ROOT, 'apps/desktop/index.html'), 'utf8'),
			readFile(path.join(REPO_ROOT, 'apps/mobile/index.html'), 'utf8'),
		])

		for (const html of [desktopHtml, mobileHtml]) {
			expect(html).toContain('width=device-width')
			expect(html).not.toContain('user-scalable=no')
			expect(html).not.toMatch(/maximum-scale\s*=\s*1(?:\.0)?/u)
		}
		expect(mobileHtml).toContain('viewport-fit=cover')
	})
})

describe('subscription transport boundary', () => {
	it('keeps HTTP policy in core and transport selection at application edges', async () => {
		const [
			coreFetcher,
			cliCommands,
			desktopRuntime,
			mobileFetcher,
			featureFiles,
		] = await Promise.all([
			readFile(
				path.join(
					REPO_ROOT,
					'packages/core/src/subscription/http-subscription-fetcher.ts',
				),
				'utf8',
			),
			readFile(path.join(REPO_ROOT, 'apps/cli/src/commands.ts'), 'utf8'),
			readFile(
				path.join(REPO_ROOT, 'apps/desktop/src/lib/app-runtime.ts'),
				'utf8',
			),
			readFile(
				path.join(REPO_ROOT, 'apps/mobile/src/lib/mobile-subscription-fetcher.ts'),
				'utf8',
			),
			readSourceFiles('packages/features/src'),
		])

		expect(coreFetcher).toContain('export function createHttpSubscriptionFetcher')
		expect(cliCommands).toContain(
			"from '@rahrow/core/subscription/http-subscription-fetcher.ts'",
		)
		expect(cliCommands).not.toContain(
			'export function createHttpSubscriptionFetcher',
		)
		expect(desktopRuntime).toContain('createHttpSubscriptionFetcher')
		expect(mobileFetcher).toContain('createHttpSubscriptionFetcher')
		expect(
			productionFiles(featureFiles).filter((file) =>
				file.source.includes('http-subscription-fetcher'),
			),
		).toEqual([])
	})
})

describe('cross-interface shared contracts', () => {
	it('imports the same profile through core and uses it through CLI and desktop', async () => {
		const [profile] = parseImportedProfiles(profileUrl)
		const { io, stdout, stderr } = createTestIo()
		const cliContext = createMemoryCliContext(io)
		const desktopCommands = createDesktopConnectionCommands(
			new FakeDesktopNativeCommands(),
		)
		const mobilePlugin = new FakeMobileVpnPlugin()
		const mobileVpn = new CapacitorMobileVpn(mobilePlugin)

		await expect(runCli(['import', profileUrl], io, cliContext)).resolves.toBe(0)
		const [cliProfile] = await cliContext.profileStore.list()
		const profileId = cliProfile?.id ?? ''
		await expect(
			runCli(['connect', profileId, '--mode', 'proxy'], io, cliContext),
		).resolves.toBe(0)
		const desktopResult = await desktopCommands.connect({ profile })
		await mobileVpn.connect({ profileId: profile.id })

		expect(stderr).toEqual([])
		expect(stdout[0]).toContain(profileId)
		expect(stdout[1]).toContain('"state": "connected"')
		expect(profile.id).toMatch(/^[A-Za-z0-9_.:-]+$/u)
		expect(desktopResult.ok && desktopResult.data.profile.id).toBe(profile.id)
		expect(mobilePlugin.profileId).toBe(profile.id)
	})

	it('normalizes subscription bodies and metadata through the same core contract', async () => {
		const response = {
			body: 'vless://profile',
			subscriptionUserinfo: 'download=20; total=100',
			supportUrl: 'https://support.example.com/help',
			profileWebPageUrl: 'https://account.example.com/profile',
		}
		const desktopFetcher = createDesktopSubscriptionFetcher({
			nativeRequest: async () => response,
		})
		const mobileFetcher = createMobileSubscriptionFetcher({
			platform: 'android',
			plugin: { fetch: async () => response },
		})
		const subscription = {
			id: 'parity',
			url: 'https://subscriptions.example.com/list',
		}

		const desktopResult = await desktopFetcher.fetchWithMetadata?.(subscription)
		const mobileResult = await mobileFetcher.fetchWithMetadata?.(subscription)

		expect(desktopResult).toEqual(mobileResult)
		expect(desktopResult).toMatchObject({
			body: 'vless://profile',
			metadata: {
				usage: { downloadBytes: 20, totalBytes: 100 },
				supportUrl: 'https://support.example.com/help',
				profileUrl: 'https://account.example.com/profile',
			},
		})
	})

	it('keeps malformed persisted data and malformed import data as validation failures', async () => {
		const store = new JsonProfileStore(
			new MemoryDocumentStore('{"profiles":[{"id":"","protocol":"vless"}]}'),
		)
		const { io, stdout, stderr } = createTestIo()

		await expect(store.list()).rejects.toMatchObject({ code: 'invalid_profile' })
		await expect(
			runCli(
				['import', 'vless://not-a-uuid@example.com:443'],
				io,
				createMemoryCliContext(io),
			),
		).resolves.toBe(1)

		expect(stdout).toEqual([])
		expect(stderr).toEqual([
			expect.stringContaining('rahrow import skipped url entry 1:'),
			'rahrow import: no supported profiles found',
		])
	})

	it('reports runtime and platform unavailability without treating profile syntax as malformed', async () => {
		const { io, stdout, stderr } = createTestIo()
		const cliContext = createMemoryCliContext(io)
		const mobileVpn = new CapacitorMobileVpn(new FakeMobileVpnPlugin())

		await runCli(['import', profileUrl], io, cliContext)
		const [profile] = await cliContext.profileStore.list()
		const profileId = profile?.id ?? ''
		await expect(runCli(['test', profileId], io, cliContext)).resolves.toBe(2)
		await expect(mobileVpn.diagnostics()).resolves.toMatchObject({
			platform: 'ios',
			nativeReady: false,
		})

		expect(stdout.at(-1)).toContain('"reachable": false')
		expect(stderr).toEqual([
			'rahrow test: Latency probing requires a platform sing-box runtime adapter.',
		])
	})
})
