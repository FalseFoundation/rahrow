import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import { type NativeActionId, nativeActionIds } from './capabilities.ts'
import {
	deriveNativeActionStatus,
	getNativeActionAvailability,
	type NativeActionInventory,
	nativeActionInventory,
	validateNativeActionInventory,
} from './native-action-inventory.ts'

const platforms = [
	'android',
	'ios',
	'macos',
	'linux',
	'windows',
	'cli',
] as const

const repositoryRoot = resolve(
	dirname(fileURLToPath(import.meta.url)),
	'../../../..',
)

describe('native action inventory', () => {
	it('covers every declared native action on every RahRow platform', () => {
		expect(Object.keys(nativeActionInventory).sort()).toEqual(
			[...nativeActionIds].sort(),
		)

		for (const action of Object.values(nativeActionInventory)) {
			expect(Object.keys(action.platforms).sort()).toEqual([...platforms].sort())
		}

		expect(
			validateNativeActionInventory(nativeActionInventory, repositoryReader),
		).toEqual([])
	})

	it('fails closed until inventory and runtime status both advertise support', () => {
		expect(getNativeActionAvailability('qr.camera.preview', 'cli')).toMatchObject(
			{
				available: false,
				reason: expect.any(String),
			},
		)

		expect(getNativeActionAvailability('engine.runtime.process', 'cli')).toEqual({
			available: false,
			reason:
				'Bundled-runtime tests exist, but an installed CLI artifact test is missing',
		})

		const verified = structuredClone(
			nativeActionInventory,
		) as NativeActionInventory
		verified['engine.runtime.process'].platforms.cli = {
			...verified['engine.runtime.process'].platforms.cli,
			state: 'available',
			unavailableReason: undefined,
		}
		expect(
			deriveNativeActionStatus(
				'engine.runtime.process',
				'cli',
				{ supported: false, detail: 'runtime artifact is absent' },
				verified,
			),
		).toMatchObject({ supported: false, detail: 'runtime artifact is absent' })
		expect(
			deriveNativeActionStatus(
				'engine.runtime.process',
				'cli',
				{ supported: true },
				verified,
			),
		).toEqual({
			actionId: 'engine.runtime.process',
			platform: 'cli',
			supported: true,
		})
	})

	it('reports incomplete evidence and orphaned consumers', () => {
		const broken = structuredClone(nativeActionInventory) as NativeActionInventory
		const actionId: NativeActionId = 'clipboard.read'
		broken[actionId] = {
			...broken[actionId],
			consumers: [
				{
					kind: 'repository',
					path: 'packages/features/src/import/useImport.ts',
					seam: 'not-a-real-consumer-seam',
				},
			],
			platforms: {
				...broken[actionId].platforms,
				android: {
					...broken[actionId].platforms.android,
					state: 'available',
					unavailableReason: undefined,
				},
			},
		}

		expect(validateNativeActionInventory(broken, repositoryReader)).toEqual(
			expect.arrayContaining([
				expect.stringContaining('consumer seam does not exist'),
				expect.stringContaining('diagnostics is missing'),
				expect.stringContaining('installed-artifact test is missing'),
			]),
		)
	})

	it('keeps native APIs outside the shared feature package', () => {
		const forbidden = [
			'navigator.',
			'@capacitor/',
			'@tauri-apps/',
			"document.createElement('a')",
			'document.createElement("a")',
		]
		const violations: string[] = []

		for (const file of sourceFiles(
			join(repositoryRoot, 'packages/features/src'),
		)) {
			const source = readFileSync(file, 'utf8')
			for (const token of forbidden) {
				if (source.includes(token)) violations.push(`${file}: ${token}`)
			}
		}

		expect(violations).toEqual([])
	})
})

function sourceFiles(directory: string): readonly string[] {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name)
		if (entry.isDirectory()) return sourceFiles(path)
		return /\.tsx?$/.test(entry.name) ? [path] : []
	})
}

const repositoryReader = {
	readRepositoryFile(path: string): string | undefined {
		const absolutePath = join(repositoryRoot, path)
		return existsSync(absolutePath)
			? readFileSync(absolutePath, 'utf8')
			: undefined
	},
}
