import type { Metadata } from 'next'
import { Head } from 'nextra/components'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
	title: {
		default: 'RahRow',
		template: '%s | RahRow',
	},
	description: 'Cross-platform, privacy-first V2Ray client platform.',
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang='en' dir='ltr' suppressHydrationWarning>
			<Head />
			<body>{children}</body>
		</html>
	)
}
