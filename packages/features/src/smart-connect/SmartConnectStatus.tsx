import { Button } from '@rahrow/ui/components/ui/button.tsx'
import {
	Marker,
	MarkerContent,
	MarkerIcon,
} from '@rahrow/ui/components/ui/marker.tsx'
import { Progress } from '@rahrow/ui/components/ui/progress.tsx'
import { Spinner } from '@rahrow/ui/components/ui/spinner.tsx'

import { resolveFormattingLocale, useAppTranslation } from '../app/app-i18n.tsx'
import styles from './SmartConnectStatus.module.css'
import type { useSmartConnect } from './useSmartConnect.ts'

type SmartConnectController = ReturnType<typeof useSmartConnect>

export function SmartConnectStatus({
	state,
	actions,
	compact = false,
}: SmartConnectController & { readonly compact?: boolean }) {
	const { t } = useAppTranslation()
	if (
		state.status === 'unavailable' ||
		state.status === 'loading' ||
		(!state.enabled && state.status === 'idle')
	) {
		return null
	}

	const presentation = smartConnectPresentation(state, t)
	const progress =
		state.progress?.phase === 'testing' && state.progress.total > 0
			? (state.progress.completed / state.progress.total) * 100
			: state.status === 'success'
				? 100
				: undefined

	return (
		<aside
			className={styles.panel}
			data-compact={compact || undefined}
			role={state.status === 'error' ? 'alert' : 'status'}
			aria-live={state.status === 'error' ? 'assertive' : 'polite'}
			aria-atomic='true'
		>
			<div className={styles.header}>
				<div className={styles.copy}>
					<strong>{presentation.title}</strong>
					<span>{presentation.description}</span>
				</div>
				{state.status === 'running' ? (
					<Marker className={styles.activity}>
						<MarkerIcon>
							<Spinner />
						</MarkerIcon>
						<MarkerContent className='shimmer'>
							{t('smartConnect.action')}
						</MarkerContent>
					</Marker>
				) : null}
			</div>

			{progress !== undefined ? (
				<Progress
					className={styles.meter}
					value={progress}
					aria-label={t('smartConnect.progressLabel')}
				/>
			) : null}

			{state.nextRunAt && state.status !== 'running' ? (
				<small className={styles.schedule}>
					{t('smartConnect.nextRun', {
						time: formatNextRun(state.nextRunAt),
					})}
				</small>
			) : null}

			<div className={styles.actions}>
				{state.status === 'running' ? (
					<Button type='button' variant='outline' size='sm' onClick={actions.cancel}>
						{t('smartConnect.cancel')}
					</Button>
				) : (
					<Button
						type='button'
						variant='outline'
						size='sm'
						onClick={() => void actions.run()}
					>
						{t('smartConnect.checkNow')}
					</Button>
				)}
				{state.enabled ? (
					<Button
						type='button'
						variant='ghost'
						size='sm'
						disabled={state.status === 'running'}
						onClick={() => void actions.stop()}
					>
						{t('smartConnect.turnOff')}
					</Button>
				) : null}
			</div>
		</aside>
	)
}

function smartConnectPresentation(
	state: SmartConnectController['state'],
	t: ReturnType<typeof useAppTranslation>['t'],
) {
	const progress = state.progress
	if (state.status === 'running' && progress) {
		switch (progress.phase) {
			case 'queued':
				return {
					title: t('smartConnect.queuedTitle'),
					description: t('smartConnect.queued', { count: progress.total }),
				}
			case 'testing':
				return {
					title: t('smartConnect.testingTitle'),
					description: t('smartConnect.testing', {
						active: progress.active,
						completed: progress.completed,
						queued: Math.max(0, progress.total - progress.started),
						total: progress.total,
					}),
				}
			case 'selecting':
				return {
					title: t('smartConnect.selectingTitle'),
					description: t('smartConnect.selecting', { count: progress.total }),
				}
			case 'switching':
				return {
					title: t('smartConnect.switchingTitle'),
					description: t('smartConnect.switching', {
						latency: progress.winnerLatencyMs,
					}),
				}
			case 'restoring':
				return {
					title: t('smartConnect.restoringTitle'),
					description: t('smartConnect.restoring'),
				}
		}
	}

	if (state.status === 'error') {
		return {
			title: t('smartConnect.errorTitle'),
			description: t('smartConnect.error'),
		}
	}
	if (state.outcome === 'no-reachable-profile') {
		return {
			title: t('smartConnect.noReachableTitle'),
			description: t('smartConnect.noReachable'),
		}
	}
	if (state.outcome === 'stale-winner') {
		return {
			title: t('smartConnect.staleTitle'),
			description: t('smartConnect.stale'),
		}
	}
	return {
		title:
			state.outcome === 'unchanged'
				? t('smartConnect.unchangedTitle')
				: t('smartConnect.successTitle'),
		description: t('smartConnect.result', {
			count: state.probed ?? 0,
			latency: state.winnerLatencyMs ?? 0,
		}),
	}
}

function formatNextRun(value: string): string {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return value
	return new Intl.DateTimeFormat(resolveFormattingLocale(), {
		hour: '2-digit',
		minute: '2-digit',
	}).format(date)
}
