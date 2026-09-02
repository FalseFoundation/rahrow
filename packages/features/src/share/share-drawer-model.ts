export function qrPngFilename(value?: string): string {
	const filename = (value ?? 'rahrow-connection').split(/[\\/]/).at(-1) ?? ''
	const withoutExtension = filename.trim().replace(/\.png$/i, '')
	const safeBase = withoutExtension
		.normalize('NFKC')
		.replace(/[\p{Cc}<>:"/\\|?*]+/gu, '-')
		.replace(/^\.+/, '')
		.replace(/[. -]+$/g, '')
		.replace(/\s+/g, ' ')
		.slice(0, 80)

	return `${safeBase || 'rahrow-connection'}.png`
}

export function shouldUseMultilineShareValue(value: string): boolean {
	return value.length > 100 || /[\r\n]/.test(value)
}
