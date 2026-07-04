import { defineRecipe } from '@pandacss/dev'

export const formLabel = defineRecipe({
	className: 'form-label',
	base: {
		color: 'fg.default',
		fontWeight: 'normal',
	},
	defaultVariants: {
		size: 'md',
	},
	variants: {
		size: {
			sm: {
				textStyle: 'sm',
			},
			md: {
				textStyle: 'sm',
			},
			lg: {
				textStyle: 'sm',
			},
			xl: {
				textStyle: 'md',
			},
		},
	},
})
