'use client'

// import { IconMoonStarsLinear } from '@rahrow/icons/IconMoonStars'
// import { IconSunLinear } from '@rahrow/icons/IconSun'
import { Moon, Sun } from 'lucide-react'
import { ThemeProvider, type ThemeProviderProps, useTheme } from 'next-themes'
import { forwardRef } from 'react'
import { IconButton, type IconButtonProps } from './icon-button'
import { Skeleton } from './skeleton'

export function ColorModeProvider(props: ThemeProviderProps) {
	return <ThemeProvider attribute='class' disableTransitionOnChange {...props} />
}

export function useColorMode() {
	const { resolvedTheme, setTheme } = useTheme()
	const toggleColorMode = () => {
		setTheme(resolvedTheme === 'light' ? 'dark' : 'light')
	}
	return {
		colorMode: resolvedTheme,
		setColorMode: setTheme,
		toggleColorMode,
	}
}

export function useColorModeValue<T>(light: T, dark: T) {
	const { colorMode } = useColorMode()
	return colorMode === 'light' ? light : dark
}

export function ColorModeIcon() {
	const { colorMode } = useColorMode()
	return colorMode === 'light' ? <Sun /> : <Moon />
}

type ColorModeButtonProps = Omit<IconButtonProps, 'aria-label'>

export const ColorModeButton = forwardRef<HTMLButtonElement, ColorModeButtonProps>(
	function ColorModeButton(props, ref) {
		const { toggleColorMode } = useColorMode()
		return (
			<IconButton
				onClick={toggleColorMode}
				variant='plain'
				aria-label='Toggle color mode'
				ref={ref}
				{...props}
				// rounded={'full'}
				size={'sm'}
				css={{
					_icon: {
						width: '5',
						height: '5',
					},
				}}
			>
				<ColorModeIcon />
			</IconButton>
		)
	},
)
