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
import { ButtonGroup } from '@rahrow/ui/components/ui/button-group.tsx'
import { DrawerBody, DrawerFooter } from '@rahrow/ui/components/ui/drawer.tsx'
import { IconAction } from '@rahrow/ui/components/ui/icon-action.tsx'
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
	onChange,
}: {
	readonly value: SortValue
	readonly onChange: (value: SortValue) => void
}) {
	const { t } = useAppTranslation()
	return (
		<ToggleGroup
			className={styles.choiceList}
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
						<ButtonGroup className={styles.iconActions}>
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
								onClick={onEdit}
							/>
							<QuickAction
								destructive
								icon={<DeleteIcon />}
								title={t('profiles.actions.remove')}
								onClick={onDelete}
							/>
						</ButtonGroup>
					) : target.kind === 'subscription' ? (
						<ButtonGroup className={styles.iconActions}>
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
						</ButtonGroup>
					) : (
						<ButtonGroup className={styles.iconActions}>
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
						</ButtonGroup>
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
		<IconAction
			variant={destructive ? 'destructive' : 'outline'}
			size='icon-lg'
			className={styles.quickAction}
			disabled={disabled}
			onClick={onClick}
			label={title}
		>
			{icon}
		</IconAction>
	)
}
