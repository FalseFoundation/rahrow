export const PROFILE_ROW_ESTIMATE = 60
export const CONNECTION_GROUP_ESTIMATE = 78
export const CONNECTION_GROUP_GAP = 28
export const CONNECTION_PROFILE_PAGE_SIZE = 250

export interface ConnectionVirtualGroup<
	TProfile extends { readonly id: string },
> {
	readonly key: string
	readonly open: boolean
	readonly profiles: readonly TProfile[]
}

export type ConnectionVirtualRow<TProfile extends { readonly id: string }> =
	| {
			readonly kind: 'gap'
			readonly key: string
			readonly groupKey: string
			readonly index: number
	  }
	| {
			readonly kind: 'group'
			readonly key: string
			readonly groupKey: string
			readonly index: number
	  }
	| {
			readonly kind: 'profile'
			readonly key: string
			readonly groupKey: string
			readonly profile: TProfile
			readonly position: number
			readonly setSize: number
			readonly index: number
	  }

export function flattenConnectionGroups<
	TProfile extends { readonly id: string },
>(
	groups: readonly ConnectionVirtualGroup<TProfile>[],
	loadedProfileCount = Number.POSITIVE_INFINITY,
): readonly ConnectionVirtualRow<TProfile>[] {
	const rows: ConnectionVirtualRow<TProfile>[] = []
	const loadedProfilesPerGroup = Math.max(0, loadedProfileCount)

	for (const group of groups) {
		if (rows.length > 0) {
			rows.push({
				kind: 'gap',
				key: `gap:${group.key}`,
				groupKey: group.key,
				index: rows.length,
			})
		}
		rows.push({
			kind: 'group',
			key: `group:${group.key}`,
			groupKey: group.key,
			index: rows.length,
		})
		if (!group.open || loadedProfilesPerGroup === 0) continue

		const visibleProfiles = group.profiles.slice(0, loadedProfilesPerGroup)
		for (const [profileIndex, profile] of visibleProfiles.entries()) {
			rows.push({
				kind: 'profile',
				key: `profile:${group.key}:${profile.id}`,
				groupKey: group.key,
				profile,
				position: profileIndex + 1,
				setSize: group.profiles.length,
				index: rows.length,
			})
		}
	}

	return rows
}

export function nextLoadedProfileCount(
	current: number,
	total: number,
	pageSize = CONNECTION_PROFILE_PAGE_SIZE,
): number {
	return Math.min(total, Math.max(1, current) + Math.max(1, pageSize))
}

export function profileIndexById(
	profiles: readonly { readonly id: string }[],
	profileId: string,
): number {
	return profiles.findIndex(({ id }) => id === profileId)
}

export function connectionGroupEnd(
	nextHeaderStart: number | undefined,
	collectionEnd: number,
): number {
	return nextHeaderStart === undefined
		? collectionEnd
		: nextHeaderStart - CONNECTION_GROUP_GAP
}

export function shouldFloatConnectionHeader(
	open: boolean,
	scrollOffset: number,
	headerStart: number,
	groupEnd: number,
	fixedInset: number,
): boolean {
	const fixedEdgeOffset = scrollOffset + fixedInset
	return open && fixedEdgeOffset > headerStart && fixedEdgeOffset < groupEnd
}
