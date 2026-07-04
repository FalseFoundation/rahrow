interface ParseYesNoOptions {
	defaultValue?: boolean
}

export default function yn(value: unknown, options: ParseYesNoOptions = {}): boolean | undefined {
	const { defaultValue } = options

	if (defaultValue !== undefined && typeof defaultValue !== 'boolean') {
		throw new TypeError(
			`Expected the \`defaultValue\` option to be of type \`boolean\`, got \`${typeof defaultValue}\``,
		)
	}

	if (value == null) {
		return defaultValue
	}

	const normalizedValue = String(value).trim().toLowerCase()

	if (['y', 'yes', 'true', '1', 'on'].includes(normalizedValue)) {
		return true
	}

	if (['n', 'no', 'false', '0', 'off'].includes(normalizedValue)) {
		return false
	}

	return defaultValue
}
