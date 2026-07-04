import { defineRecipe } from '@pandacss/dev'

export const textarea = defineRecipe({
	className: 'textarea',
	base: {
		appearance: 'none',
		borderRadius: 'l2',
		minWidth: '0',
		outline: '0',
		position: 'relative',
		transition: 'colors',
		transitionProperty: 'box-shadow, border-color',
		width: '100%',
		_disabled: {
			layerStyle: 'disabled',
		},
	},
	defaultVariants: {
		size: 'md',
		variant: 'surface',
	},
	variants: {
		variant: {
			outline: {
				borderWidth: '1px',
				borderColor: 'colorPalette.outline.border',
				focusVisibleRing: 'inside',
				_invalid: {
					borderColor: 'error',
					focusRingColor: 'error',
				},
			},
			surface: {
				bg: 'colorPalette.surface.bg',
				borderWidth: '1px',
				borderColor: 'colorPalette.surface.border',
				focusVisibleRing: 'inside',
				_invalid: {
					borderColor: 'error',
					focusRingColor: 'error',
				},
			},
			subtle: {
				borderWidth: '1px',
				borderColor: 'transparent',
				bg: 'colorPalette.subtle.bg',
				color: 'colorPalette.subtle.fg',
				focusVisibleRing: 'inside',
				_invalid: {
					borderColor: 'error',
					focusRingColor: 'error',
				},
			},
			flushed: {
				borderBottomWidth: '1px',
				borderBottomColor: 'colorPalette.outline.border',
				borderRadius: '0',
				color: 'fg.default',
				px: '0',
				_invalid: {
					borderColor: 'error',
				},
				_focus: {
					borderColor: 'colorPalette.solid.bg',
					boxShadowColor: 'colorPalette.solid.bg',
					boxShadow: '0 1px 0 0 var(--shadow-color)',
					_invalid: {
						borderColor: 'error',
						boxShadowColor: 'error',
					},
				},
			},
		},
		size: {
			xs: { textStyle: 'sm', px: '2', py: '5px', scrollPaddingBottom: '5px' },
			sm: { textStyle: 'sm', px: '2.5', py: '7px', scrollPaddingBottom: '7px' },
			md: { textStyle: 'md', px: '3', py: '7px', scrollPaddingBottom: '7px' },
			lg: { textStyle: 'md', px: '3.5', py: '9px', scrollPaddingBottom: '9px' },
			xl: { textStyle: 'lg', px: '4', py: '9px', scrollPaddingBottom: '9px' },
		},
	},
})
