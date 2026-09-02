import { describe, expect, it } from 'vitest'

import {
	analyzeWebBundle,
	assertWebBundleBudget,
	WEB_BUNDLE_BUDGET,
	webManualChunks,
} from '../../bundle-policy.ts'

const encoder = new TextEncoder()

function chunk(
	fileName: string,
	code: string,
	options: {
		imports?: string[]
		dynamicImports?: string[]
		isEntry?: boolean
		importedCss?: string[]
	} = {},
) {
	return {
		type: 'chunk' as const,
		fileName,
		name: fileName.replace(/\.js$/, ''),
		code,
		imports: options.imports ?? [],
		dynamicImports: options.dynamicImports ?? [],
		isEntry: options.isEntry ?? false,
		viteMetadata: { importedCss: new Set(options.importedCss ?? []) },
	}
}

describe('web bundle policy', () => {
	it('counts only the static entry graph as initial JavaScript', () => {
		const report = analyzeWebBundle({
			'index.js': chunk('index.js', 'entry', {
				isEntry: true,
				imports: ['vendor.js'],
				dynamicImports: ['profiles.js'],
			}),
			'vendor.js': chunk('vendor.js', 'vendor'),
			'profiles.js': chunk('profiles.js', 'profiles'),
		})

		expect(report.initialJavaScriptFiles).toEqual(['index.js', 'vendor.js'])
		expect(report.asyncJavaScriptFiles).toEqual(['profiles.js'])
	})

	it('excludes stylesheets owned only by async chunks from initial CSS', () => {
		const report = analyzeWebBundle({
			'index.js': chunk('index.js', 'entry', {
				isEntry: true,
				dynamicImports: ['persian.js'],
				importedCss: ['index.css'],
			}),
			'persian.js': chunk('persian.js', 'persian', {
				importedCss: ['persian.css'],
			}),
			'index.css': { type: 'asset', fileName: 'index.css', source: 'body{}' },
			'persian.css': {
				type: 'asset',
				fileName: 'persian.css',
				source: '@font-face{}',
			},
		})

		const initialOnly = analyzeWebBundle({
			'index.js': chunk('index.js', 'entry', {
				isEntry: true,
				importedCss: ['index.css'],
			}),
			'index.css': { type: 'asset', fileName: 'index.css', source: 'body{}' },
		})

		expect(report.initialCssGzipBytes).toBe(initialOnly.initialCssGzipBytes)
	})

	it('rejects an eager artifact beyond the measured gzip budget', () => {
		let state = 0x12345678
		const noisyCode = Array.from(
			{ length: WEB_BUNDLE_BUDGET.initialJavaScriptGzipBytes * 2 },
			() => {
				state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0
				return String.fromCharCode(33 + (state % 90))
			},
		).join('')

		expect(() =>
			assertWebBundleBudget({
				'index.js': chunk('index.js', noisyCode, { isEntry: true }),
			}),
		).toThrow(/initial JavaScript/i)
		expect(encoder.encode(noisyCode).byteLength).toBeGreaterThan(
			WEB_BUNDLE_BUDGET.initialJavaScriptGzipBytes,
		)
	})

	it('keeps share and QR payload code in a named cache boundary', () => {
		expect(
			webManualChunks('/repo/packages/features/src/share/ShareDrawer.tsx'),
		).toBe('share-qr')
		expect(
			webManualChunks('/repo/node_modules/.pnpm/qrcode@1.5.4/index.js'),
		).toBe('share-qr')
	})
})
