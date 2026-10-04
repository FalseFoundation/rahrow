import type { Subscription } from '@rahrow/core/subscription/subscription-import.ts'
import {
	CleanActionIcon,
	DeleteIcon,
	DuplicateIcon,
	EditIcon,
	RefreshActionIcon,
	ShareIcon,
	TestIcon,
} from '@rahrow/ui/components/rahrow-icons.tsx'
import { Button } from '@rahrow/ui/components/ui/button.tsx'
import { DrawerBody, DrawerFooter } from '@rahrow/ui/components/ui/drawer.tsx'
import { toast } from '@rahrow/ui/components/ui/sonner.tsx'
import {
	ToggleGroup,
	ToggleGroupItem,
} from '@rahrow/ui/components/ui/toggle-group.tsx'
import type { ReactNode } from 'react'
import { useAppTranslation } from '../app/app-i18n.tsx'
import styles from './ConnectionActionDrawers.module.css'
import type { ActionTarget, SortValue } from './profile-library-model.ts'
import type { useProfileManagement } from './useProfileManagement.ts'

export function ConnectionSortDrawer({
	value,
	hideUnreachable,
	onChange,
	onHideUnreachableChange,
}: {
	readonly value: SortValue
	readonly hideUnreachable: boolean
	readonly onChange: (value: SortValue) => void
	readonly onHideUnreachableChange: (hideUnreachable: boolean) => void
}) {
	const { t } = useAppTranslation()
	return (
		<div className={styles.choiceList}>
			<ToggleGroup
				orientation='vertical'
				value={[value]}
				onValueChange={(values) => {
					const next = values.at(-1) as typeof value | undefined
					if (next) onChange(next)
				}}
			>
				<ToggleGroupItem value='default'>
					{t('profiles.sort.default')}
				</ToggleGroupItem>
				<ToggleGroupItem value='name'>{t('profiles.sort.name')}</ToggleGroupItem>
				<ToggleGroupItem value='protocol'>
					{t('profiles.sort.protocol')}
				</ToggleGroupItem>
				<ToggleGroupItem value='endpoint'>
					{t('profiles.sort.endpoint')}
				</ToggleGroupItem>
				<ToggleGroupItem value='speed-test'>
					{t('profiles.sort.latency')}
				</ToggleGroupItem>
			</ToggleGroup>
			<Button
				type='button'
				variant={hideUnreachable ? 'default' : 'outline'}
				className={styles.hideUnreachable}
				onClick={() => onHideUnreachableChange(!hideUnreachable)}
			>
				{hideUnreachable
					? t('profiles.sort.showUnreachable')
					: t('profiles.sort.hideUnreachable')}
			</Button>
		</div>
	)
}

export function ConnectionActionsDrawer({
	target,
	actions,
	onRefreshSubscription,
	onExport,
	onSpeedTest,
	onDelete,
	onCleanup,
	onEdit,
	onClose,
}: {
	readonly target: ActionTarget
	readonly actions: ReturnType<typeof useProfileManagement>['actions']
	readonly onRefreshSubscription: (subscription: Subscription) => Promise<void>
	readonly onExport: () => void
	readonly onSpeedTest: () => void
	readonly onDelete: () => void
	readonly onCleanup: () => void
	readonly onEdit: () => void
	readonly onClose: () => void
}) {
	const { t } = useAppTranslation()
	return (
		<>
			<DrawerBody className={styles.actionScroll}>
				<div className={styles.actionList}>
					{target.kind === 'profile' ? (
						<div className={styles.iconActions} data-count='4'>
							<QuickAction
								icon={<DuplicateIcon />}
								title={t('profiles.actions.duplicate')}
								onClick={() => {
									onClose()
									void actions
										.duplicateProfile(target.profile)
										.then(() => toast.success(t('profiles.toasts.duplicated')))
										.catch(() => toast.error(t('profiles.toasts.duplicateFailed')))
								}}
							/>
							<QuickAction
								icon={<ShareIcon />}
								title={t('profiles.actions.share')}
								onClick={onExport}
							/>
							<QuickAction
								icon={<EditIcon />}
								title={t('profiles.actions.edit')}
								disabled={target.locked}
								onClick={onEdit}
							/>
							<QuickAction
								destructive
								disabled={target.locked}
								icon={<DeleteIcon />}
								title={t('profiles.actions.remove')}
								onClick={onDelete}
							/>
						</div>
					) : target.kind === 'subscription' ? (
						<div className={styles.iconActions} data-count='5'>
							<QuickAction
								icon={<CleanActionIcon />}
								title={t('profiles.actions.cleanup')}
								onClick={onCleanup}
							/>
							<QuickAction
								icon={<ShareIcon />}
								title={t('profiles.actions.share')}
								onClick={onExport}
							/>
							<QuickAction
								icon={<EditIcon />}
								title={t('profiles.actions.edit')}
								disabled={target.subscription.locked}
								onClick={onEdit}
							/>
							<QuickAction
								icon={<RefreshActionIcon />}
								title={t('profiles.actions.reload')}
								onClick={() => {
									void onRefreshSubscription(target.subscription)
									onClose()
								}}
							/>
							<QuickAction
								destructive
								disabled={target.subscription.locked}
								icon={<DeleteIcon />}
								title={t('profiles.actions.remove')}
								onClick={onDelete}
							/>
						</div>
					) : (
						<div className={styles.iconActions} data-count='3'>
							<QuickAction
								icon={<CleanActionIcon />}
								title={t('profiles.actions.cleanup')}
								onClick={onCleanup}
							/>
							<QuickAction
								icon={<ShareIcon />}
								title={t('profiles.actions.shareAll')}
								onClick={onExport}
							/>
							<QuickAction
								destructive
								icon={<DeleteIcon />}
								title={t('profiles.actions.removeAll')}
								onClick={onDelete}
							/>
						</div>
					)}
				</div>
			</DrawerBody>
			<DrawerFooter className={styles.actionFooter}>
				<Button className={styles.primaryAction} onClick={onSpeedTest}>
					<TestIcon data-icon='inline-start' />
					{target.kind === 'profile'
						? t('profiles.actions.testLatency')
						: t('profiles.actions.testAll')}
				</Button>
			</DrawerFooter>
		</>
	)
}

function QuickAction({
	icon,
	title,
	onClick,
	disabled = false,
	destructive = false,
}: {
	icon: ReactNode
	title: string
	onClick: () => void
	disabled?: boolean
	destructive?: boolean
}) {
	return (
		<Button
			variant={destructive ? 'destructive' : 'outline'}
			className={styles.quickAction}
			disabled={disabled}
			onClick={onClick}
			aria-label={title}
		>
			{icon}
			<span>{title}</span>
		</Button>
	)
}
