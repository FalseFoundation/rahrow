import {
	ChevronIcon,
	CloudDownloadActionIcon,
	InfoIcon,
	LockIcon,
	MoreIcon,
	ServerIcon,
} from '@rahrow/ui/components/rahrow-icons.tsx'
import { Badge } from '@rahrow/ui/components/ui/badge.tsx'
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from '@rahrow/ui/components/ui/context-menu.tsx'
import { IconAction } from '@rahrow/ui/components/ui/icon-action.tsx'
import { ItemMedia } from '@rahrow/ui/components/ui/item.tsx'
import { Skeleton } from '@rahrow/ui/components/ui/skeleton.tsx'
import { Spinner } from '@rahrow/ui/components/ui/spinner.tsx'
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@rahrow/ui/components/ui/tooltip.tsx'
import type { ReactNode } from 'react'
import { useAppTranslation } from '../app/app-i18n.tsx'
import styles from './ConnectionGroup.module.css'

export function ConnectionGroup({
	open,
	onOpenChange,
	title,
	detail,
	kind = 'profiles',
	refreshing = false,
	locked = false,
	onActions,
	children,
}: {
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	readonly title: string
	readonly detail: string
	readonly kind?: ConnectionGroupKind
	readonly refreshing?: boolean
	readonly locked?: boolean
	readonly onActions: () => void
	readonly children: ReactNode
}) {
	return (
		<section className={styles.group}>
			<ConnectionGroupHeader
				open={open}
				onOpenChange={onOpenChange}
				title={title}
				detail={detail}
				kind={kind}
				refreshing={refreshing}
				locked={locked}
				onActions={onActions}
			/>
			{open ? children : null}
		</section>
	)
}

export function ConnectionGroupHeader({
	open,
	onOpenChange,
	title,
	detail,
	kind = 'profiles',
	refreshing = false,
	locked = false,
	onActions,
	headingHidden = false,
	children,
}: {
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	readonly title: string
	readonly detail: string
	readonly kind?: ConnectionGroupKind
	readonly refreshing?: boolean
	readonly locked?: boolean
	readonly onActions: () => void
	readonly headingHidden?: boolean
	readonly children?: ReactNode
}) {
	const { t } = useAppTranslation()
	return (
		<div className={styles.stickySurface}>
			<ContextMenu>
				<ContextMenuTrigger
					className={styles.groupHeading}
					aria-hidden={headingHidden || undefined}
				>
					<div className={styles.groupToggle}>
						<ItemMedia variant='tile'>
							{refreshing ? (
								<Spinner aria-label={`Refreshing ${title}`} />
							) : (
								<ConnectionGroupIcon kind={kind} />
							)}
						</ItemMedia>
						<div className={styles.groupCopy}>
							<h2 title={title}>{title}</h2>
							<span title={detail}>{detail}</span>
						</div>
					</div>
					<div className={styles.groupActions}>
						{locked ? <LockedBadge label={t('profiles.locked')} /> : null}
						<IconAction
							variant='toolbar'
							size='square'
							label={t('profiles.actions.more')}
							tabIndex={headingHidden ? -1 : undefined}
							onClick={onActions}
						>
							<MoreIcon />
						</IconAction>
						<IconAction
							className={styles.groupChevron}
							variant='toolbar'
							size='icon-xs'
							aria-expanded={open}
							label={t(
								open
									? 'profiles.actions.collapseGroup'
									: 'profiles.actions.expandGroup',
							)}
							tabIndex={headingHidden ? -1 : undefined}
							onClick={() => onOpenChange(!open)}
						>
							<ChevronIcon />
						</IconAction>
					</div>
				</ContextMenuTrigger>
				<ContextMenuContent>
					<ContextMenuItem onClick={onActions}>
						{t('profiles.actions.more')}
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>
			{open && children ? (
				<div className={styles.groupSummary}>{children}</div>
			) : null}
		</div>
	)
}

function LockedBadge({ label }: { readonly label: string }) {
	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger render={<Badge variant='outline' tabIndex={0} />}>
					<LockIcon data-icon='inline-start' />
					{label}
				</TooltipTrigger>
				<TooltipContent>{label}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	)
}

export type ConnectionGroupKind = 'profiles' | 'subscription' | 'unavailable'

function ConnectionGroupIcon({ kind }: { readonly kind: ConnectionGroupKind }) {
	if (kind === 'subscription') return <CloudDownloadActionIcon />
	if (kind === 'unavailable') return <InfoIcon />
	return <ServerIcon />
}

export function ConnectionGroupsSkeleton() {
	const { t } = useAppTranslation()
	return (
		<div
			className={styles.groupSkeleton}
			role='status'
			aria-label={t('subscriptions.loading')}
		>
			<div className={styles.groupSkeletonHeader}>
				<Skeleton className={styles.groupSkeletonMedia} />
				<div>
					<Skeleton className={styles.groupSkeletonTitle} />
					<Skeleton className={styles.groupSkeletonDetail} />
				</div>
			</div>
			<Skeleton className={styles.groupSkeletonProfile} />
		</div>
	)
}
