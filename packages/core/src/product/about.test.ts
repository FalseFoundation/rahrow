import { describe, expect, it } from 'vitest'

import { createRahrowAboutManifest, isAllowedAboutTarget } from './about.ts'

describe('RahRow About manifest', () => {
	it('publishes only repository-verified product metadata by default', () => {
		const manifest = createRahrowAboutManifest()

		expect(manifest).toMatchObject({
			product: 'RahRow',
			owner: 'False Foundation',
			license: { name: 'MIT License', spdx: 'MIT' },
			supportEmail: 'falsefoundation.co@gmail.com',
		})
		expect(manifest.links).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'source',
					target: 'https://github.com/FalseFoundation/rahrow',
				}),
				expect.objectContaining({
					id: 'organization',
					target: 'https://github.com/FalseFoundation',
				}),
				expect.objectContaining({
					id: 'product-site',
					target: 'https://rahrow.false.foundation/',
				}),
			]),
		)
		expect(manifest.links.map((link) => link.id)).not.toContain('telegram')
		expect(manifest.links.map((link) => link.id)).not.toContain('donation')
	})

	it('accepts optional contact destinations only from their allowlisted providers', () => {
		const manifest = createRahrowAboutManifest({
			telegramUrl: 'https://t.me/rahrow_verified',
			donationUrl: 'https://buymeacoffee.com/rahrow_verified',
		})

		expect(manifest.links).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ id: 'telegram' }),
				expect.objectContaining({ id: 'donation' }),
			]),
		)
		expect(
			createRahrowAboutManifest({
				telegramUrl: 'https://example.com/not-telegram',
				donationUrl: 'javascript:alert(1)',
			}).links.map((link) => link.id),
		).not.toEqual(expect.arrayContaining(['telegram', 'donation']))
	})

	it('rejects credentials, fragments, insecure schemes, and lookalike hosts', () => {
		expect(
			isAllowedAboutTarget('https://github.com/FalseFoundation/rahrow'),
		).toBe(true)
		expect(isAllowedAboutTarget('mailto:falsefoundation.co@gmail.com')).toBe(true)
		expect(isAllowedAboutTarget('http://github.com/FalseFoundation/rahrow')).toBe(
			false,
		)
		expect(isAllowedAboutTarget('https://github.com.evil.test/rahrow')).toBe(
			false,
		)
		expect(isAllowedAboutTarget('https://user@github.com/FalseFoundation')).toBe(
			false,
		)
		expect(isAllowedAboutTarget('https://github.com/FalseFoundation#token')).toBe(
			false,
		)
	})
})
