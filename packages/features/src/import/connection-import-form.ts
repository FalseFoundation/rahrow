import { z } from 'zod'

export interface ConnectionImportFormValues {
	readonly url: string
}

export const connectionImportFormSchema: z.ZodType<
	ConnectionImportFormValues,
	ConnectionImportFormValues
> = z.strictObject({
	url: z
		.string()
		.refine((value) => Boolean(value.trim()), 'Connection URL is required')
		.refine((value) => {
			try {
				return Boolean(new URL(value.trim()).protocol)
			} catch {
				return false
			}
		}, 'Enter a valid connection or subscription URL'),
})
