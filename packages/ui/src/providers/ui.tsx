import { Box } from 'styled-system/jsx'
import { ColorModeProvider } from '../components/color-mode'
import { Toaster } from '../components/styled/toast'
import { colors } from '../preset/theme/colors'

export const UIProvider = ({ children }: { children: React.ReactNode }) => {
	return (
		<ColorModeProvider>
			<>{children}</>

			<Toaster />
		</ColorModeProvider>
	)
}
