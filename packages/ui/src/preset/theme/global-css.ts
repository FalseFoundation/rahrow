import { defineGlobalStyles } from '@pandacss/dev'

export const globalCss = defineGlobalStyles({
	extend: {
		'*': {
			'--global-color-border': 'colors.border',
			'--global-color-placeholder': 'colors.fg.subtle',
			'--global-color-selection': 'colors.colorPalette.subtle.bg',
			'--global-color-focus-ring': 'colors.colorPalette.solid.bg',
		},
		html: {
			colorPalette: 'gray',
		},
		body: {
			background: 'canvas',
			color: 'fg.default',
		},
	},
})
