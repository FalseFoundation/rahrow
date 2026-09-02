import { gzipSync } from 'node:zlib'

interface BundleChunk {
	readonly type: 'chunk'
	readonly fileName: string
	readonly name: string
	readonly code: string
	readonly imports: readonly string[]
	readonly dynamicImports: readonly string[]
	readonly isEntry: boolean
	readonly viteMetadata?: {
		readonly importedCss?: ReadonlySet<string>
	}
}

interface BundleAsset {
	readonly type: 'asset'
	readonly fileName: string
	readonly source: string | Uint8Array
}

type BundleItem = BundleChunk | BundleAsset
type Bundle = Readonly<Record<string, BundleItem | unknown>>

export const WEB_BUNDLE_BUDGET = {
	initialJavaScriptGzipBytes: 300 * 1024,
	initialCssGzipBytes: 48 * 1024,
	minimumAsyncJavaScriptChunks: 5,
} as const

export interface WebBundleReport {
	readonly initialJavaScriptFiles: readonly string[]
	readonly asyncJavaScriptFiles: readonly string[]
	readonly initialJavaScriptGzipBytes: number
	readonly initialCssGzipBytes: number
}

function isChunk(item: BundleItem | unknown): item is BundleChunk {
	return Boolean(
		item && typeof item === 'object' && 'type' in item && item.type === 'chunk',
	)
}

function isAsset(item: BundleItem | unknown): item is BundleAsset {
	return Boolean(
		item && typeof item === 'object' && 'type' in item && item.type === 'asset',
	)
}

function gzipBytes(value: string | Uint8Array): number {
	return gzipSync(value).byteLength
}

export function analyzeWebBundle(bundle: Bundle): WebBundleReport {
	const chunks = Object.values(bundle).filter(isChunk)
	const byFileName = new Map(chunks.map((chunk) => [chunk.fileName, chunk]))
	const initial = new Set<string>()
	const queue = chunks.filter((chunk) => chunk.isEntry)

	for (const chunk of queue) {
		if (initial.has(chunk.fileName)) continue
		initial.add(chunk.fileName)
		for (const imported of chunk.imports) {
			const importedChunk = byFileName.get(imported)
			if (importedChunk) queue.push(importedChunk)
		}
	}

	const initialJavaScriptFiles = [...initial].sort()
	const asyncJavaScriptFiles = chunks
		.filter((chunk) => !initial.has(chunk.fileName))
		.map((chunk) => chunk.fileName)
		.sort()
	const initialJavaScriptGzipBytes = initialJavaScriptFiles.reduce(
		(total, fileName) => total + gzipBytes(byFileName.get(fileName)?.code ?? ''),
		0,
	)
	const initialChunks = initialJavaScriptFiles
		.map((fileName) => byFileName.get(fileName))
		.filter((chunk): chunk is BundleChunk => Boolean(chunk))
	const hasCssMetadata = initialChunks.some((chunk) => chunk.viteMetadata)
	const initialCssFiles = new Set(
		initialChunks.flatMap((chunk) => [
			...(chunk.viteMetadata?.importedCss ?? []),
		]),
	)
	const initialCssGzipBytes = Object.values(bundle)
		.filter(isAsset)
		.filter((asset) => asset.fileName.endsWith('.css'))
		.filter((asset) => !hasCssMetadata || initialCssFiles.has(asset.fileName))
		.reduce((total, asset) => total + gzipBytes(asset.source), 0)

	return {
		initialJavaScriptFiles,
		asyncJavaScriptFiles,
		initialJavaScriptGzipBytes,
		initialCssGzipBytes,
	}
}

export function assertWebBundleBudget(bundle: Bundle): WebBundleReport {
	const report = analyzeWebBundle(bundle)
	const failures: string[] = []

	if (
		report.initialJavaScriptGzipBytes >
		WEB_BUNDLE_BUDGET.initialJavaScriptGzipBytes
	) {
		failures.push(
			`initial JavaScript is ${report.initialJavaScriptGzipBytes} gzip bytes (budget: ${WEB_BUNDLE_BUDGET.initialJavaScriptGzipBytes})`,
		)
	}
	if (report.initialCssGzipBytes > WEB_BUNDLE_BUDGET.initialCssGzipBytes) {
		failures.push(
			`initial CSS is ${report.initialCssGzipBytes} gzip bytes (budget: ${WEB_BUNDLE_BUDGET.initialCssGzipBytes})`,
		)
	}
	if (
		report.asyncJavaScriptFiles.length <
		WEB_BUNDLE_BUDGET.minimumAsyncJavaScriptChunks
	) {
		failures.push(
			`only ${report.asyncJavaScriptFiles.length} async JavaScript chunks were emitted (minimum: ${WEB_BUNDLE_BUDGET.minimumAsyncJavaScriptChunks})`,
		)
	}

	if (failures.length > 0) {
		throw new Error(`Web bundle budget failed:\n${failures.join('\n')}`)
	}

	return report
}

export function webManualChunks(id: string): string | undefined {
	const normalized = id.replaceAll('\\', '/')
	if (
		normalized.includes('/packages/features/src/share/') ||
		normalized.includes('/node_modules/.pnpm/qrcode@')
	) {
		return 'share-qr'
	}
	return undefined
}

export function webBundleBudgetPlugin() {
	return {
		name: 'rahrow-web-bundle-budget',
		apply: 'build',
		generateBundle(_options: unknown, bundle: Record<string, unknown>) {
			assertWebBundleBudget(bundle)
		},
	}
}
