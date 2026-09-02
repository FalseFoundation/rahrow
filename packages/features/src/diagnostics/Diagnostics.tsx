import {
	ActivityIcon,
	CopyIcon,
	RefreshActionIcon,
	ServerIcon,
} from '@rahrow/ui/components/rahrow-icons.tsx'
import { Badge } from '@rahrow/ui/components/ui/badge.tsx'
import { Heading } from '@rahrow/ui/components/ui/heading.tsx'
import { IconAction } from '@rahrow/ui/components/ui/icon-action.tsx'
import {
	Item,
	ItemActions,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from '@rahrow/ui/components/ui/item.tsx'
import { toast } from '@rahrow/ui/components/ui/sonner.tsx'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@rahrow/ui/components/ui/tabs.tsx'
import { Text } from '@rahrow/ui/components/ui/text.tsx'
import { type ReactNode, useEffect } from 'react'
import {
	advertisingDiagnosticDetail,
	advertisingDiagnosticStatus,
	createAdvertisingDiagnosticPayload,
} from '../ads/ad-diagnostics.ts'
import { translate, useAppTranslation } from '../app/app-i18n.tsx'
import type { DiagnosticsSnapshot } from '../app/runtime.tsx'
import { Logs } from '../logs/Logs.tsx'
import styles from './Diagnostics.module.css'
import {
	capabilityDiagnosticDetail,
	createCapabilityDiagnosticPayload,
	createEngineDiagnosticPayload,
	engineDiagnosticDetail,
	engineDiagnosticStatus,
} from './diagnostic-details.ts'
import { useDiagnostics } from './useDiagnostics.ts'

export function Diagnostics() {
	const { t } = useAppTranslation()
	const { state, actions } = useDiagnostics()
	const readiness = readinessSummary(state)
	const engineDetail = engineDiagnosticDetail(state.snapshot)
	const engineStatus = engineDiagnosticStatus(state.snapshot)
	const advertisingStatus = advertisingDiagnosticStatus(state.advertising)

	useEffect(() => {
		if (!state.copyFeedback) return
		if (state.copyFeedback.kind === 'success')
			toast.success(state.copyFeedback.message)
		else toast.error(state.copyFeedback.message)
	}, [state.copyFeedback])

	return (
		<Tabs className={styles.content} defaultValue='availability'>
			<TabsList className={styles.tabs} aria-label={t('diagnostics.view')}>
				<TabsTrigger value='availability'>
					{t('diagnostics.availability')}
				</TabsTrigger>
				<TabsTrigger value='logs'>{t('diagnostics.logs')}</TabsTrigger>
			</TabsList>
			<TabsContent
				value='availability'
				className={styles.tabContent}
				aria-label={t('diagnostics.featureAvailability')}
			>
				<section className={styles.runtime} aria-labelledby='runtime-health-title'>
					<div className={styles.sectionHeading}>
						<div className={styles.sectionHeadingRow}>
							<Heading level={2} id='runtime-health-title'>
								{t('diagnostics.runtimeHealth')}
							</Heading>
							<IconAction
								variant='toolbar'
								size='icon-sm'
								label={t('diagnostics.refresh')}
								disabled={state.isRefreshing}
								onClick={() => void actions.refresh()}
							>
								<RefreshActionIcon />
							</IconAction>
						</div>
						<Text>{t('diagnostics.description')}</Text>
					</div>
					<div
						className={styles.readiness}
						data-selectable
						role={readiness.isError ? 'alert' : 'status'}
						aria-live={readiness.isError ? 'assertive' : 'polite'}
						aria-atomic='true'
					>
						<strong>{readiness.title}</strong>
						<Text>{readiness.description}</Text>
					</div>
					<ItemGroup>
						<DiagnosticItem
							variant='outline'
							icon={<ActivityIcon />}
							title={t('diagnostics.advertising')}
							detail={advertisingDiagnosticDetail(state.advertising)}
							status={advertisingStatus}
							badgeVariant={
								advertisingStatus === 'error'
									? 'destructive'
									: advertisingStatus === 'enabled'
										? 'success'
										: 'secondary'
							}
							canCopy={state.canCopy}
							isCopying={state.isCopying}
							onCopy={() =>
								void actions.copy(
									'Advertising',
									createAdvertisingDiagnosticPayload(state.advertising),
								)
							}
						/>
						<DiagnosticItem
							variant='muted'
							icon={<ServerIcon />}
							title={t('diagnostics.engine')}
							detail={engineDetail}
							status={engineStatus}
							badgeVariant={
								engineStatus === 'error'
									? 'destructive'
									: engineStatus === 'running'
										? 'success'
										: 'secondary'
							}
							canCopy={state.canCopy}
							isCopying={state.isCopying}
							onCopy={() =>
								void actions.copy(
									'Engine',
									createEngineDiagnosticPayload(state.snapshot),
								)
							}
						/>
						{state.snapshot.capabilities.map((capability) => (
							<DiagnosticItem
								key={capability.name}
								variant='outline'
								icon={<ActivityIcon />}
								title={capability.name}
								detail={capabilityDiagnosticDetail(capability)}
								status={capabilityStatus(capability)}
								badgeVariant={
									!capability.supported
										? 'destructive'
										: capability.enabled === true
											? 'success'
											: 'secondary'
								}
								canCopy={state.canCopy}
								isCopying={state.isCopying}
								onCopy={() => {
									const status = capabilityStatus(capability)
									void actions.copy(
										capability.name,
										createCapabilityDiagnosticPayload(capability, status),
									)
								}}
							/>
						))}
					</ItemGroup>
				</section>
			</TabsContent>
			<TabsContent value='logs' className={styles.tabContent}>
				<Logs />
			</TabsContent>
		</Tabs>
	)
}

function DiagnosticItem({
	variant,
	icon,
	title,
	detail,
	status,
	badgeVariant,
	canCopy,
	isCopying,
	onCopy,
}: {
	readonly variant: 'outline' | 'muted'
	readonly icon: ReactNode
	readonly title: string
	readonly detail: string
	readonly status: string | undefined
	readonly badgeVariant: 'destructive' | 'success' | 'secondary'
	readonly canCopy: boolean
	readonly isCopying: boolean
	readonly onCopy: () => void
}) {
	const { t } = useAppTranslation()
	return (
		<Item variant={variant} className={styles.diagnosticItem}>
			<ItemMedia variant='icon'>{icon}</ItemMedia>
			<div className={styles.diagnosticBody}>
				<div className={styles.diagnosticHeader} data-slot='diagnostic-header'>
					<ItemTitle>{title}</ItemTitle>
					<ItemActions>
						<Badge variant={badgeVariant}>{diagnosticStatusLabel(status)}</Badge>
						{canCopy ? (
							<IconAction
								variant='ghost'
								size='icon-sm'
								label={t('diagnostics.copy', { name: title })}
								disabled={isCopying}
								onClick={(event) => {
									event.stopPropagation()
									onCopy()
								}}
							>
								<CopyIcon />
							</IconAction>
						) : null}
					</ItemActions>
				</div>
				<ItemDescription className={styles.diagnosticDescription} data-selectable>
					{detail}
				</ItemDescription>
			</div>
		</Item>
	)
}

function readinessSummary(state: {
	readonly snapshot: DiagnosticsSnapshot
	readonly error?: string
	readonly isRefreshing: boolean
}) {
	if (state.isRefreshing) {
		return {
			title: translate('diagnostics.readiness.checkingTitle'),
			description: translate('diagnostics.readiness.checkingDescription'),
			isError: false,
		}
	}

	if (state.error) {
		return {
			title: translate('diagnostics.readiness.failedTitle'),
			description: translate('diagnostics.readiness.failedDescription'),
			isError: true,
		}
	}

	if (state.snapshot.lastError) {
		return {
			title: translate('diagnostics.readiness.attentionTitle'),
			description: translate('diagnostics.readiness.attentionDescription'),
			isError: true,
		}
	}

	if (state.snapshot.engineStatus === 'running') {
		return {
			title: translate('diagnostics.readiness.readyTitle'),
			description: translate('diagnostics.readiness.readyDescription'),
			isError: false,
		}
	}

	return {
		title: translate('diagnostics.readiness.standbyTitle'),
		description: translate('diagnostics.readiness.standbyDescription'),
		isError: false,
	}
}

function capabilityStatus(capability: {
	readonly name: string
	readonly supported: boolean
	readonly enabled?: boolean
}) {
	if (!capability.supported) return 'unavailable'
	if (capability.name.endsWith('-sidecar'))
		return capability.enabled ? 'running' : 'stopped'
	if (capability.name === 'tray') return 'available'
	if (capability.enabled === undefined) return 'available'
	return capability.enabled ? 'enabled' : 'disabled'
}

function diagnosticStatusLabel(status: string | undefined) {
	switch (status) {
		case 'enabled':
		case 'disabled':
		case 'available':
		case 'unavailable':
		case 'running':
		case 'stopped':
		case 'error':
			return translate(`diagnostics.status.${status}`)
		default:
			return translate('diagnostics.status.unknown')
	}
}
