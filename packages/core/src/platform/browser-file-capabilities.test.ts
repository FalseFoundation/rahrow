// @vitest-environment jsdom

import { describe, expect, it, vi } from 'vitest'
import {
	createBrowserFilePick,
	createBrowserFileSave,
} from './browser-file-capabilities.ts'

describe('browser file capabilities', () => {
	it('downloads the requested filename and removes its temporary link', async () => {
		const click = vi
			.spyOn(HTMLAnchorElement.prototype, 'click')
			.mockImplementation(() => {})
		const result = await createBrowserFileSave(document).save({
			filename: 'rahrow-backup.json',
			dataUrl: 'data:application/json,%7B%7D',
		})

		expect(result).toBe('saved')
		expect(click).toHaveBeenCalledOnce()
		expect(document.querySelector('a[download]')).toBeNull()
	})

	it('returns a cancelled result when the browser picker is cancelled', async () => {
		vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function () {
			this.dispatchEvent(new Event('cancel'))
		})

		await expect(
			createBrowserFilePick(document).pick({ accept: ['application/json'] }),
		).resolves.toBeNull()
	})
})
