import type { SubscriptionUsage } from '@rahrow/core/subscription/subscription-import.ts'
import { resolveFormattingLocale, translate } from '../app/app-i18n.tsx'

export interface SubscriptionUsageSummary {
	readonly label: string
	readonly percent: number
}

export function summarizeSubscriptionUsage(
	usage: SubscriptionUsage | undefined,
	locale?: string,
): SubscriptionUsageSummary | undefined {
	if (!usage?.totalBytes || usage.totalBytes <= 0) return undefined
	const formattingLocale = resolveFormattingLocale(locale)

	const usedBytes = Math.min(
		usage.totalBytes,
		(usage.uploadBytes ?? 0) + (usage.downloadBytes ?? 0),
	)

	return {
		label: translate('subscriptions.metadata.usage', {
			lng: formattingLocale,
			used: formatBytes(usedBytes, formattingLocale),
			total: formatBytes(usage.totalBytes, formattingLocale),
		}),
		percent: (usedBytes / usage.totalBytes) * 100,
	}
}

export function formatSubscriptionDate(value: string, locale?: string): string {
	const formattingLocale = resolveFormattingLocale(locale)
	const date = new Date(value)
	if (!Number.isFinite(date.getTime()))
		return translate('common.never', { lng: formattingLocale })

	return new Intl.DateTimeFormat(formattingLocale, {
		dateStyle: 'medium',
		timeStyle: 'short',
	}).format(date)
}

function formatBytes(bytes: number, locale?: string): string {
	const formattingLocale = resolveFormattingLocale(locale)
	const usesGigabytes = bytes >= 1024 ** 3
	const value = new Intl.NumberFormat(formattingLocale, {
		maximumFractionDigits: 1,
	}).format(bytes / (usesGigabytes ? 1024 ** 3 : 1024 ** 2))
	const unit = translate(
		usesGigabytes ? 'common.units.gigabyte' : 'common.units.megabyte',
		{ lng: formattingLocale },
	)

	return `${value} ${unit}`
}
