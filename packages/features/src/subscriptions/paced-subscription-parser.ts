import type { ProtocolRegistry } from '@rahrow/core/protocol/connection-protocol.ts'
import {
	decodeSubscriptionLines,
	type ImportInput,
	type ImportReport,
	parseImportedProfilesWithReport,
} from '@rahrow/core/subscription/subscription-import.ts'
import { runAsyncQueue } from '../profiles/paced-profile-work.ts'

const defaultBatchSize = 64

interface ParseBatch {
	readonly index: number
	readonly lineOffset: number
	readonly lines: readonly string[]
}

interface PacedSubscriptionParserOptions {
	readonly batchSize?: number
	readonly wait?: number
	readonly signal?: AbortSignal
	readonly onBatchParsed?: (index: number) => void
}

export async function parseSubscriptionProfilesPaced(
	input: ImportInput,
	registry: ProtocolRegistry,
	{
		batchSize = defaultBatchSize,
		wait = 1,
		signal,
		onBatchParsed,
	}: PacedSubscriptionParserOptions = {},
): Promise<ImportReport> {
	const lines = decodeSubscriptionLines(input.value)
	const safeBatchSize = Math.max(1, Math.floor(batchSize))
	const batches: ParseBatch[] = []

	for (
		let lineOffset = 0;
		lineOffset < lines.length;
		lineOffset += safeBatchSize
	) {
		batches.push({
			index: batches.length,
			lineOffset,
			lines: lines.slice(lineOffset, lineOffset + safeBatchSize),
		})
	}

	const reports = await runAsyncQueue(
		batches,
		async (batch) => {
			const report = parseImportedProfilesWithReport(
				{
					value: batch.lines.join('\n'),
					source: input.source,
				},
				registry,
			)
			onBatchParsed?.(batch.index)
			return {
				profiles: report.profiles,
				issues: report.issues.map((issue) => ({
					...issue,
					index: issue.index + batch.lineOffset,
				})),
			}
		},
		{ concurrency: 1, wait, signal },
	)

	return {
		profiles: reports.flatMap((report) => report.profiles),
		issues: reports.flatMap((report) => report.issues),
	}
}
