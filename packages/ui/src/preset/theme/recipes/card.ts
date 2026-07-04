import { defineSlotRecipe } from '@pandacss/dev'

export const card = defineSlotRecipe({
	className: 'card',
	slots: ['root', 'header', 'body', 'footer', 'title', 'description'],
	base: {
		root: {
			borderRadius: 'l3',
			display: 'flex',
			flexDirection: 'column',
			overflow: 'hidden',
			focusVisibleRing: 'outside',
			position: 'relative',
		},
		header: {
			display: 'flex',
			flexDirection: 'column',
		},
		body: {
			display: 'flex',
			flex: '1',
			flexDirection: 'column',
		},
		footer: {
			display: 'flex',
			justifyContent: 'flex-end',
		},
		title: {
			textStyle: 'lg',
			fontWeight: 'medium',
		},
		description: {
			color: 'fg.muted',
			textStyle: 'sm',
		},
	},
	defaultVariants: {
		variant: 'outline',
		size: 'md',
	},
	variants: {
		variant: {
			elevated: {
				root: {
					bg: 'colorPalette.surface.bg',
					boxShadow: 'lg',
				},
			},
			outline: {
				root: {
					bg: 'colorPalette.surface.bg',
					borderWidth: '1px',
				},
			},
			subtle: {
				root: {
					bg: 'colorPalette.subtle.bg',
				},
			},
			pointer: {
				root: {
					// bg: 'colorPalette.surface.bg',
					color: 'colorPalette.subtle.fg',
					borderWidth: '1px',
					// borderColor: 'colorPalette.surface.border',
					cursor: 'pointer',
					transition: 'colors',
					_hover: {
						bg: 'colorPalette.subtle.bg.hover',
					},
					_active: {
						bg: 'colorPalette.subtle.bg.active',
					},
					_on: {
						bg: 'colorPalette.subtle.bg.active',
					},
				},
			},
			'surface-pointer': {
				root: {
					bg: 'colorPalette.surface.bg',
					color: 'colorPalette.subtle.fg',
					borderWidth: '1px',
					// borderColor: 'colorPalette.surface.border',
					cursor: 'pointer',
					transition: 'colors',
					_hover: {
						bg: 'colorPalette.subtle.bg.hover',
					},
					_active: {
						bg: 'colorPalette.subtle.bg.active',
					},
					_on: {
						bg: 'colorPalette.subtle.bg.active',
					},
				},
			},
			'subtle-pointer': {
				root: {
					bg: 'colorPalette.subtle.bg',
					color: 'colorPalette.subtle.fg',
					cursor: 'pointer',
					transition: 'colors',
					_hover: {
						bg: 'colorPalette.subtle.bg.hover',
					},
					_active: {
						bg: 'colorPalette.subtle.bg.active',
					},
					_on: {
						bg: 'colorPalette.subtle.bg.active',
					},
				},
			},
		},
		size: {
			sm: {
				header: {
					gap: '1',
					p: '3',
				},
				body: {
					pb: '1.5',
					px: '3',
				},
				footer: {
					gap: '3',
					pb: '3',
					pt: '1.5',
					px: '3',
				},
			},
			md: {
				header: {
					gap: '1',
					p: '6',
				},
				body: {
					pb: '6',
					px: '6',
				},
				footer: {
					gap: '3',
					pb: '6',
					pt: '2',
					px: '6',
				},
			},
		},
	},
})
