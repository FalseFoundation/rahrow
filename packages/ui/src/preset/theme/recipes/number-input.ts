import { numberInputAnatomy } from '@ark-ui/react/number-input'
import { defineSlotRecipe } from '@pandacss/dev'
import { input } from './input'

const trigger = {
	alignItems: 'center',
	color: 'fg.muted',
	cursor: 'pointer',
	display: 'flex',
	flex: '1',
	justifyContent: 'center',
	lineHeight: '1',
	transition: 'common',
	userSelect: 'none',
	_icon: {
		boxSize: '1em',
	},
	_hover: {
		bg: 'colorPalette.surface.bg.hover',
	},
	_active: {
		bg: 'colorPalette.surface.bg.active',
	},
}

export const numberInput = defineSlotRecipe({
	className: 'number-input',
	slots: numberInputAnatomy.keys(),
	base: {
		root: {
			isolation: 'isolate',
			position: 'relative',
			_disabled: {
				layerStyle: 'disabled',
			},
		},
		control: {
			borderStartWidth: '1px',
			display: 'flex',
			divideY: '1px',
			flexDirection: 'column',
			//   h:'full',
			//   height: 'calc(100% - 2px)',
			insetEnd: '0px',
			marginY: '3px',
			marginX: '1px',
			position: 'absolute',
			//   top: '0',
			//   width: 'var(--stepper-width)',
			zIndex: '1',
		},
		input: {
			...input.base,
			verticalAlign: 'top',
			pe: 'calc(var(--stepper-width) + 0.5rem)',
		},
		label: {
			color: 'fg.default',
			fontWeight: 'normal',
		},
		incrementTrigger: {
			...trigger,
			borderTopRightRadius: 'l2',
		},
		decrementTrigger: {
			...trigger,
			borderBottomRightRadius: 'l2',
		},
	},
	defaultVariants: {
		size: 'md',
		variant: 'outline',
	},
	variants: {
		size: {
			sm: {
				control: {
					'--stepper-width': 'sizes.4.5',
				},
				input: input.variants.size.sm,
			},
			md: {
				control: {
					'--stepper-width': 'sizes.5',
				},
				input: input.variants.size.md,
			},
			lg: {
				control: {
					'--stepper-width': 'sizes.5.5',
				},
				input: input.variants.size.lg,
			},
			xl: {
				control: {
					'--stepper-width': 'sizes.6',
				},
				input: input.variants.size.xl,
			},
		},
		variant: {
			outline: {
				input: input.variants.variant.outline,
			},
			surface: {
				input: input.variants.variant.surface,
			},
		},
	},
})
