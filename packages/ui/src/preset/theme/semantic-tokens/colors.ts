import { defineSemanticTokens } from '@pandacss/dev'
import { colors as colorPalettes } from '../colors'

export const semanticColors = defineSemanticTokens.colors({
	...colorPalettes,
	// aliases
	fg: {
		default: {
			value: {
				_light: '{colors.colorPalette.12}',
				_dark: '{colors.colorPalette.12}',
			},
		},
		muted: {
			value: {
				_light: '{colors.colorPalette.11}',
				_dark: '{colors.colorPalette.11}',
			},
		},
		subtle: {
			value: {
				_light: '{colors.colorPalette.10}',
				_dark: '{colors.colorPalette.10}',
			},
		},
	},
	canvas: {
		value: {
			_light: '{colors.colorPalette.1}',
			_dark: '{colors.colorPalette.1}',
		},
	},
	border: {
		value: {
			_light: '{colors.colorPalette.a3}',
			_dark: '{colors.colorPalette.a3}',
		},
	},
	error: { value: { _light: '{colors.red.9}', _dark: '{colors.red.9}' } },
	success: { value: { _light: '{colors.green.9}', _dark: '{colors.green.9}' } },
	info: { value: { _light: '{colors.blue.9}', _dark: '{colors.blue.9}' } },
	warning: {
		value: { _light: '{colors.yellow.9}', _dark: '{colors.yellow.9}' },
	},
	// deprecated
	// bg: {
	// 	subtle: {
	// 		value: {
	// 			_light: '{colors.colorPalette.2}',
	// 			_dark: '{colors.colorPalette.3}',
	// 		},
	// 	},
	// },
})
