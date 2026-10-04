import type {
	ConnectionsSort,
	ConnectionsViewSettings,
} from '@rahrow/core/storage/json-store.ts'

export const STANDALONE_CONNECTION_GROUP = 'standalone'

export function subscriptionConnectionGroup(id: string): string {
	return `subscription:${id}`
}

export function orphanedConnectionGroup(id: string): string {
	return `orphaned:${id}`
}

export function defaultConnectionsView(): ConnectionsViewSettings {
	return {
		version: 1,
		groupOpen: {},
		query: '',
		sort: 'default',
	}
}

export function restoredConnectionsView(
	value: ConnectionsViewSettings | undefined,
): ConnectionsViewSettings {
	if (!value) return defaultConnectionsView()

	return {
		version: 1,
		groupOpen: { ...value.groupOpen },
		query: value.query,
		sort: value.sort,
		...(value.hideUnreachable ? { hideUnreachable: true } : {}),
		scrollOffset: value.scrollOffset,
		loadedProfileCount: value.loadedProfileCount,
	}
}

export function isConnectionGroupOpen(
	view: ConnectionsViewSettings,
	key: string,
): boolean {
	return view.groupOpen[key] ?? true
}

export function setConnectionGroupOpen(
	view: ConnectionsViewSettings,
	key: string,
	open: boolean,
): ConnectionsViewSettings {
	if (view.groupOpen[key] === open) return view

	return {
		...view,
		groupOpen: { ...view.groupOpen, [key]: open },
	}
}

export function setConnectionsQuery(
	view: ConnectionsViewSettings,
	query: string,
): ConnectionsViewSettings {
	const nextQuery = query.slice(0, 500)
	return view.query === nextQuery ? view : { ...view, query: nextQuery }
}

export function setConnectionsSort(
	view: ConnectionsViewSettings,
	sort: ConnectionsSort,
): ConnectionsViewSettings {
	return view.sort === sort ? view : { ...view, sort }
}

export function setConnectionsHideUnreachable(
	view: ConnectionsViewSettings,
	hideUnreachable: boolean,
): ConnectionsViewSettings {
	if (Boolean(view.hideUnreachable) === hideUnreachable) return view
	return hideUnreachable
		? { ...view, hideUnreachable: true }
		: { ...view, hideUnreachable: undefined }
}

export function setConnectionsViewport(
	view: ConnectionsViewSettings,
	viewport: {
		readonly scrollOffset: number
		readonly loadedProfileCount: number
	},
): ConnectionsViewSettings {
	const scrollOffset = Math.max(0, viewport.scrollOffset)
	const loadedProfileCount = Math.max(1, Math.floor(viewport.loadedProfileCount))
	if (
		view.scrollOffset === scrollOffset &&
		view.loadedProfileCount === loadedProfileCount
	)
		return view

	return { ...view, scrollOffset, loadedProfileCount }
}

export function pruneConnectionGroups(
	view: ConnectionsViewSettings,
	activeKeys: ReadonlySet<string>,
): ConnectionsViewSettings {
	const groupOpen = Object.fromEntries(
		Object.entries(view.groupOpen).filter(([key]) => activeKeys.has(key)),
	)

	if (
		Object.keys(groupOpen).length === Object.keys(view.groupOpen).length &&
		Object.keys(groupOpen).every((key) => groupOpen[key] === view.groupOpen[key])
	) {
		return view
	}

	return { ...view, groupOpen }
}
