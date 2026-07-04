import { badge } from './recipes/badge'
import { button } from './recipes/button'
import { checkmarkRecipe } from './recipes/checkmark'
import { code } from './recipes/code'
import { colorSwatchRecipe } from './recipes/color-swatch'
import { containerRecipe } from './recipes/container'
import { dividerRecipe } from './recipes/divider'
import { heading } from './recipes/heading'
import { icon } from './recipes/icon'
import { input } from './recipes/input'
import { inputAddon } from './recipes/input-addon'
import { kbd } from './recipes/kbd'
import { link } from './recipes/link'
import { radiomarkRecipe } from './recipes/radiomark'
import { skeleton } from './recipes/skeleton'
import { spinner } from './recipes/spinner'
import { textarea } from './recipes/textarea'

export const recipes = {
	badge: badge,
	button: button,
	code: code,
	container: containerRecipe,
	heading: heading,
	input: input,
	inputAddon: inputAddon,
	kbd: kbd,
	link: link,
	divider: dividerRecipe,
	skeleton: skeleton,
	spinner: spinner,
	textarea: textarea,
	icon: icon,
	checkmark: checkmarkRecipe,
	radiomark: radiomarkRecipe,
	colorSwatch: colorSwatchRecipe,
}
