import { access, readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

interface PackageManifest {
	readonly name?: string
	readonly private?: boolean
	readonly dependencies?: Readonly<Record<string, string>>
	readonly devDependencies?: Readonly<Record<string, string>>
}

const REPO_ROOT = process.cwd()
const PRODUCT_PACKAGES = [
	'sdk',
	'lib',
	'ui',
	'auth',
	'billing',
	'analytics',
	'telemetry',
	'notifications',
	'connection',
	'proxy',
	'routing',
	'feature-flags',
	'marketplace',
	'permissions',
	'storage',
	'subscription',
	'updates',
	'types',
	'logger',
	'speedtest',
	'static',
	'clipboard',
	'dns',
	'qr',
	'sharing',
	'geo',
	'parser',
	'protocol',
	'database',
	'benchmark',
	'health',
	'diagnostics',
] as const
const REPOSITORY_TOOLING_PACKAGES = ['tooling'] as const
const RUNTIME_PACKAGES = ['core', 'manager', 'adapters', 'registry'] as const
const RUST_CRATE_PATHS = [
	'crates/core',
	'crates/network/dns',
	'crates/network/routing',
	'crates/network/tun',
	'crates/network/connection',
	'crates/security/crypto',
	'crates/observability/diagnostics',
	'crates/observability/health',
	'crates/ffi',
	'crates/benchmark',
] as const
const FORBIDDEN_RUNTIME_PATHS = ['runtimes', 'crates/runtime-manager'] as const

async function pathExists(relativePath: string) {
	try {
		await access(path.join(REPO_ROOT, relativePath))
		return true
	} catch {
		return false
	}
}

async function readWorkspaceManifest(relativePath: string) {
	const source = await readFile(path.join(REPO_ROOT, relativePath, 'package.json'), 'utf8')
	return JSON.parse(source) as PackageManifest
}

describe('workspace architecture', () => {
	it('keeps product packages flat and single-purpose', async () => {
		const entries = await readdir(path.join(REPO_ROOT, 'packages'), { withFileTypes: true })
		const directories = entries
			.filter((entry) => entry.isDirectory())
			.map((entry) => entry.name)
			.sort()

		expect(directories).toEqual([...PRODUCT_PACKAGES, ...REPOSITORY_TOOLING_PACKAGES].sort())

		for (const directoryName of directories) {
			const manifest = await readWorkspaceManifest(path.join('packages', directoryName))
			expect(manifest.name).toBe(`@rahrow/${directoryName}`)
			expect(manifest.private).toBe(true)
		}
	})

	it('keeps the shared contract layer outside product packages', async () => {
		const manifest = await readWorkspaceManifest('core')

		expect(manifest.name).toBe('@rahrow/core')
		expect(manifest.dependencies).toBeUndefined()
	})

	it('keeps runtime packages isolated behind the manager and registry', async () => {
		for (const runtimePackage of RUNTIME_PACKAGES) {
			const manifest = await readWorkspaceManifest(path.join('runtime', runtimePackage))
			expect(manifest.name).toBe(`@rahrow/runtime-${runtimePackage}`)
		}

		const managerManifest = await readWorkspaceManifest('runtime/manager')
		expect(Object.keys(managerManifest.dependencies ?? {})).toEqual([
			'@rahrow/core',
			'@rahrow/runtime-core',
			'@rahrow/runtime-registry',
		])

		const adaptersManifest = await readWorkspaceManifest('runtime/adapters')
		expect(Object.keys(adaptersManifest.dependencies ?? {})).toEqual(['@rahrow/core'])
	})

	it('uses the layered Rust networking core layout', async () => {
		for (const cratePath of RUST_CRATE_PATHS) {
			expect(await pathExists(path.join(cratePath, 'Cargo.toml')), cratePath).toBe(true)
		}

		for (const obsoletePath of FORBIDDEN_RUNTIME_PATHS) {
			expect(await pathExists(obsoletePath), obsoletePath).toBe(false)
		}
	})
})
