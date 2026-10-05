import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { useThrottledCallback } from '@tanstack/react-pacer'
import { useSelector } from '@tanstack/react-store'
import {
	defaultRangeExtractor,
	type Range,
	useVirtualizer,
} from '@tanstack/react-virtual'
import {
	type ReactNode,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { createPortal } from 'react-dom'
import { useAppScrollViewport } from '../app/app-scroll-context.tsx'
import type { LatencyProbeResult } from '../app/latency-presentation.ts'
import { usePrimaryTabVisible } from '../app/primary-tab-visibility.tsx'
import styles from './ConnectionCollection.module.css'
import {
	ConnectionGroup,
	ConnectionGroupHeader,
	type ConnectionGroupKind,
} from './ConnectionGroup.tsx'
import {
	ConnectionProfileList,
	ConnectionProfileRow,
} from './ConnectionProfileList.tsx'
import {
	connectionsViewportStore,
	saveConnectionsViewportSnapshot,
} from './connections-viewport-store.ts'
import { shouldVirtualizeProfileList } from './profile-library-model.ts'
import {
	CONNECTION_GROUP_ESTIMATE,
	CONNECTION_GROUP_GAP,
	CONNECTION_PROFILE_PAGE_SIZE,
	connectionGroupEnd,
	flattenConnectionGroups,
	nextLoadedProfileCount,
	PROFILE_ROW_ESTIMATE,
	shouldFloatConnectionHeader,
} from './profile-list-virtual-model.ts'

export interface ConnectionCollectionGroup {
	readonly key: string
	readonly open: boolean
	readonly title: string
	readonly detail: string
	readonly kind?: ConnectionGroupKind
	readonly refreshing?: boolean
	readonly locked?: boolean
	readonly profiles: readonly ConnectionProfile[]
	readonly summary?: ReactNode
	readonly emptyContent?: ReactNode
	readonly onOpenChange: (open: boolean) => void
	readonly onActions: () => void
}

export interface ConnectionCollectionProps {
	readonly groups: readonly ConnectionCollectionGroup[]
	readonly selectedId: string
	readonly onActivate: (profile: ConnectionProfile) => Promise<void>
	readonly onProfileActions: (profile: ConnectionProfile) => void
	readonly isProfileLocked?: (profile: ConnectionProfile) => boolean
	readonly speedTests: Readonly<Record<string, LatencyProbeResult | undefined>>
	readonly testingIds?: ReadonlySet<string>
	readonly persistedScrollOffset?: number
	readonly persistedLoadedProfileCount?: number
	readonly fixedBoundaryRef?: RefObject<HTMLElement | null>
	readonly onViewportChange: (
		scrollOffset: number,
		loadedProfileCount: number,
	) => void
}

export function ConnectionCollection(props: ConnectionCollectionProps) {
	const profileCount = props.groups.reduce(
		(total, group) => total + (group.open ? group.profiles.length : 0),
		0,
	)
	const largestOpenGroup = props.groups.reduce(
		(largest, group) =>
			group.open ? Math.max(largest, group.profiles.length) : largest,
		0,
	)

	if (!shouldVirtualizeProfileList(profileCount)) {
		return <StaticConnectionCollection {...props} />
	}

	return (
		<VirtualConnectionCollection {...props} largestOpenGroup={largestOpenGroup} />
	)
}

function StaticConnectionCollection({
	groups,
	selectedId,
	onActivate,
	onProfileActions,
	isProfileLocked,
	speedTests,
	testingIds,
}: ConnectionCollectionProps) {
	return (
		<>
			{groups.map((group) => (
				<ConnectionGroup
					key={group.key}
					open={group.open}
					onOpenChange={group.onOpenChange}
					title={group.title}
					detail={group.detail}
					kind={group.kind}
					refreshing={group.refreshing}
					locked={group.locked}
					onActions={group.onActions}
				>
					{group.summary}
					{group.profiles.length ? (
						<ConnectionProfileList
							profiles={group.profiles}
							selectedId={selectedId}
							onActivate={onActivate}
							onActions={onProfileActions}
							speedTests={speedTests}
							testingIds={testingIds}
							isLocked={isProfileLocked}
						/>
					) : (
						group.emptyContent
					)}
				</ConnectionGroup>
			))}
		</>
	)
}

function VirtualConnectionCollection({
	groups,
	selectedId,
	onActivate,
	onProfileActions,
	isProfileLocked,
	speedTests,
	testingIds,
	persistedScrollOffset = 0,
	persistedLoadedProfileCount = CONNECTION_PROFILE_PAGE_SIZE,
	fixedBoundaryRef,
	onViewportChange,
	largestOpenGroup,
}: ConnectionCollectionProps & { readonly largestOpenGroup: number }) {
	const appScrollViewport = useAppScrollViewport()
	const tabVisible = usePrimaryTabVisible()
	const appScrollElement = appScrollViewport.current
	const listRef = useRef<HTMLDivElement>(null)
	const floatingFrameRef = useRef<{
		readonly top: number
		readonly left: number
		readonly width: number
		readonly height: number
		readonly inset: number
	} | null>(null)
	const focusedProfileIdRef = useRef<string | undefined>(undefined)
	const scrollOffsetRef = useRef(persistedScrollOffset)
	const [scrollMargin, setScrollMargin] = useState(0)
	const collectionSignature = useMemo(
		() =>
			groups
				.map(
					(group) =>
						`${group.key}:${group.open ? 'open' : 'closed'}:${group.profiles.length}:${group.profiles[0]?.id ?? ''}:${group.profiles.at(-1)?.id ?? ''}`,
				)
				.join('\u001f'),
		[groups],
	)
	const snapshot = useSelector(
		connectionsViewportStore,
		(state) => state.snapshot,
	)
	const restoredSnapshot =
		snapshot?.signature === collectionSignature ? snapshot : undefined
	const [loadedProfileCount, setLoadedProfileCount] = useState(() =>
		Math.min(
			largestOpenGroup,
			Math.max(
				CONNECTION_PROFILE_PAGE_SIZE,
				persistedLoadedProfileCount,
				restoredSnapshot?.loadedProfileCount ?? 0,
			),
		),
	)
	const loadedProfileCountRef = useRef(loadedProfileCount)
	const rows = useMemo(
		() => flattenConnectionGroups(groups, loadedProfileCount),
		[groups, loadedProfileCount],
	)
	const signatureRef = useRef(collectionSignature)
	signatureRef.current = collectionSignature
	loadedProfileCountRef.current = loadedProfileCount
	const stickyIndexes = useMemo(
		() => rows.filter((row) => row.kind === 'group').map((row) => row.index),
		[rows],
	)
	const activeStickyIndexRef = useRef(stickyIndexes[0] ?? 0)
	const getItemKey = useCallback(
		(index: number) => rows[index]?.key ?? index,
		[rows],
	)
	const rangeExtractor = useCallback(
		(range: Range) => {
			let activeIndex = stickyIndexes[0] ?? 0
			for (const index of stickyIndexes) {
				if (index > range.startIndex) break
				activeIndex = index
			}
			activeStickyIndexRef.current = activeIndex
			const nextIndex = stickyIndexes.find((index) => index > activeIndex)
			const followingIndex = stickyIndexes.find(
				(index) => nextIndex !== undefined && index > nextIndex,
			)
			return [
				...new Set([
					activeStickyIndexRef.current,
					...(nextIndex === undefined ? [] : [nextIndex]),
					...(followingIndex === undefined ? [] : [followingIndex]),
					...defaultRangeExtractor(range),
				]),
			].sort((left, right) => left - right)
		},
		[stickyIndexes],
	)
	const virtualizer = useVirtualizer({
		count: rows.length,
		getScrollElement: () => appScrollViewport.current,
		getItemKey,
		estimateSize: (index) =>
			rows[index]?.kind === 'group'
				? CONNECTION_GROUP_ESTIMATE
				: rows[index]?.kind === 'gap'
					? CONNECTION_GROUP_GAP
					: PROFILE_ROW_ESTIMATE,
		initialMeasurementsCache: restoredSnapshot
			? [...restoredSnapshot.measurements]
			: undefined,
		initialOffset: () => restoredSnapshot?.scrollOffset ?? persistedScrollOffset,
		overscan: 6,
		rangeExtractor,
		scrollMargin,
		anchorTo: 'start',
		useFlushSync: false,
	})

	useLayoutEffect(() => {
		const viewport = appScrollElement ?? appScrollViewport.current
		const list = listRef.current
		if (!viewport || !list) return

		const measureMargin = () => {
			const viewportRect = viewport.getBoundingClientRect()
			const listRect = list.getBoundingClientRect()
			const fixedBoundaryRect = fixedBoundaryRef?.current?.getBoundingClientRect()
			const viewportTop = Number.isFinite(viewportRect.top) ? viewportRect.top : 0
			const listTop = Number.isFinite(listRect.top) ? listRect.top : 0
			const viewportScrollTop = Number.isFinite(viewport.scrollTop)
				? viewport.scrollTop
				: 0
			const next = listTop - viewportTop + viewportScrollTop
			const fixedBoundaryBottom = Number.isFinite(fixedBoundaryRect?.bottom)
				? (fixedBoundaryRect?.bottom ?? viewportTop)
				: viewportTop
			const fixedTop = Math.max(viewportTop, fixedBoundaryBottom)
			const viewportBottom = Number.isFinite(viewportRect.bottom)
				? viewportRect.bottom
				: fixedTop
			setScrollMargin((current) => (current === next ? current : next))
			floatingFrameRef.current = {
				top: fixedTop,
				left: Number.isFinite(listRect.left) ? listRect.left : 0,
				width: Number.isFinite(listRect.width) ? listRect.width : 0,
				height: Math.max(0, viewportBottom - fixedTop),
				inset: fixedTop - viewportTop,
			}
		}
		measureMargin()
		if (typeof ResizeObserver === 'undefined') return
		const observer = new ResizeObserver(measureMargin)
		observer.observe(list)
		observer.observe(viewport)
		if (fixedBoundaryRef?.current) observer.observe(fixedBoundaryRef.current)
		return () => observer.disconnect()
	}, [appScrollElement, fixedBoundaryRef])

	const persistViewport = useThrottledCallback(
		(offset: number, count: number) => onViewportChange(offset, count),
		{ wait: 250, leading: true, trailing: true },
	)

	useEffect(() => {
		const viewport = appScrollViewport.current
		const captureOffset = () => {
			scrollOffsetRef.current = viewport?.scrollTop ?? scrollOffsetRef.current
			persistViewport(scrollOffsetRef.current, loadedProfileCount)
		}
		viewport?.addEventListener('scroll', captureOffset, { passive: true })
		return () => viewport?.removeEventListener('scroll', captureOffset)
	}, [appScrollViewport, loadedProfileCount, persistViewport])

	const loadNextPage = useThrottledCallback(
		() => {
			const current = loadedProfileCountRef.current
			const next = nextLoadedProfileCount(current, largestOpenGroup)
			if (next === current) return
			loadedProfileCountRef.current = next
			setLoadedProfileCount(next)
			onViewportChange(scrollOffsetRef.current, next)
		},
		{ wait: 180, leading: true, trailing: false },
	)
	const virtualItems = virtualizer.getVirtualItems()
	const lastVirtualIndex = virtualItems.at(-1)?.index ?? -1
	const currentScrollOffset = virtualizer.scrollOffset ?? persistedScrollOffset
	const floatingFrame = floatingFrameRef.current
	const fixedEdgeOffset = currentScrollOffset + (floatingFrame?.inset ?? 0)
	const rangeActiveStickyIndex = activeStickyIndexRef.current
	const rangeNextStickyIndex = stickyIndexes.find(
		(index) => index > rangeActiveStickyIndex,
	)
	const rangeNextStickyItem = virtualItems.find(
		(item) => item.index === rangeNextStickyIndex,
	)
	const activeStickyIndex =
		rangeNextStickyItem && fixedEdgeOffset > rangeNextStickyItem.start
			? rangeNextStickyItem.index
			: rangeActiveStickyIndex
	const activeStickyItem = virtualItems.find(
		(item) => item.index === activeStickyIndex,
	)
	const nextStickyIndex = stickyIndexes.find(
		(index) => index > activeStickyIndex,
	)
	const nextStickyItem = virtualItems.find(
		(item) => item.index === nextStickyIndex,
	)
	const floatingGroupRow = rows[activeStickyIndex]
	const floatingGroup =
		floatingGroupRow?.kind === 'group'
			? groups.find((group) => group.key === floatingGroupRow.groupKey)
			: undefined
	const groupEnd = connectionGroupEnd(
		nextStickyItem?.start,
		scrollMargin + virtualizer.getTotalSize(),
	)
	const floatingHeaderVisible = Boolean(
		tabVisible &&
			floatingFrame &&
			activeStickyItem &&
			floatingGroup &&
			shouldFloatConnectionHeader(
				floatingGroup.open,
				currentScrollOffset,
				activeStickyItem.start,
				groupEnd,
				floatingFrame.inset,
			),
	)

	useEffect(() => {
		if (
			loadedProfileCount < largestOpenGroup &&
			lastVirtualIndex >= rows.length - 4
		) {
			loadNextPage()
		}
	}, [
		lastVirtualIndex,
		loadNextPage,
		loadedProfileCount,
		largestOpenGroup,
		rows.length,
	])

	useEffect(
		() => () => {
			const offset =
				appScrollViewport.current?.scrollTop ?? scrollOffsetRef.current
			saveConnectionsViewportSnapshot({
				signature: signatureRef.current,
				scrollOffset: offset,
				loadedProfileCount: loadedProfileCountRef.current,
				measurements: virtualizer.takeSnapshot(),
				focusedProfileId: focusedProfileIdRef.current,
			})
			onViewportChange(offset, loadedProfileCountRef.current)
		},
		[appScrollViewport, onViewportChange, virtualizer],
	)

	useEffect(() => {
		const profileId = restoredSnapshot?.focusedProfileId
		if (!profileId) return
		focusedProfileIdRef.current = profileId
	}, [restoredSnapshot])

	useEffect(() => {
		const profileId = focusedProfileIdRef.current
		if (!profileId || document.activeElement !== document.body) return
		const candidate = [
			...(listRef.current?.querySelectorAll<HTMLElement>('[data-profile-id]') ??
				[]),
		].find((element) => element.dataset.profileId === profileId)
		candidate?.focus()
	}, [virtualItems])

	const groupsByKey = useMemo(
		() => new Map(groups.map((group) => [group.key, group])),
		[groups],
	)

	return (
		<>
			<div ref={listRef} className={styles.collection}>
				<ul
					className={styles.virtualCanvas}
					style={{ height: virtualizer.getTotalSize() }}
				>
					{virtualItems.map((virtualRow) => {
						const row = rows[virtualRow.index]
						if (!row) return null
						const rowStyle = {
							position: 'absolute' as const,
							transform: `translateY(${virtualRow.start - scrollMargin}px)`,
						}

						if (row.kind === 'gap') {
							return (
								<li
									key={row.key}
									role='presentation'
									aria-hidden='true'
									className={styles.virtualGap}
									style={{ ...rowStyle, height: CONNECTION_GROUP_GAP }}
								/>
							)
						}

						if (row.kind === 'group') {
							const group = groupsByKey.get(row.groupKey)
							if (!group) return null
							return (
								<li
									key={row.key}
									data-index={virtualRow.index}
									ref={virtualizer.measureElement}
									className={styles.virtualGroup}
									style={rowStyle}
								>
									<ConnectionGroupHeader
										open={group.open}
										onOpenChange={group.onOpenChange}
										title={group.title}
										detail={group.detail}
										kind={group.kind}
										refreshing={group.refreshing}
										locked={group.locked}
										onActions={group.onActions}
										headingHidden={
											floatingHeaderVisible && virtualRow.index === activeStickyIndex
										}
									>
										{group.summary}
										{group.open && group.profiles.length === 0
											? group.emptyContent
											: null}
									</ConnectionGroupHeader>
								</li>
							)
						}

						return (
							<li
								key={row.key}
								data-index={virtualRow.index}
								ref={virtualizer.measureElement}
								className={styles.virtualProfile}
								data-first-profile={row.position === 1 || undefined}
								aria-posinset={row.position}
								aria-setsize={row.setSize}
								style={rowStyle}
							>
								<ConnectionProfileRow
									profile={row.profile}
									selected={row.profile.id === selectedId}
									latency={speedTests[row.profile.id]}
									testing={testingIds?.has(row.profile.id) ?? false}
									locked={isProfileLocked?.(row.profile) ?? false}
									onActivate={onActivate}
									onActions={onProfileActions}
									onFocus={() => {
										focusedProfileIdRef.current = row.profile.id
									}}
									role='presentation'
									position={row.position}
									setSize={row.setSize}
								/>
							</li>
						)
					})}
				</ul>
				{loadedProfileCount < largestOpenGroup ? (
					<p className={styles.loadingMore} role='status'>
						Loading more connections…
					</p>
				) : null}
			</div>
			{floatingHeaderVisible &&
			floatingFrame &&
			floatingGroup &&
			typeof document !== 'undefined'
				? createPortal(
						<div
							className={styles.floatingGroupHeaderViewport}
							style={{
								position: 'fixed',
								top: floatingFrame.top,
								left: floatingFrame.left,
								width: floatingFrame.width,
								height: floatingFrame.height,
							}}
						>
							<div key={floatingGroup.key} className={styles.floatingGroupHeader}>
								<ConnectionGroupHeader
									open={floatingGroup.open}
									onOpenChange={floatingGroup.onOpenChange}
									title={floatingGroup.title}
									detail={floatingGroup.detail}
									kind={floatingGroup.kind}
									refreshing={floatingGroup.refreshing}
									locked={floatingGroup.locked}
									onActions={floatingGroup.onActions}
								/>
							</div>
						</div>,
						document.body,
					)
				: null}
		</>
	)
}
