import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const desktopRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const tauriRoot = join(desktopRoot, 'src-tauri')

const requiredIcons = [
	'icons/32x32.png',
	'icons/128x128.png',
	'icons/256x256.png',
	'icons/icon.png',
	'icons/icon.icns',
	'icons/icon.ico',
] as const

describe('desktop app icon', () => {
	it('ships the official RahRow mark in the Linux bundle and window icon set', () => {
		const config = JSON.parse(
			readFileSync(join(tauriRoot, 'tauri.conf.json'), 'utf8'),
		) as { bundle?: { icon?: string[] } }

		expect(config.bundle?.icon).toEqual([...requiredIcons])

		for (const icon of requiredIcons) {
			if (!icon.endsWith('.png')) {
				expect(readFileSync(join(tauriRoot, icon)).byteLength).toBeGreaterThan(0)
				continue
			}
			const png = readFileSync(join(tauriRoot, icon))
			expect(png.subarray(0, 8)).toEqual(
				Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
			)
			expect(png.readUInt32BE(16)).toBeGreaterThanOrEqual(32)
			expect(countBrightPngPixels(png)).toBeGreaterThan(0)
		}
	})
})

function countBrightPngPixels(png: Buffer) {
	let count = 0
	for (let index = 0; index < png.byteLength - 2; index += 1) {
		if (png[index] > 200 && png[index + 1] > 200 && png[index + 2] > 200) {
			count += 1
		}
	}
	return count
}
