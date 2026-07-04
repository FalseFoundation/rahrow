import type { Metadata } from 'next'
import Link from 'next/link'
import { Footer, Layout, ThemeSwitch } from 'nextra-theme-blog'
import 'nextra-theme-blog/style.css'
import type { ReactNode } from 'react'
import { FooterContent } from '../../../shared/FooterContent'

export const metadata: Metadata = {
	title: {
		default: 'RahRow Blog',
		template: '%s | RahRow Blog',
	},
	description: 'News and release notes from the RahRow project.',
}

export default function BlogLayout({ children }: { children: ReactNode }) {
	return (
		<Layout>
			<header
				className='not-prose'
				style={{
					alignItems: 'center',
					display: 'flex',
					gap: '1rem',
					justifyContent: 'space-between',
					marginBottom: '3rem',
				}}
			>
				<Link href='/' style={{ color: 'inherit', fontSize: '1.125rem', textDecoration: 'none' }}>
					<b>RahRow</b>
				</Link>
				<nav style={{ alignItems: 'center', display: 'flex', gap: '1rem' }}>
					<Link href='/'>Docs</Link>
					<ThemeSwitch />
				</nav>
			</header>
			{children}
			<Footer>
				<FooterContent />
			</Footer>
		</Layout>
	)
}
