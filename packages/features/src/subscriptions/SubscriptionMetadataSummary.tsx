import type { SubscriptionMetadata } from '@rahrow/core/subscription/subscription-import.ts'
import { Progress } from '@rahrow/ui/components/ui/progress.tsx'
import { useAppTranslation } from '../app/app-i18n.tsx'
import { formatRelativeTime } from '../app/relative-time.ts'
import styles from './SubscriptionMetadataSummary.module.css'
import {
	formatSubscriptionDate,
	summarizeSubscriptionUsage,
} from './subscription-metadata-model.ts'

export function SubscriptionMetadataSummary({
	metadata,
}: {
	readonly metadata?: SubscriptionMetadata
}) {
	const { i18n, t } = useAppTranslation()
	const usage = summarizeSubscriptionUsage(
		metadata?.usage,
		i18n.resolvedLanguage,
	)
	const expiresAt = metadata?.usage?.expiresAt

	if (!usage && !expiresAt && !metadata?.supportUrl && !metadata?.profileUrl)
		return null

	return (
		<section
			className={styles.summary}
			aria-label={t('subscriptions.metadata.title')}
		>
			{usage ? (
				<Progress
					className={styles.usage}
					value={usage.percent}
					aria-label={t('subscriptions.metadata.dataUsed')}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={Math.round(usage.percent)}
				>
					<div className={styles.usageMeta}>
						<strong className={styles.usageLabel}>{usage.label}</strong>
						{expiresAt ? (
							<p className={styles.expiry}>
								{t('subscriptions.metadata.expires')}{' '}
								<time
									dateTime={expiresAt}
									title={formatSubscriptionDate(expiresAt, i18n.resolvedLanguage)}
								>
									{formatRelativeTime(expiresAt, Date.now(), i18n.resolvedLanguage)}
								</time>
							</p>
						) : null}
					</div>
				</Progress>
			) : null}
			{!usage && expiresAt ? (
				<p className={styles.expiry}>
					{t('subscriptions.metadata.expires')}{' '}
					<time
						dateTime={expiresAt}
						title={formatSubscriptionDate(expiresAt, i18n.resolvedLanguage)}
					>
						{formatRelativeTime(expiresAt, Date.now(), i18n.resolvedLanguage)}
					</time>
				</p>
			) : null}
			{metadata?.profileUrl || metadata?.supportUrl ? (
				<div className={styles.links}>
					{metadata.profileUrl ? (
						<a href={metadata.profileUrl} target='_blank' rel='noreferrer'>
							{t('subscriptions.metadata.provider')}
						</a>
					) : null}
					{metadata.supportUrl ? (
						<a href={metadata.supportUrl} target='_blank' rel='noreferrer'>
							{t('subscriptions.metadata.support')}
						</a>
					) : null}
				</div>
			) : null}
		</section>
	)
}
