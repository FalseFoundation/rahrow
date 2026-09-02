import { resolveFormattingLocale, translate } from './app-i18n.tsx'

export function formatRelativeTime(
	value: string,
	now = Date.now(),
	locale?: string,
): string {
	const formattingLocale = resolveFormattingLocale(locale)
	const timestamp = new Date(value).getTime()
	if (!Number.isFinite(timestamp))
		return translate('common.never', { lng: formattingLocale })

	const seconds = Math.round((timestamp - now) / 1000)
	const absoluteSeconds = Math.abs(seconds)
	if (absoluteSeconds < 45)
		return seconds > 0
			? translate('common.verySoon', { lng: formattingLocale })
			: translate('common.justNow', { lng: formattingLocale })

	const units = [
		{ unit: 'year', seconds: 31_536_000 },
		{ unit: 'month', seconds: 2_592_000 },
		{ unit: 'week', seconds: 604_800 },
		{ unit: 'day', seconds: 86_400 },
		{ unit: 'hour', seconds: 3_600 },
		{ unit: 'minute', seconds: 60 },
	] as const
	const scale = units.find(
		({ seconds: unitSeconds }) => absoluteSeconds >= unitSeconds,
	)
	if (!scale) return translate('common.justNow', { lng: formattingLocale })

	const amount = Math.round(seconds / scale.seconds)
	const relativeTime = new Intl.RelativeTimeFormat(formattingLocale, {
		numeric: 'always',
	})
	const formatted = relativeTime.format(amount, scale.unit)
	return amount < 0 && scale.unit !== 'day' ? `${formatted}` : formatted
}
