'use client'
import type { Assign } from '@ark-ui/react'
import { QrCode } from '@ark-ui/react/qr-code'
import { createStyleContext } from 'styled-system/jsx'
import { type QrCodeVariantProps, qrCode } from 'styled-system/recipes'
import type { ComponentProps, HTMLStyledProps } from 'styled-system/types'

const { withProvider, withContext } = createStyleContext(qrCode)

export type RootProviderProps = ComponentProps<typeof RootProvider>
export const RootProvider = withProvider(QrCode.RootProvider, 'root')

export type RootProps = ComponentProps<typeof Root>
export const Root = withProvider(QrCode.Root, 'root')

export const Frame = withContext(QrCode.Frame, 'frame')

export const Overlay = withContext(QrCode.Overlay, 'overlay')

export const Pattern = withContext(QrCode.Pattern, 'pattern')

export { QrCodeContext as Context } from '@ark-ui/react/qr-code'
