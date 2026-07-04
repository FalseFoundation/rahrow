'use client'
import { AngleSlider } from '@ark-ui/react/angle-slider'
import type { ComponentProps } from 'react'
import { createStyleContext } from 'styled-system/jsx'
import { angleSlider } from 'styled-system/recipes'

const { withProvider, withContext } = createStyleContext(angleSlider)

export type RootProps = ComponentProps<typeof Root>
export const Root = withProvider(AngleSlider.Root, 'root')
export const RootProvider = withProvider(AngleSlider.RootProvider, 'root')
export const Control = withContext(AngleSlider.Control, 'control')
export const HiddenInput = AngleSlider.HiddenInput
export const Label = withContext(AngleSlider.Label, 'label')
export const Marker = withContext(AngleSlider.Marker, 'marker')
export const MarkerGroup = withContext(AngleSlider.MarkerGroup, 'markerGroup')
export const Thumb = withContext(AngleSlider.Thumb, 'thumb')
export const ValueText = withContext(AngleSlider.ValueText, 'valueText')

export { AngleSliderContext as Context } from '@ark-ui/react/angle-slider'
