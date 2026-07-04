import * as slugifyDefault from 'slugify'

const slugify = slugifyDefault.default || slugifyDefault

export function generateSlug(value: string): string {
	return slugify(value, { lower: true, strict: true, trim: true })
}
