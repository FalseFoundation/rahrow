import { describe, expect, it } from 'vitest'
import {
	capConnectionVirtualIndexes,
	connectionGroupEnd,
	estimateConnectionRowSize,
	FIRST_PROFILE_PADDING,
	flattenConnectionGroups,
	nextLoadedProfileCount,
	PROFILE_ROW_ESTIMATE,
	profileIndexById,
	shouldFloatConnectionHeader,
	shouldPageConnectionProfiles,
} from './profile-list-virtual-model.ts'

describe('profile list virtual model', () => {
	it('flattens open groups into stable header and profile rows', () => {
		const rows = flattenConnectionGroups([
			{
				key: 'subscription:alpha',
				open: true,
				profiles: [{ id: 'one' }, { id: 'two' }],
			},
			{
				key: 'subscription:beta',
				open: false,
				profiles: [{ id: 'three' }],
			},
		])

		expect(rows.map((row) => row.key)).toEqual([
			'group:subscription:alpha',
			'profile:subscription:alpha:one',
			'profile:subscription:alpha:two',
			'gap:subscription:beta',
			'group:subscription:beta',
		])
		expect(
			rows.filter((row) => row.kind === 'group').map((row) => row.index),
		).toEqual([0, 4])
	})

	it('gives every open group its own profile page without collapsing later groups', () => {
		const rows = flattenConnectionGroups(
			[
				{
					key: 'subscription:alpha',
					open: true,
					profiles: Array.from({ length: 400 }, (_, index) => ({
						id: `alpha-${index}`,
					})),
				},
				{
					key: 'subscription:beta',
					open: true,
					profiles: Array.from({ length: 400 }, (_, index) => ({
						id: `beta-${index}`,
					})),
				},
			],
			250,
		)

		expect(rows).toHaveLength(503)
		expect(rows[251]?.key).toBe('gap:subscription:beta')
		expect(rows[252]?.key).toBe('group:subscription:beta')
		expect(rows[253]?.key).toBe('profile:subscription:beta:beta-0')
		expect(rows.at(-1)?.key).toBe('profile:subscription:beta:beta-249')
		expect(nextLoadedProfileCount(250, 401)).toBe(401)
		expect(nextLoadedProfileCount(500, 401)).toBe(401)
	})

	it('finds stable focus anchors after sorting or replacement', () => {
		const profiles = [{ id: 'zeta' }, { id: 'alpha' }, { id: 'wire' }]
		expect(profileIndexById(profiles, 'alpha')).toBe(1)
		expect(profileIndexById([...profiles].reverse(), 'alpha')).toBe(1)
		expect(profileIndexById(profiles, 'missing')).toBe(-1)
	})

	it('ends a group at its final connection instead of the next header', () => {
		expect(connectionGroupEnd(300, 900)).toBe(272)
		expect(connectionGroupEnd(undefined, 900)).toBe(900)
	})

	it('floats expanded groups from the app-header edge through their final item', () => {
		expect(shouldFloatConnectionHeader(true, 179, 250, 900, 72)).toBe(true)
		expect(shouldFloatConnectionHeader(true, 178, 250, 900, 72)).toBe(false)
		expect(shouldFloatConnectionHeader(true, 828, 250, 900, 72)).toBe(false)
		expect(shouldFloatConnectionHeader(false, 179, 250, 900, 72)).toBe(false)
	})

	it('estimates first profile padding without dynamic measurement', () => {
		expect(
			estimateConnectionRowSize({
				kind: 'profile',
				key: 'profile:group:a',
				groupKey: 'group',
				profile: { id: 'a' },
				position: 1,
				setSize: 10,
				index: 1,
			}),
		).toBe(PROFILE_ROW_ESTIMATE + FIRST_PROFILE_PADDING)
		expect(
			estimateConnectionRowSize({
				kind: 'profile',
				key: 'profile:group:b',
				groupKey: 'group',
				profile: { id: 'b' },
				position: 2,
				setSize: 10,
				index: 2,
			}),
		).toBe(PROFILE_ROW_ESTIMATE)
	})

	it('caps an unbounded virtual range while preserving sticky headers', () => {
		expect(capConnectionVirtualIndexes([0, 250, 251, 252, 253, 254])).toEqual([
			0, 250, 251, 252, 253, 254,
		])
		const dense = Array.from({ length: 80 }, (_, index) => index)
		expect(capConnectionVirtualIndexes([0, 400, ...dense.map((i) => i + 401)])).toEqual([
			0,
			400,
			...Array.from({ length: 30 }, (_, index) => index + 401),
		])
	})

	it('pages only with a usable viewport near the loaded tail', () => {
		expect(
			shouldPageConnectionProfiles({
				loadedProfileCount: 250,
				totalProfiles: 1_750,
				lastVirtualIndex: 248,
				rowCount: 251,
				viewportHeight: 640,
			}),
		).toBe(true)
		expect(
			shouldPageConnectionProfiles({
				loadedProfileCount: 250,
				totalProfiles: 1_750,
				lastVirtualIndex: 248,
				rowCount: 251,
				viewportHeight: 0,
			}),
		).toBe(false)
		expect(
			shouldPageConnectionProfiles({
				loadedProfileCount: 250,
				totalProfiles: 1_750,
				lastVirtualIndex: 12,
				rowCount: 251,
				viewportHeight: 640,
			}),
		).toBe(false)
	})
})
