import { getPageMap } from 'nextra/page-map'
import type { ReactNode } from 'react'
import { DocsThemeLayout } from '../../../docs/DocsThemeLayout'
import { MAINTAINERS_ROUTE } from '../../../docs/pageMap'

export default async function MaintainersLayout({ children }: { children: ReactNode }) {
	return <DocsThemeLayout pageMap={await getPageMap(MAINTAINERS_ROUTE)}>{children}</DocsThemeLayout>
}
