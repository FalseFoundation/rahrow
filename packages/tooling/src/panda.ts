import { defineConfig } from '@pandacss/dev'
import type { Config } from '@pandacss/types'

const COLOR_PALETTES = [
	'amber',
	'blue',
	'bronze',
	'brown',
	'crimson',
	'cyan',
	'gold',
	'grass',
	'green',
	'indigo',
	'iris',
	'jade',
	'lime',
	'mauve',
	'mint',
	'gray',
	'olive',
	'orange',
	'pink',
	'plum',
	'purple',
	'red',
	'ruby',
	'sage',
	'sand',
	'sky',
	'slate',
	'teal',
	'tomato',
	'violet',
	'yellow',
] as const

export function createPandaConfig(config: Config): Config {
	return defineConfig({
		preflight: true,
		exclude: ['**/node_modules/**'],
		outdir: 'styled-system',
		logLevel: 'info',
		// Avoid deleting generated modules during dev rebuilds, which can crash bundlers.
		clean: false,
		watch: true,
		hash: false,
		minify: process.env.NODE_ENV === 'production',
		staticCss: {
			extend: {
				recipes: '*',
			},
			css: [
				{
					properties: {
						maxW: ['sm', 'md', 'lg'],
						pt: [2],
						colorPalette: [...COLOR_PALETTES],
					},
				},
			],
		},
		...config,
	})
}
