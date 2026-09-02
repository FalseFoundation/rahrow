import type { VirtualItem } from '@tanstack/react-virtual'
import { Store } from '@tanstack/store'

export interface ConnectionsViewportSnapshot {
	readonly signature: string
	readonly scrollOffset: number
	readonly loadedProfileCount: number
	readonly measurements: readonly VirtualItem[]
	readonly focusedProfileId?: string
}

interface ConnectionsViewportState {
	readonly snapshot?: ConnectionsViewportSnapshot
}

export const connectionsViewportStore = new Store<ConnectionsViewportState>({})

export function saveConnectionsViewportSnapshot(
	snapshot: ConnectionsViewportSnapshot,
): void {
	connectionsViewportStore.setState(() => ({ snapshot }))
}

export function clearConnectionsViewportSnapshot(): void {
	connectionsViewportStore.setState(() => ({}))
}
