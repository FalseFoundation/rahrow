import type { AdGateController } from '@rahrow/ads/ad-gate.ts'
import type { AdProvider } from '@rahrow/ads/ad-provider.ts'
import { CloseIcon } from '@rahrow/ui/components/rahrow-icons.tsx'
import { Button } from '@rahrow/ui/components/ui/button.tsx'
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from '@rahrow/ui/components/ui/drawer.tsx'
import { IconAction } from '@rahrow/ui/components/ui/icon-action.tsx'
import {
	Progress,
	ProgressLabel,
	ProgressValue,
} from '@rahrow/ui/components/ui/progress.tsx'
import { Skeleton } from '@rahrow/ui/components/ui/skeleton.tsx'

import { useAppTranslation } from '../app/app-i18n.tsx'
import styles from './AdGateOutlet.module.css'
import { useAdGate } from './useAdGate.ts'

export function AdGateOutlet({
	gate,
	provider,
}: {
	readonly gate: AdGateController
	readonly provider: AdProvider
}) {
	const { t } = useAppTranslation()
	const state = useAdGate(gate, provider)
	const remainingSeconds = state.active
		? Math.ceil(state.active.remainingMs / 1_000)
		: null
	const progress = state.active
		? 100 -
			(state.active.remainingMs / state.active.obligation.minimumVisibleMs) * 100
		: 0
	const actionUrl = safeActionUrl(state.active?.creative.actionUrl)

	return (
		<Drawer
			open={state.isOpen}
			onOpenChange={(open) => {
				if (!open && state.active?.canClose) void state.close()
			}}
			disablePointerDismissal
			showSwipeHandle={true}
		>
			<DrawerContent variant='app' className={styles.drawer}>
				<DrawerHeader className={styles.visuallyHidden}>
					<DrawerTitle>{t('ads.title')}</DrawerTitle>
					<DrawerDescription>{t('ads.media')}</DrawerDescription>
				</DrawerHeader>
				{state.active?.canClose ? (
					<IconAction
						className={styles.closeButton}
						variant='toolbar'
						size='square'
						label={t('ads.close')}
						render={<DrawerClose />}
					>
						<CloseIcon aria-hidden='true' />
					</IconAction>
				) : null}

				<div className={styles.body}>
					<Skeleton
						className={styles.mediaPlaceholder}
						role='img'
						aria-label={t('ads.placeholder')}
					/>
				</div>

				<DrawerFooter className={styles.footer}>
					{state.active ? (
						<Progress
							className={styles.progress}
							value={Math.min(100, Math.max(0, progress))}
						>
							<ProgressLabel>{t('ads.remaining')}</ProgressLabel>
							<ProgressValue>
								{() =>
									state.active?.canClose
										? t('common.ready')
										: t('ads.seconds', { count: remainingSeconds })
								}
							</ProgressValue>
						</Progress>
					) : null}
					{(state.active?.creative.actionLabel && actionUrl) ||
					provider.openPrivacyOptions ? (
						<div className={styles.footerActions}>
							{state.active?.creative.actionLabel && actionUrl ? (
								<Button
									variant='secondary'
									render={
										<a href={actionUrl} target='_blank' rel='noopener noreferrer' />
									}
								>
									{state.active.creative.actionLabel}
								</Button>
							) : null}
							{provider.openPrivacyOptions ? (
								<Button
									type='button'
									variant='ghost'
									onClick={() => void provider.openPrivacyOptions?.()}
								>
									{t('ads.privacy')}
								</Button>
							) : null}
						</div>
					) : null}
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	)
}

function safeActionUrl(value: string | undefined): string | null {
	if (!value) return null
	try {
		const url = new URL(value)
		return url.protocol === 'https:' ? url.href : null
	} catch {
		return null
	}
}
