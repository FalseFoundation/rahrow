import Link from 'next/link'
import { Footer, Layout, Navbar } from 'nextra-theme-docs'
import 'nextra-theme-docs/style.css'
import type { PageMapItem } from 'nextra'
import type { ReactNode } from 'react'
import { FooterContent } from '../shared/FooterContent'

const DOCS_REPOSITORY_BASE = 'https://github.com/FalseFoundation/rahrow/tree/main'

const navbar = (
	<Navbar logo={<b>RahRow</b>}>
		<Link href='/posts'>Blog</Link>
	</Navbar>
)
const footer = (
	<Footer>
		<FooterContent />
	</Footer>
)

interface DocsThemeLayoutProps {
	readonly children: ReactNode
	readonly pageMap: PageMapItem[]
}

export function DocsThemeLayout({ children, pageMap }: DocsThemeLayoutProps) {
	return (
		<Layout
			navbar={navbar}
			pageMap={pageMap}
			docsRepositoryBase={DOCS_REPOSITORY_BASE}
			footer={footer}
		>
			{children}
		</Layout>
	)
}
