import {
	CleanActionIcon,
	CloseIcon,
	InfoIcon,
} from '@rahrow/ui/components/rahrow-icons.tsx'
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from '@rahrow/ui/components/ui/alert.tsx'
import { Button } from '@rahrow/ui/components/ui/button.tsx'
import { Checkbox } from '@rahrow/ui/components/ui/checkbox.tsx'
import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from '@rahrow/ui/components/ui/drawer.tsx'
import { IconAction } from '@rahrow/ui/components/ui/icon-action.tsx'
import { Progress } from '@rahrow/ui/components/ui/progress.tsx'
import { useAppTranslation } from '../app/app-i18n.tsx'
import styles from './ConnectionCleanupDrawer.module.css'
import type { useConnectionCleanup } from './useConnectionCleanup.ts'

export function ConnectionCleanupDrawer({
	cleanup,
}: {
	readonly cleanup: ReturnType<typeof useConnectionCleanup>
}) {
	const { t } = useAppTranslation()
	const { state, actions } = cleanup
	const report = state.report
	const removalCount =
		(report?.removeProfileIds.size ?? 0) +
		(report?.removeSubscriptionIds.size ?? 0)
	const percent = state.progress.total
		? (state.progress.completed / state.progress.total) * 100
		: 0
	const announcementStep = Math.max(1, Math.ceil(state.progress.total / 10))
	const announcedCompleted = Math.min(
		state.progress.total,
		Math.floor(state.progress.completed / announcementStep) * announcementStep,
	)
	const hasSingleFooterAction =
		state.phase === 'scanning' ||
		state.phase === 'committing' ||
		state.phase === 'complete' ||
		(state.phase === 'review' && removalCount === 0)

	return (
		<Drawer
			open={state.open}
			disablePointerDismissal={state.dismissalLocked}
			onOpenChange={(open, eventDetails) => {
				if (!open && state.dismissalLocked) {
					eventDetails.cancel()
					return
				}
				if (!open) actions.closeDrawer()
			}}
			showSwipeHandle={!state.dismissalLocked}
		>
			<DrawerContent variant='app' scrollable>
				<DrawerHeader className={styles.header}>
					<div>
						<DrawerTitle>{t('profiles.cleanup.title')}</DrawerTitle>
						<DrawerDescription>
							{state.scope.kind === 'all'
								? t('profiles.cleanup.description')
								: state.scope.kind === 'local'
									? t('profiles.cleanup.localDescription')
									: t('profiles.cleanup.subscriptionDescription')}
						</DrawerDescription>
					</div>
					<IconAction
						variant='toolbar'
						size='square'
						disabled={state.dismissalLocked}
						label={t('common.closeDrawer')}
						onClick={actions.closeDrawer}
					>
						<CloseIcon />
					</IconAction>
				</DrawerHeader>

				<DrawerBody className={styles.body}>
					{state.phase === 'ready' ? (
						<>
							<p className={styles.intro}>{t('profiles.cleanup.ready')}</p>
							<CleanupFacts
								profileCount={state.scopeProfileCount}
								subscriptionCount={state.scopeSubscriptionCount}
							/>
							<Alert>
								<InfoIcon />
								<AlertTitle>{t('profiles.cleanup.energyTitle')}</AlertTitle>
								<AlertDescription>
									{t('profiles.cleanup.energyDescription')}
								</AlertDescription>
							</Alert>
						</>
					) : null}

					{state.phase === 'scanning' ? (
						<>
							<div className={styles.progressCopy}>
								<strong>
									{state.progress.phase === 'profiles'
										? t('profiles.cleanup.checkingConnections')
										: t('profiles.cleanup.checkingSubscriptions')}
								</strong>
								<span>
									{t('profiles.cleanup.progress', {
										completed: state.progress.completed,
										total: state.progress.total,
									})}
								</span>
							</div>
							<span className={styles.visuallyHidden} role='status' aria-live='polite'>
								{t('profiles.cleanup.progress', {
									completed: announcedCompleted,
									total: state.progress.total,
								})}
							</span>
							<Progress
								className={styles.meter}
								value={percent}
								aria-label={t('profiles.cleanup.progressLabel')}
							/>
							<p className={styles.intro}>{t('profiles.cleanup.scanningNote')}</p>
						</>
					) : null}

					{state.phase === 'review' && report ? (
						<>
							<CleanupReviewFacts report={report} />
							{removalCount > 0 ? (
								<Alert variant='destructive'>
									<CleanActionIcon />
									<AlertTitle>{t('profiles.cleanup.reviewTitle')}</AlertTitle>
									<AlertDescription>
										{t('profiles.cleanup.irreversible')}
									</AlertDescription>
								</Alert>
							) : report.skippedLockedCount === 0 ? (
								<Alert>
									<InfoIcon />
									<AlertTitle>{t('profiles.cleanup.nothingTitle')}</AlertTitle>
									<AlertDescription>
										{t('profiles.cleanup.nothingDescription')}
									</AlertDescription>
								</Alert>
							) : null}
							{report.skippedLockedCount > 0 ? (
								<Alert>
									<InfoIcon />
									<AlertTitle>{t('profiles.cleanup.lockedTitle')}</AlertTitle>
									<AlertDescription>
										{t('profiles.cleanup.lockedDescription', {
											count: report.skippedLockedCount,
										})}
									</AlertDescription>
								</Alert>
							) : null}
							{removalCount > 0 ? (
								<div className={styles.confirmation}>
									<Checkbox
										id='confirm-connection-cleanup'
										checked={state.confirmed}
										onCheckedChange={(checked) => actions.setConfirmed(checked === true)}
									/>
									<label htmlFor='confirm-connection-cleanup'>
										{t('profiles.cleanup.confirmation')}
									</label>
								</div>
							) : null}
						</>
					) : null}

					{state.phase === 'committing' ? (
						<div role='status' aria-live='polite'>
							<strong>{t('profiles.cleanup.removing')}</strong>
							<p className={styles.intro}>{t('profiles.cleanup.keepOpen')}</p>
						</div>
					) : null}

					{state.phase === 'complete' && report ? (
						<Alert>
							<InfoIcon />
							<AlertTitle>{t('profiles.cleanup.completeTitle')}</AlertTitle>
							<AlertDescription>
								{t('profiles.cleanup.completeDescription', {
									removed:
										report.removeProfileIds.size + report.removeSubscriptionIds.size,
									skipped: report.skippedLockedCount,
								})}
							</AlertDescription>
						</Alert>
					) : null}

					{state.phase === 'canceled' ? (
						<Alert>
							<InfoIcon />
							<AlertTitle>{t('profiles.cleanup.canceledTitle')}</AlertTitle>
							<AlertDescription>
								{t('profiles.cleanup.canceledDescription')}
							</AlertDescription>
						</Alert>
					) : null}

					{state.phase === 'error' ? (
						<Alert variant='destructive'>
							<InfoIcon />
							<AlertTitle>{t('profiles.cleanup.errorTitle')}</AlertTitle>
							<AlertDescription>
								{t(
									state.error === 'commit-partial'
										? 'profiles.cleanup.errorPartialRecovery'
										: state.error === 'commit-restored'
											? 'profiles.cleanup.errorRestored'
											: state.error === 'changed'
												? 'profiles.cleanup.errorChanged'
												: 'profiles.cleanup.errorDescription',
								)}
							</AlertDescription>
						</Alert>
					) : null}
				</DrawerBody>

				<DrawerFooter
					className={`${styles.footer} ${
						hasSingleFooterAction ? styles.footerSingle : ''
					}`}
				>
					{state.phase === 'ready' ? (
						<>
							<Button variant='outline' onClick={actions.closeDrawer}>
								{t('common.cancel')}
							</Button>
							<Button
								disabled={
									!state.canCommitAtomically ||
									state.scopeProfileCount + state.scopeSubscriptionCount === 0
								}
								onClick={() => void actions.startScan()}
							>
								{t('profiles.cleanup.checkAll')}
							</Button>
						</>
					) : null}
					{state.phase === 'scanning' ? (
						<Button variant='outline' onClick={actions.cancelScan}>
							{t('profiles.cleanup.cancelCheck')}
						</Button>
					) : null}
					{state.phase === 'review' ? (
						<>
							<Button variant='outline' onClick={actions.closeDrawer}>
								{removalCount > 0 ? t('common.cancel') : t('common.close')}
							</Button>
							{removalCount > 0 ? (
								<Button
									variant='destructive'
									disabled={!state.confirmed}
									onClick={() => void actions.confirmCleanup()}
								>
									{t('profiles.cleanup.removeFailed', { count: removalCount })}
								</Button>
							) : null}
						</>
					) : null}
					{state.phase === 'committing' ? (
						<Button disabled>{t('profiles.cleanup.removing')}</Button>
					) : null}
					{state.phase === 'complete' ? (
						<Button onClick={actions.closeDrawer}>{t('common.close')}</Button>
					) : null}
					{state.phase === 'canceled' || state.phase === 'error' ? (
						<>
							<Button variant='outline' onClick={actions.closeDrawer}>
								{t('common.cancel')}
							</Button>
							<Button onClick={() => void actions.startScan()}>
								{t('common.tryAgain')}
							</Button>
						</>
					) : null}
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	)
}

function CleanupFacts({
	profileCount,
	subscriptionCount,
}: {
	readonly profileCount: number
	readonly subscriptionCount: number
}) {
	const { t } = useAppTranslation()
	return (
		<dl className={styles.facts}>
			<Fact label={t('profiles.cleanup.savedConnections')} value={profileCount} />
			<Fact
				label={t('profiles.cleanup.subscriptionSources')}
				value={subscriptionCount}
			/>
		</dl>
	)
}

function CleanupReviewFacts({
	report,
}: {
	readonly report: NonNullable<
		ReturnType<typeof useConnectionCleanup>['state']['report']
	>
}) {
	const { t } = useAppTranslation()
	return (
		<dl className={styles.facts}>
			<Fact
				label={t('profiles.cleanup.connectionsKept')}
				value={report.keptProfileCount}
			/>
			<Fact
				label={t('profiles.cleanup.connectionsRemoved')}
				value={report.removeProfileIds.size}
			/>
			<Fact
				label={t('profiles.cleanup.subscriptionsKept')}
				value={report.keptSubscriptionCount}
			/>
			<Fact
				label={t('profiles.cleanup.subscriptionsRemoved')}
				value={report.removeSubscriptionIds.size}
			/>
			<Fact
				label={t('profiles.cleanup.lockedSkipped')}
				value={report.skippedLockedCount}
			/>
		</dl>
	)
}

function Fact({
	label,
	value,
}: {
	readonly label: string
	readonly value: number
}) {
	return (
		<div className={styles.fact}>
			<dt>{label}</dt>
			<dd>{value}</dd>
		</div>
	)
}
