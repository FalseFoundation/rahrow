export const PROFILE_ROW_ESTIMATE = 60
/** Matches `.virtualProfile[data-first-profile]` padding-block-start (`spacing * 2.25`). */
export const FIRST_PROFILE_PADDING = 9
export const CONNECTION_GROUP_ESTIMATE = 78
export const CONNECTION_GROUP_GAP = 28
export const CONNECTION_PROFILE_PAGE_SIZE = 250
/** Hard cap so an unbounded scroll rect cannot mount the full subscription. */
export const CONNECTION_VIRTUAL_RANGE_CAP = 32

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

export function estimateConnectionRowSize<
	TProfile extends { readonly id: string },
>(row: ConnectionVirtualRow<TProfile> | undefined): number {
	if (row?.kind === 'group') return CONNECTION_GROUP_ESTIMATE
	if (row?.kind === 'gap') return CONNECTION_GROUP_GAP
	if (row?.kind === 'profile' && row.position === 1) {
		return PROFILE_ROW_ESTIMATE + FIRST_PROFILE_PADDING
	}
	return PROFILE_ROW_ESTIMATE
}

/**
 * Keeps sticky/sparse indexes, then caps the contiguous scroll window so a
 * broken scroll owner (height ≈ content height) cannot mount thousands of rows.
 */
export function capConnectionVirtualIndexes(
	indexes: readonly number[],
	maxSpan = CONNECTION_VIRTUAL_RANGE_CAP,
): number[] {
	const span = Math.max(1, Math.floor(maxSpan))
	if (indexes.length <= span) return [...indexes]

	const sorted = [...new Set(indexes)].sort((left, right) => left - right)
	let runStart = 0
	let bestStart = 0
	let bestLength = 1
	for (let index = 1; index <= sorted.length; index += 1) {
		const endsRun =
			index === sorted.length || sorted[index] !== sorted[index - 1]! + 1
		if (!endsRun) continue
		const length = index - runStart
		if (length >= bestLength) {
			bestStart = runStart
			bestLength = length
		}
		runStart = index
	}

	const sticky = sorted.slice(0, bestStart)
	const runBudget = Math.max(1, span - sticky.length)
	return [...sticky, ...sorted.slice(bestStart, bestStart + runBudget)]
}

export function shouldPageConnectionProfiles(input: {
	readonly loadedProfileCount: number
	readonly totalProfiles: number
	readonly lastVirtualIndex: number
	readonly rowCount: number
	readonly viewportHeight: number
}): boolean {
	if (input.loadedProfileCount >= input.totalProfiles) return false
	if (input.viewportHeight < 32) return false
	if (input.lastVirtualIndex < 0 || input.rowCount <= 0) return false
	return input.lastVirtualIndex >= input.rowCount - 4
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
