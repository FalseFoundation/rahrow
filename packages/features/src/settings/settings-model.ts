export interface CapabilityAvailability {
	readonly supported: boolean
	readonly detail?: string
}

export function persistableBoolean(
	requested: boolean,
	availability: CapabilityAvailability | undefined,
): boolean {
	return requested && availability?.supported === true
}

export function toggleDisabled(
	availability: CapabilityAvailability | undefined,
): boolean {
	return availability?.supported !== true
}

export function settingsQueryMatches(
	query: string,
	terms: readonly string[],
): boolean {
	const normalized = query.trim().toLowerCase()
	return (
		normalized.length === 0 ||
		terms.some((term) => term.toLowerCase().includes(normalized))
	)
}
