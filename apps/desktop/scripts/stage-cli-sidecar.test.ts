import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

import {
	desktopCliSidecarFileName,
	planCliSidecarPaths,
	writeWindowsCliLauncher,
} from './stage-cli-sidecar.ts'

const tempRoots: string[] = []

afterEach(() => {
	for (const root of tempRoots.splice(0)) {
		rmSync(root, { force: true, recursive: true })
	}
})

describe('desktop CLI sidecar staging', () => {
	it('names the CLI sidecar with the Tauri target triple', () => {
		expect(desktopCliSidecarFileName('darwin-arm64')).toBe(
			'rahrow-aarch64-apple-darwin',
		)
		expect(desktopCliSidecarFileName('windows-x64')).toBe(
			'rahrow-x86_64-pc-windows-msvc.exe',
		)
		expect(planCliSidecarPaths('linux-x64').triple).toBe(
			'x86_64-unknown-linux-gnu',
		)
	})

	it('writes a Windows launcher that calls the adjacent CLI sidecar', () => {
		const root = mkdtempSync(join(tmpdir(), 'rahrow-cli-launcher-'))
		tempRoots.push(root)
		const launcher = join(root, 'rahrow.cmd')
		writeWindowsCliLauncher(launcher, 'rahrow-x86_64-pc-windows-msvc.exe')
		expect(readFileSync(launcher, 'utf8')).toContain(
			'"%~dp0rahrow-x86_64-pc-windows-msvc.exe" %*',
		)
	})
})
