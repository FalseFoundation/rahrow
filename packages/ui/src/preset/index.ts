import { definePlugin, definePreset } from '@pandacss/dev'
import type { PandaPlugin, Preset } from '@pandacss/types'
import { animationStyles } from './theme/animation-styles'
import { breakpoints } from './theme/breakpoints'
import { conditions } from './theme/conditions'
import { globalCss } from './theme/global-css'
import { keyframes } from './theme/keyframes'
import { layerStyles } from './theme/layer-styles'
import { recipes, slotRecipes } from './theme/recipes/index'
import { semanticColors } from './theme/semantic-tokens/colors'
import { semanticRadii } from './theme/semantic-tokens/radii'
import { semanticShadows } from './theme/semantic-tokens/shadows'
import { textStyles } from './theme/text-styles'
import { animations } from './theme/tokens/animations'
import { aspectRatios } from './theme/tokens/aspect-ratios'
import { blurs } from './theme/tokens/blurs'
import { borders } from './theme/tokens/borders'
import { colors } from './theme/tokens/colors'
import { cursor } from './theme/tokens/cursor'
import { durations } from './theme/tokens/durations'
import { easings } from './theme/tokens/easings'
import { fontSizes } from './theme/tokens/font-sizes'
import { fontWeights } from './theme/tokens/font-weights'
import { fonts } from './theme/tokens/fonts'
import { letterSpacings } from './theme/tokens/letter-spacing'
import { lineHeights } from './theme/tokens/line-heights'
import { radii } from './theme/tokens/radius'
import { sizes } from './theme/tokens/sizes'
import { spacing } from './theme/tokens/spacing'
import { zIndices } from './theme/tokens/z-indices'

export const tokens = {
	aspectRatios,
	animations,
	blurs,
	borders,
	colors,
	durations,
	easings,
	fonts,
	fontSizes,
	fontWeights,
	letterSpacings,
	lineHeights,
	radii,
	spacing,
	sizes,
	zIndex: zIndices,
	cursor,
}

export const semanticTokens = {
	colors: semanticColors,
	shadows: semanticShadows,
	radii: semanticRadii,
}

export const preset: Preset = definePreset({
	name: '@rahrow/ui/preset',
	presets: ['@pandacss/preset-base', '@pandacss/preset-panda'],
	globalCss,
	conditions,
	theme: {
		breakpoints,
		keyframes,
		tokens,
		semanticTokens,
		recipes,
		slotRecipes,
		textStyles,
		layerStyles,
		animationStyles,
	},
})

export const plugin: PandaPlugin = definePlugin({
	name: 'Remove Panda Preset Colors',
	hooks: {
		'preset:resolved': ({ utils, preset, name }) =>
			name === '@pandacss/preset-panda'
				? utils.omit(preset, ['theme.tokens.colors', 'theme.semanticTokens.colors'])
				: preset,
	},
})
