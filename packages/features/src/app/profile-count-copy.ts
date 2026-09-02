export function formatProfileCount(count: number): string {
	return `Imported ${count} profile${count === 1 ? '' : 's'}`
}
