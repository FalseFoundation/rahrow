import {
	isProfileProtectedByLock,
	protectedSubscriptionIds,
} from '@rahrow/core/profile/connection-lock-policy.ts'
import type {
	Subscription,
	SubscriptionFetcher,
	SubscriptionStore,
} from '@rahrow/core/subscription/subscription-import.ts'
import {
	AddIcon,
	CleanActionIcon,
	CloseIcon,
	FilterIcon,
	RefreshActionIcon,
	SearchIcon,
	ServerIcon,
	WifiIcon,
	ZapIconComponent,
} from '@rahrow/ui/components/rahrow-icons.tsx'
import { Button } from '@rahrow/ui/components/ui/button.tsx'
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from '@rahrow/ui/components/ui/drawer.tsx'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@rahrow/ui/components/ui/empty.tsx'
import { IconAction } from '@rahrow/ui/components/ui/icon-action.tsx'
import { Progress } from '@rahrow/ui/components/ui/progress.tsx'
import { useDebouncedValue } from '@tanstack/react-pacer'
import { useNavigate } from '@tanstack/react-router'
import { useSelector } from '@tanstack/react-store'
import {
	type CSSProperties,
	type ReactNode,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useAppTranslation } from '../app/app-i18n.tsx'
import { useAppScrollViewport } from '../app/app-scroll-context.tsx'
import { ProductHeader } from '../app/ProductHeader.tsx'
import { ProductSearch } from '../app/ProductSearch.tsx'
import type { AppRuntime } from '../app/runtime.tsx'
import { ConnectionImportDrawer } from '../import/ConnectionImportDrawer.tsx'
import { ShareDrawerOutlet, useShareDrawer } from '../share/ShareDrawer.tsx'
import { SmartConnectStatus } from '../smart-connect/SmartConnectStatus.tsx'
import type { SmartConnectRuntime } from '../smart-connect/smart-connect-runtime.ts'
import { useSmartConnect } from '../smart-connect/useSmartConnect.ts'
import { SubscriptionMetadataSummary } from '../subscriptions/SubscriptionMetadataSummary.tsx'
import {
	ConnectionActionsDrawer,
	ConnectionSortDrawer,
} from './ConnectionActionDrawers.tsx'
import { ConnectionCleanupDrawer } from './ConnectionCleanupDrawer.tsx'
import {
	ConnectionCollection,
	type ConnectionCollectionGroup,
	type ConnectionCollectionProps,
} from './ConnectionCollection.tsx'
import { ConnectionGroupsSkeleton } from './ConnectionGroup.tsx'
import { ConnectionProfileEditor } from './ConnectionProfileEditor.tsx'
import { CONNECTION_SORT_DEBOUNCE_MS } from './connection-work-pacing.ts'
import {
	isConnectionGroupOpen,
	orphanedConnectionGroup,
	STANDALONE_CONNECTION_GROUP,
	subscriptionConnectionGroup,
} from './connections-view-state.ts'
import styles from './ProfileManagement.module.css'
import {
	deriveConnectionLibrary,
	removeTitle,
	subscriptionDetail,
} from './profile-library-model.ts'
import { profileSpeedTestStore } from './profile-speed-test-store.ts'
import { RawEngineDocumentWorkspace } from './RawEngineDocumentWorkspace.tsx'
import { SubscriptionEditor } from './SubscriptionEditor.tsx'
import { useConnectionCleanup } from './useConnectionCleanup.ts'
import { useConnectionLibraryWorkflows } from './useConnectionLibraryWorkflows.ts'
import {
	type ProfileManagementDependencies,
	useProfileManagement,
} from './useProfileManagement.ts'
import { usePullToRefresh } from './usePullToRefresh.ts'

export type ProfileManagementProps = ProfileManagementDependencies & {
	readonly subscriptions: readonly Subscription[]
	readonly subscriptionMessage: string
	readonly isLoadingSubscriptions?: boolean
	readonly refreshingSubscriptionIds?: ReadonlySet<string>
	readonly onAddSubscription: (url: string) => Promise<void>
	readonly onRefreshSubscription: (subscription: Subscription) => Promise<void>
	readonly onRefreshSubscriptions: (
		subscriptions: readonly Subscription[],
	) => Promise<void>
	readonly onRemoveSubscription: (id: string) => Promise<void>
	readonly onUpdateSubscription: (subscription: Subscription) => Promise<void>
	readonly onReloadSubscriptions: () => Promise<void>
	readonly subscriptionFetcher: SubscriptionFetcher
	readonly subscriptionStore: SubscriptionStore
	readonly qrPreview?: ReactNode
	readonly smartConnect?: SmartConnectRuntime
	readonly rawEngineDocuments?: AppRuntime['rawEngineDocuments']
}

const emptySpeedTests = {}

export function ProfileManagement({
	subscriptions,
	subscriptionMessage,
	isLoadingSubscriptions = false,
	refreshingSubscriptionIds = new Set(),
	onAddSubscription,
	onRefreshSubscription,
	onRefreshSubscriptions,
	onRemoveSubscription,
	onUpdateSubscription,
	onReloadSubscriptions,
	subscriptionFetcher,
	subscriptionStore,
	qrPreview,
	smartConnect,
	rawEngineDocuments,
	...dependencies
}: ProfileManagementProps) {
	const { t } = useAppTranslation()
	const { state, actions } = useProfileManagement({
		...dependencies,
		subscriptionStore,
	})
	const appScrollViewport = useAppScrollViewport()
	const productHeaderRef = useRef<HTMLElement>(null)
	const [rawWorkspaceOpen, setRawWorkspaceOpen] = useState(false)
	const navigate = useNavigate()
	const shareDrawer = useShareDrawer()
	const query = state.connectionsView.query
	const sort = state.connectionsView.sort
	const [pacedQuery] = useDebouncedValue(query, { wait: 120 })
	const [pacedSort] = useDebouncedValue(sort, {
		wait: CONNECTION_SORT_DEBOUNCE_MS,
	})
	const speedTestsForSort = useSelector(
		profileSpeedTestStore,
		(speedTestState) =>
			pacedSort === 'speed-test' ? speedTestState.results : emptySpeedTests,
	)
	const library = useMemo(
		() =>
			deriveConnectionLibrary({
				profiles: state.profiles,
				query: pacedQuery,
				sort: pacedSort,
				speedTests: speedTestsForSort,
				subscriptions,
			}),
		[pacedQuery, pacedSort, speedTestsForSort, state.profiles, subscriptions],
	)
	const workflows = useConnectionLibraryWorkflows({
		actions,
		registry: dependencies.registry,
		subscriptions,
		onAddSubscription,
		onRefreshSubscription,
		onRefreshSubscriptions,
		onRemoveSubscription,
		onUpdateSubscription,
		openShare: shareDrawer.open,
		onProfileActivated: async () => {
			await navigate({ to: '/' })
		},
	})
	const cleanup = useConnectionCleanup({
		profiles: state.profiles,
		subscriptions,
		engine: dependencies.engine,
		subscriptionFetcher,
		profileStore: dependencies.profileStore,
		subscriptionStore,
		settingsStore: dependencies.settingsStore,
		adGate: dependencies.adGate,
		logger: dependencies.logger,
		onReload: async () => {
			await Promise.all([actions.reloadProfiles(), onReloadSubscriptions()])
		},
	})
	const smartConnectControl = useSmartConnect(smartConnect)

	useEffect(() => {
		if (!isLoadingSubscriptions)
			actions.pruneConnectionGroups(library.activeGroupKeys)
	}, [
		actions.pruneConnectionGroups,
		isLoadingSubscriptions,
		library.activeGroupKeys,
		state.connectionsView,
	])

	const isCollectionLoading = state.isLoading || isLoadingSubscriptions
	const hasProfiles =
		library.allOwnership.standalone.length > 0 ||
		[...library.allOwnership.bySubscription.values()].some(
			(profiles) => profiles.length > 0,
		)
	const hasCollectionContent = hasProfiles || subscriptions.length > 0
	const nodeCount =
		library.allOwnership.standalone.length +
		[...library.allOwnership.bySubscription.values()].reduce(
			(total, profiles) => total + profiles.length,
			0,
		)
	const lockedSubscriptionIds = useMemo(
		() => protectedSubscriptionIds(subscriptions),
		[subscriptions],
	)
	const searchVisible = workflows.searchOpen || query.length > 0
	const pullToRefresh = usePullToRefresh(
		appScrollViewport,
		workflows.refreshConnections,
	)
	const connectionGroups: ConnectionCollectionGroup[] = []

	if (!isCollectionLoading && library.ownership.standalone.length) {
		connectionGroups.push({
			key: STANDALONE_CONNECTION_GROUP,
			open: isConnectionGroupOpen(
				state.connectionsView,
				STANDALONE_CONNECTION_GROUP,
			),
			onOpenChange: (open) =>
				actions.setConnectionGroupOpen(STANDALONE_CONNECTION_GROUP, open),
			title: t('profiles.groups.profiles'),
			kind: 'profiles',
			detail: t('profiles.groups.standalone', {
				count: library.allOwnership.standalone.length,
			}),
			profiles: library.ownership.standalone,
			onActions: () =>
				workflows.openActions({
					kind: 'local',
					profiles: library.ownership.standalone,
				}),
			refreshing: library.ownership.standalone.some((profile) =>
				state.speedTestingIds?.has(profile.id),
			),
		})
	}

	if (!isCollectionLoading && library.hasVisibleProfiles) {
		for (const subscription of subscriptions) {
			const visibleProfiles =
				library.ownership.bySubscription.get(subscription.id) ?? []
			if (library.hasQuery && visibleProfiles.length === 0) continue
			const key = subscriptionConnectionGroup(subscription.id)
			connectionGroups.push({
				key,
				open: isConnectionGroupOpen(state.connectionsView, key),
				onOpenChange: (open) => actions.setConnectionGroupOpen(key, open),
				title: subscription.name ?? subscription.id,
				kind: 'subscription',
				locked: subscription.locked,
				detail: subscriptionDetail(
					subscription,
					library.allOwnership.bySubscription.get(subscription.id)?.length ?? 0,
				),
				profiles: visibleProfiles,
				onActions: () =>
					workflows.openActions({
						kind: 'subscription',
						subscription,
						profiles: library.allOwnership.bySubscription.get(subscription.id) ?? [],
					}),
				refreshing:
					refreshingSubscriptionIds.has(subscription.id) ||
					visibleProfiles.some((profile) => state.speedTestingIds?.has(profile.id)),
				summary: <SubscriptionMetadataSummary metadata={subscription.metadata} />,
				emptyContent: (
					<div className={styles.groupEmpty}>
						{t('profiles.groups.refreshSource')}
					</div>
				),
			})
		}

		for (const subscriptionId of library.orphanedSubscriptionIds) {
			const profiles = library.ownership.bySubscription.get(subscriptionId) ?? []
			const key = orphanedConnectionGroup(subscriptionId)
			connectionGroups.push({
				key,
				open: isConnectionGroupOpen(state.connectionsView, key),
				onOpenChange: (open) => actions.setConnectionGroupOpen(key, open),
				title: t('profiles.groups.unavailableSubscription'),
				kind: 'unavailable',
				detail: t('profiles.groups.retained', {
					count: profiles.length,
					subscriptionId,
				}),
				profiles,
				onActions: () => workflows.openActions({ kind: 'local', profiles }),
			})
		}
	}

	return (
		<>
			<div
				className={styles.page}
				data-pulling={pullToRefresh.distance > 0 || undefined}
				data-refreshing={pullToRefresh.refreshing || undefined}
				style={
					{
						'--pull-distance': `${pullToRefresh.distance}px`,
					} as CSSProperties
				}
			>
				<div
					className={styles.pullIndicator}
					aria-hidden={!pullToRefresh.refreshing}
				>
					<RefreshActionIcon />
					<span>
						{pullToRefresh.refreshing
							? t('profiles.refresh.refreshing')
							: pullToRefresh.armed
								? t('profiles.refresh.release')
								: t('profiles.refresh.pull')}
					</span>
				</div>
				<ProductHeader
					ref={productHeaderRef}
					title={t('app.screens.profiles')}
					badge={
						nodeCount > 0 ? t('profiles.nodeCount', { count: nodeCount }) : undefined
					}
					actions={
						<>
							{hasProfiles ? (
								<IconAction
									variant='toolbar'
									size='square'
									disabled={state.isInitialized === false}
									data-active
									label={t('profiles.actions.search')}
									onClick={() => workflows.setSearchOpen(true)}
								>
									<SearchIcon />
								</IconAction>
							) : null}
							<IconAction
								className={styles.addAction}
								variant='toolbar'
								size='square'
								disabled={state.isInitialized === false}
								data-active
								label={t('import.addConnection')}
								onClick={() => workflows.setDrawer('import')}
							>
								<AddIcon />
							</IconAction>
						</>
					}
				/>

				<section className={styles.content}>
					{hasCollectionContent ? (
						<div className={styles.toolbar}>
							{hasProfiles && smartConnect ? (
								<IconAction
									className={styles.tool}
									variant='toolbar'
									disabled={
										state.isInitialized === false ||
										smartConnectControl.state.isLoading ||
										smartConnectControl.state.status === 'running'
									}
									data-active={smartConnectControl.state.enabled || undefined}
									aria-pressed={smartConnectControl.state.enabled}
									aria-busy={smartConnectControl.state.status === 'running'}
									label={t('smartConnect.action')}
									onClick={() =>
										void (smartConnectControl.state.enabled
											? smartConnectControl.actions.run()
											: smartConnectControl.actions.start())
									}
								>
									<ZapIconComponent />
									<span>{t('profiles.toolbar.auto')}</span>
								</IconAction>
							) : null}
							<IconAction
								className={styles.tool}
								variant='toolbar'
								disabled={state.isInitialized === false || isLoadingSubscriptions}
								label={t('profiles.actions.cleanup')}
								onClick={() => cleanup.actions.openDrawer()}
							>
								<CleanActionIcon />
								<span>{t('profiles.toolbar.clean')}</span>
							</IconAction>
							{hasProfiles ? (
								<IconAction
									className={styles.tool}
									variant='toolbar'
									disabled={state.isInitialized === false}
									label={t('profiles.actions.sort')}
									onClick={() => workflows.setDrawer('sort')}
								>
									<FilterIcon />
									<span>{t('profiles.toolbar.sort')}</span>
								</IconAction>
							) : null}
							{rawEngineDocuments ? (
								<IconAction
									className={styles.tool}
									variant='toolbar'
									disabled={state.isInitialized === false}
									label={t('profiles.rawEngine.action')}
									onClick={() => setRawWorkspaceOpen(true)}
								>
									<ServerIcon />
									<span>{t('profiles.toolbar.engine')}</span>
								</IconAction>
							) : null}
						</div>
					) : null}
					<SmartConnectStatus {...smartConnectControl} />
					<SpeedTestProgressPanel onCancel={actions.cancelSpeedTests} />
					{searchVisible ? (
						<ProductSearch
							label={t('profiles.search')}
							value={query}
							onValueChange={actions.setConnectionsQuery}
							onClose={() => {
								actions.setConnectionsQuery('')
								workflows.setSearchOpen(false)
							}}
						/>
					) : null}

					{isCollectionLoading ? <ConnectionGroupsSkeleton /> : null}
					{!isCollectionLoading && state.initializationFailure ? (
						<Empty className={styles.collectionEmpty} role='alert'>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<WifiIcon />
								</EmptyMedia>
								<EmptyTitle>{state.initializationFailure.title}</EmptyTitle>
								<EmptyDescription>
									{state.initializationFailure.description}{' '}
									{state.initializationFailure.detail}
								</EmptyDescription>
							</EmptyHeader>
							<EmptyContent>
								<Button type='button' onClick={() => void actions.reloadProfiles()}>
									{t('common.tryAgain')}
								</Button>
							</EmptyContent>
						</Empty>
					) : null}
					{!isCollectionLoading &&
					!state.initializationFailure &&
					!library.hasVisibleProfiles ? (
						<Empty className={styles.collectionEmpty}>
							<EmptyHeader>
								<EmptyMedia variant='icon'>
									<WifiIcon />
								</EmptyMedia>
								<EmptyTitle>
									{library.hasQuery
										? t('profiles.empty.noMatches')
										: t('profiles.empty.none')}
								</EmptyTitle>
								<EmptyDescription>
									{library.hasQuery
										? t('profiles.empty.noMatchesDescription')
										: t('profiles.empty.noneDescription')}
								</EmptyDescription>
							</EmptyHeader>
							{!library.hasQuery ? (
								<EmptyContent>
									<Button type='button' onClick={() => workflows.setDrawer('import')}>
										<AddIcon data-icon='inline-start' />
										{t('import.addConnection')}
									</Button>
								</EmptyContent>
							) : null}
						</Empty>
					) : null}

					{!isCollectionLoading && connectionGroups.length ? (
						<SpeedTestConnectionCollection
							groups={connectionGroups}
							selectedId={state.selectedId}
							onActivate={workflows.activateProfile}
							onProfileActions={(profile) =>
								workflows.openActions({
									kind: 'profile',
									profile,
									locked: isProfileProtectedByLock(profile, lockedSubscriptionIds),
								})
							}
							isProfileLocked={(profile) =>
								isProfileProtectedByLock(profile, lockedSubscriptionIds)
							}
							testingIds={state.speedTestingIds}
							persistedScrollOffset={state.connectionsView.scrollOffset}
							persistedLoadedProfileCount={state.connectionsView.loadedProfileCount}
							fixedBoundaryRef={productHeaderRef}
							onViewportChange={actions.setConnectionsViewport}
						/>
					) : null}
					<p className={styles.srStatus} role='status'>
						{state.message} · {subscriptionMessage}
						{state.connectionsViewWarning
							? ` · ${state.connectionsViewWarning}`
							: null}
					</p>
				</section>
			</div>

			<Drawer
				open={workflows.drawer !== null}
				disablePointerDismissal={workflows.mutationPending}
				onOpenChange={(open) => {
					if (!open) workflows.closeDrawer()
				}}
				showSwipeHandle
			>
				<DrawerContent variant='app' scrollable>
					<DrawerHeader className={styles.drawerHeader}>
						<div>
							<DrawerTitle>{workflows.drawerCopy.title}</DrawerTitle>
							{workflows.drawerCopy.description ? (
								<DrawerDescription>
									{workflows.drawerCopy.description}
								</DrawerDescription>
							) : null}
						</div>
						<IconAction
							variant='toolbar'
							size='square'
							label={t('common.closeDrawer')}
							onClick={workflows.closeDrawer}
						>
							<CloseIcon />
						</IconAction>
					</DrawerHeader>
					{workflows.drawer === 'import' ? (
						<ConnectionImportDrawer
							value={state.importText}
							onValueChange={actions.setImportText}
							onImportUrl={() => workflows.importUrl(state.importText)}
							onPaste={
								dependencies.capabilities.clipboard.supported === false
									? undefined
									: actions.pasteImportText
							}
							onScanQr={
								dependencies.capabilities.qrDecoder
									? async () => {
											await actions.importFromQr()
											workflows.closeDrawer()
										}
									: undefined
							}
							qrPreview={qrPreview}
							supportedProtocols={dependencies.engine.manifest.supportedProtocols}
							onCreateProfile={async (profile) => {
								await actions.saveProfile(profile)
								workflows.closeDrawer()
							}}
						/>
					) : null}
					{workflows.drawer === 'sort' ? (
						<ConnectionSortDrawer
							value={sort}
							onChange={(value) => {
								actions.setConnectionsSort(value)
								workflows.closeDrawer()
							}}
						/>
					) : null}
					{workflows.drawer === 'actions' ? (
						<ConnectionActionsDrawer
							target={workflows.target}
							actions={actions}
							onRefreshSubscription={workflows.refreshSubscription}
							onExport={workflows.exportTarget}
							onSpeedTest={workflows.testTarget}
							onDelete={workflows.requestDelete}
							onCleanup={() => {
								const target = workflows.target
								cleanup.actions.openDrawer(
									target.kind === 'subscription'
										? {
												kind: 'subscription',
												subscriptionId: target.subscription.id,
											}
										: { kind: 'local' },
								)
								workflows.closeDrawer()
							}}
							onEdit={workflows.beginEdit}
							onClose={workflows.closeDrawer}
						/>
					) : null}
				</DrawerContent>

				<Drawer
					open={workflows.nestedDrawer !== null}
					disablePointerDismissal={workflows.mutationPending}
					onOpenChange={(open) => {
						if (!open) workflows.closeNestedDrawer()
					}}
					showSwipeHandle
				>
					<DrawerContent variant='app' scrollable>
						<DrawerHeader className={styles.drawerHeader}>
							<div>
								<DrawerTitle>{workflows.nestedDrawerCopy.title}</DrawerTitle>
								{workflows.nestedDrawerCopy.description ? (
									<DrawerDescription>
										{workflows.nestedDrawerCopy.description}
									</DrawerDescription>
								) : null}
							</div>
							<IconAction
								variant='toolbar'
								size='square'
								label={t('common.closeDrawer')}
								disabled={workflows.mutationPending}
								onClick={workflows.closeNestedDrawer}
							>
								<CloseIcon />
							</IconAction>
						</DrawerHeader>
						{workflows.nestedDrawer === 'edit-profile' &&
						workflows.target.kind === 'profile' ? (
							<div className={styles.drawerBody}>
								<ConnectionProfileEditor
									profile={workflows.target.profile}
									onSave={workflows.saveProfile}
								/>
							</div>
						) : null}
						{workflows.nestedDrawer === 'edit-subscription' &&
						workflows.target.kind === 'subscription' ? (
							<SubscriptionEditor
								key={workflows.target.subscription.id}
								subscription={workflows.target.subscription}
								onSave={workflows.saveSubscription}
							/>
						) : null}
					</DrawerContent>
				</Drawer>

				<Drawer
					open={workflows.deleteOpen}
					disablePointerDismissal={workflows.mutationPending}
					onOpenChange={workflows.setDeleteOpen}
					showSwipeHandle
				>
					<DrawerContent variant='app'>
						<DrawerHeader className={styles.confirmationHeader}>
							<DrawerTitle>{removeTitle(workflows.target)}</DrawerTitle>
							<DrawerDescription>
								{workflows.target.kind === 'subscription'
									? `${t('profiles.remove.subscriptionConsequence', {
											count: workflows.target.profiles.length,
										})} ${t('profiles.remove.irreversible')}`
									: t('profiles.remove.irreversible')}
							</DrawerDescription>
						</DrawerHeader>
						<DrawerFooter className={styles.confirmationFooter}>
							{workflows.mutationError ? (
								<p role='alert'>{workflows.mutationError}</p>
							) : null}
							<Button
								variant='outline'
								disabled={workflows.mutationPending}
								onClick={() => workflows.setDeleteOpen(false)}
							>
								{t('common.cancel')}
							</Button>
							<Button
								variant='destructive'
								disabled={workflows.mutationPending}
								onClick={() => void workflows.confirmDelete()}
							>
								{workflows.mutationPending
									? t('profiles.status.removing')
									: t('profiles.actions.remove')}
							</Button>
						</DrawerFooter>
					</DrawerContent>
				</Drawer>

				<ShareDrawerOutlet />
			</Drawer>

			<ConnectionCleanupDrawer cleanup={cleanup} />

			{rawEngineDocuments ? (
				<Drawer
					open={rawWorkspaceOpen}
					onOpenChange={setRawWorkspaceOpen}
					showSwipeHandle
				>
					<DrawerContent variant='app' scrollable>
						<DrawerHeader className={styles.drawerHeader}>
							<div>
								<DrawerTitle>{t('profiles.rawEngine.title')}</DrawerTitle>
								<DrawerDescription>
									{t('profiles.rawEngine.description')}
								</DrawerDescription>
							</div>
							<IconAction
								variant='toolbar'
								size='square'
								label={t('common.closeDrawer')}
								onClick={() => setRawWorkspaceOpen(false)}
							>
								<CloseIcon />
							</IconAction>
						</DrawerHeader>
						<div className={styles.drawerScroll}>
							<RawEngineDocumentWorkspace
								adapters={rawEngineDocuments.adapters}
								storeFor={rawEngineDocuments.storeFor}
								createIdentity={() => ({ id: crypto.randomUUID() })}
								onExtract={async (profile) => {
									await actions.saveProfile(profile)
									setRawWorkspaceOpen(false)
								}}
							/>
						</div>
					</DrawerContent>
				</Drawer>
			) : null}
		</>
	)
}

function SpeedTestProgressPanel({
	onCancel,
}: {
	readonly onCancel: () => void
}) {
	const { t } = useAppTranslation()
	const progress = useSelector(profileSpeedTestStore, (state) => state.progress)
	if (progress.status !== 'running') return null
	const percent = progress.total
		? (progress.completed / progress.total) * 100
		: 0

	return (
		<aside
			className={styles.speedTestPanel}
			aria-label={t('profiles.speedTest.active')}
		>
			<div className={styles.speedTestHeader}>
				<div className={styles.speedTestCopy}>
					<strong>{t('profiles.speedTest.title')}</strong>
					<span>
						{t('profiles.speedTest.progress', {
							completed: progress.completed,
							total: progress.total,
						})}
					</span>
				</div>
				<Button
					type='button'
					variant='outline'
					size='sm'
					aria-label={t('profiles.speedTest.cancel')}
					onClick={onCancel}
				>
					{t('common.cancel')}
				</Button>
			</div>
			<Progress
				className={styles.speedTestMeter}
				value={percent}
				aria-label={t('profiles.speedTest.progressLabel')}
			/>
		</aside>
	)
}

function SpeedTestConnectionCollection({
	testingIds,
	...props
}: Omit<ConnectionCollectionProps, 'speedTests'>) {
	const speedTests = useSelector(profileSpeedTestStore, (state) => state.results)
	return (
		<ConnectionCollection
			{...props}
			speedTests={speedTests}
			testingIds={testingIds}
		/>
	)
}
