import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

interface PackageManifest {
	readonly name?: string
	readonly private?: boolean
	readonly exports?: unknown
	readonly dependencies?: Readonly<Record<string, string>>
	readonly devDependencies?: Readonly<Record<string, string>>
}

interface SourceFile {
	readonly relativePath: string
	readonly source: string
}

const REPO_ROOT = process.cwd()
const CONFIGURED_WORKSPACE_PACKAGES = ['apps/**', 'packages/**'] as const
const ACTIVE_WORKSPACE_PATHS = [
	'apps/cli',
	'apps/desktop',
	'apps/mobile',
	'packages/ads',
	'packages/core',
	'packages/engine',
	'packages/features',
	'packages/static',
	'packages/tooling',
	'packages/ui',
] as const
const ACTIVE_PACKAGE_NAMES = [
	'@rahrow/ads',
	'@rahrow/core',
	'@rahrow/engine',
	'@rahrow/features',
	'@rahrow/static',
	'@rahrow/tooling',
	'@rahrow/ui',
] as const
const EXCLUDED_SCAFFOLD_PATHS = [
	'runtime',
	'crates',
	'apps/server',
	'apps/web',
] as const
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx'])
const IGNORED_SOURCE_SEGMENTS = new Set(['dist', 'node_modules', '.turbo'])
const CORE_FORBIDDEN_IMPORTS = [
	'react',
	'react-dom',
	'@rahrow/ui',
	'@rahrow/features',
	'@rahrow/engine',
	'@tauri-apps/',
	'@capacitor/',
	'vite',
	'node:',
]
const FEATURE_FORBIDDEN_IMPORTS = [
	'@rahrow/desktop',
	'@rahrow/mobile',
	'@tauri-apps/',
	'@capacitor/',
	'node:',
]
const UI_FORBIDDEN_IMPORTS = [
	'@rahrow/core',
	'@rahrow/engine',
	'@rahrow/features',
	'@tauri-apps/',
	'@capacitor/',
	'node:',
]
const APP_PROFILE_WORKFLOW_SYMBOLS = [
	'importProfilesToStore',
	'duplicateProfile',
	'renameProfile',
	'upsertProfileSubscriptionDraft',
]

async function pathExists(relativePath: string) {
	try {
		await access(path.join(REPO_ROOT, relativePath))
		return true
	} catch {
		return false
	}
}

async function readWorkspaceManifest(relativePath: string) {
	const source = await readFile(
		path.join(REPO_ROOT, relativePath, 'package.json'),
		'utf8',
	)
	return JSON.parse(source) as PackageManifest
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

function readImportSpecifiers(source: string) {
	const imports = []
	const importPattern =
		/(?:import|export)\s+(?:type\s+)?(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/gu

	for (const match of source.matchAll(importPattern)) {
		const [, specifier] = match

		if (specifier !== undefined) {
			imports.push(specifier)
		}
	}

	return imports
}

function expectNoForbiddenImports(
	files: readonly SourceFile[],
	forbiddenImports: readonly string[],
) {
	const violations = files.flatMap((file) =>
		readImportSpecifiers(file.source)
			.filter((specifier) =>
				forbiddenImports.some(
					(forbidden) => specifier === forbidden || specifier.startsWith(forbidden),
				),
			)
			.map((specifier) => `${file.relativePath} -> ${specifier}`),
	)

	expect(violations).toEqual([])
}

function readWorkspacePackages(workspace: string) {
	const configuredPackages = []
	let inPackagesBlock = false

	for (const line of workspace.split('\n')) {
		const trimmed = line.trim()

		if (trimmed === 'packages:') {
			inPackagesBlock = true
			continue
		}

		if (inPackagesBlock && trimmed.length > 0 && !line.startsWith(' ')) {
			break
		}

		if (inPackagesBlock && trimmed.startsWith('- ')) {
			configuredPackages.push(trimmed.slice(2).replace(/^['"]|['"]$/gu, ''))
		}
	}

	return configuredPackages
}

describe('workspace architecture', () => {
	it('keeps the active workspace intentionally small', async () => {
		const workspace = await readFile(
			path.join(REPO_ROOT, 'pnpm-workspace.yaml'),
			'utf8',
		)
		const configuredPackages = readWorkspacePackages(workspace)

		expect(configuredPackages).toEqual([...CONFIGURED_WORKSPACE_PACKAGES])

		for (const workspacePath of ACTIVE_WORKSPACE_PATHS) {
			expect(
				await pathExists(path.join(workspacePath, 'package.json')),
				workspacePath,
			).toBe(true)
		}
	})

	it('keeps the shared contract layer in packages/core', async () => {
		const manifest = await readWorkspaceManifest('packages/core')

		expect(manifest.name).toBe('@rahrow/core')
		expect(Object.keys(manifest.dependencies ?? {}).sort()).toEqual([
			'@tanstack/pacer',
			'pino',
			'zod',
		])
	})

	it('keeps engine implementations behind the core contract', async () => {
		const manifest = await readWorkspaceManifest('packages/engine')

		expect(manifest.name).toBe('@rahrow/engine')
		expect(Object.keys(manifest.dependencies ?? {})).toEqual(['@rahrow/core'])
	})

	it('keeps shared frontend feature code above core and ui only', async () => {
		const manifest = await readWorkspaceManifest('packages/features')

		expect(manifest.name).toBe('@rahrow/features')
		expect(Object.keys(manifest.dependencies ?? {}).sort()).toEqual([
			'@rahrow/ads',
			'@rahrow/core',
			'@rahrow/static',
			'@rahrow/ui',
			'@tanstack/pacer',
			'@tanstack/react-form',
			'@tanstack/react-pacer',
			'@tanstack/react-query',
			'@tanstack/react-router',
			'@tanstack/react-store',
			'@tanstack/react-virtual',
			'@tanstack/store',
			'i18next',
			'qrcode',
			'react',
			'react-dom',
			'react-i18next',
			'zod',
		])
	})

	it('keeps reusable packages on explicit source export maps', async () => {
		const packageDirectories = await readdir(path.join(REPO_ROOT, 'packages'), {
			withFileTypes: true,
		})
		const manifests = await Promise.all(
			packageDirectories
				.filter((entry) => entry.isDirectory())
				.map(async (entry) => ({
					path: `packages/${entry.name}`,
					manifest: await readWorkspaceManifest(`packages/${entry.name}`),
				})),
		)

		for (const { path: packagePath, manifest } of manifests) {
			expect(manifest.exports, packagePath).toMatchObject({
				'./*': './src/*',
			})
		}
	})

	it('keeps the reusable UI template catalog without Next.js tooling', async () => {
		const tooling = await readWorkspaceManifest('packages/tooling')
		const ui = await readWorkspaceManifest('packages/ui')
		const catalogDependencies = [
			'cmdk',
			'date-fns',
			'embla-carousel-react',
			'input-otp',
			'next-themes',
			'react-day-picker',
			'react-resizable-panels',
			'recharts',
		]
		const catalogTemplates = [
			'calendar',
			'carousel',
			'chart',
			'command',
			'input-otp',
			'resizable',
		]

		expect(tooling.devDependencies).not.toHaveProperty('next')
		expect(await pathExists('packages/tooling/src/nextjs/next.config.ts')).toBe(
			false,
		)
		expect(await pathExists('packages/tooling/src/tsconfig/nextjs.json')).toBe(
			false,
		)
		for (const dependency of catalogDependencies) {
			expect(ui.dependencies, dependency).toHaveProperty(dependency)
		}
		for (const template of catalogTemplates) {
			expect(
				await pathExists(`packages/ui/src/components/ui/${template}.tsx`),
				template,
			).toBe(true)
		}
	})

	it('keeps core free of app platform and framework imports', async () => {
		const coreFiles = productionFiles(await readSourceFiles('packages/core/src'))

		expectNoForbiddenImports(coreFiles, CORE_FORBIDDEN_IMPORTS)
	})

	it('keeps engine implementations behind core contracts', async () => {
		const engineFiles = productionFiles(
			await readSourceFiles('packages/engine/src'),
		)
		const importViolations = engineFiles.flatMap((file) =>
			readImportSpecifiers(file.source)
				.filter(
					(specifier) =>
						!specifier.startsWith('.') &&
						!specifier.startsWith('@rahrow/core/') &&
						!specifier.startsWith('node:'),
				)
				.map((specifier) => `${file.relativePath} -> ${specifier}`),
		)

		expect(importViolations).toEqual([])
	})

	it('keeps shared frontend features out of app and native internals', async () => {
		const featureFiles = productionFiles(
			await readSourceFiles('packages/features/src'),
		)

		expectNoForbiddenImports(featureFiles, FEATURE_FORBIDDEN_IMPORTS)
	})

	it('keeps shared UI primitives below domain and feature packages', async () => {
		const uiFiles = productionFiles(await readSourceFiles('packages/ui/src'))

		expectNoForbiddenImports(uiFiles, UI_FORBIDDEN_IMPORTS)
	})

	it('keeps reusable About metadata at the core product seam', async () => {
		const aboutSpecifier = '@rahrow/core/product/about.ts'
		const consumers = [
			...(await readSourceFiles('apps/cli/src')),
			...(await readSourceFiles('packages/features/src')),
		].filter((file) => file.source.includes('createRahrowAboutManifest'))

		expect(await pathExists('packages/core/src/product/about.ts')).toBe(true)
		expect(await pathExists('packages/core/src/platform/about.ts')).toBe(false)
		expect(consumers.map((file) => file.relativePath).sort()).toEqual([
			'apps/cli/src/commands.ts',
			'packages/features/src/settings/AboutRahRow.tsx',
		])
		for (const consumer of consumers) {
			expect(
				readImportSpecifiers(consumer.source),
				consumer.relativePath,
			).toContain(aboutSpecifier)
		}
	})

	it('keeps desktop and mobile product screens in packages/features', async () => {
		const desktopFiles = productionFiles(
			await readSourceFiles('apps/desktop/src'),
		)
		const mobileFiles = productionFiles(await readSourceFiles('apps/mobile/src'))
		const uniqueScreens = [...desktopFiles, ...mobileFiles].filter((file) => {
			const basename = path.basename(file.relativePath)

			if (file.relativePath.endsWith('.module.css')) {
				return true
			}

			if (!file.relativePath.endsWith('.tsx')) {
				return false
			}

			return basename !== 'app.tsx' && basename !== 'main.tsx'
		})
		const workflowDuplications = [...desktopFiles, ...mobileFiles].flatMap(
			(file) =>
				APP_PROFILE_WORKFLOW_SYMBOLS.filter((symbol) =>
					file.source.includes(symbol),
				).map((symbol) => `${file.relativePath} -> ${symbol}`),
		)
		const desktopApp = desktopFiles.find((file) =>
			file.relativePath.endsWith(`${path.sep}app.tsx`),
		)
		const mobileApp = mobileFiles.find((file) =>
			file.relativePath.endsWith(`${path.sep}app.tsx`),
		)

		expect(uniqueScreens.map((file) => file.relativePath)).toEqual([])
		expect(desktopApp?.source).toContain('AppShell')
		expect(mobileApp?.source).toContain('AppShell')
		expect(desktopApp?.source).toContain('@rahrow/features/app/AppShell.tsx')
		expect(mobileApp?.source).toContain('@rahrow/features/app/AppShell.tsx')
		expect(workflowDuplications).toEqual([])
	})

	it('keeps obsolete scaffolds outside the active workspace', async () => {
		const workspace = await readFile(
			path.join(REPO_ROOT, 'pnpm-workspace.yaml'),
			'utf8',
		)

		for (const excludedPath of EXCLUDED_SCAFFOLD_PATHS) {
			expect(workspace).not.toContain(excludedPath)
		}

		const entries = await readdir(path.join(REPO_ROOT, 'packages'), {
			withFileTypes: true,
		})
		const packageNames = []

		for (const entry of entries) {
			if (!entry.isDirectory()) {
				continue
			}

			const manifestPath = path.join('packages', entry.name)
			if (!(await pathExists(path.join(manifestPath, 'package.json')))) {
				continue
			}

			const manifest = await readWorkspaceManifest(manifestPath)

			if (manifest.name !== undefined) {
				packageNames.push(manifest.name)
			}
		}

		expect(packageNames.sort()).toEqual([...ACTIVE_PACKAGE_NAMES].sort())
	})
})
