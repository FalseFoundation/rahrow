import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const root = dirname(fileURLToPath(import.meta.url))

describe('AppShellLayout primary tab persistence', () => {
	it('keeps visited primary screens mounted instead of swapping Outlet children', () => {
		const layout = readFileSync(join(root, 'AppShellLayout.tsx'), 'utf8')
		const router = readFileSync(join(root, 'router.tsx'), 'utf8')

		expect(layout).toContain('mountedPrimaryTabs')
		expect(layout).toContain('PrimaryTabVisibilityProvider')
		expect(layout).toContain('data-primary-tab')
		expect(layout).toContain("import('../home/Home.tsx')")
		expect(layout).toContain("import('../profiles/Profiles.tsx')")
		expect(layout).toContain("import('../settings/Settings.tsx')")
		expect(layout).toContain('showingPrimaryTabs ? null : <Outlet />')
		expect(layout).toContain('APP_SCROLL_RESTORATION_ID')
		expect(layout).not.toContain("scrollTo({ top: 0 })")

		expect(router).toContain('function PrimaryTabRoute')
		expect(router).toContain('scrollRestoration: true')
		expect(router).toContain('getScrollRestorationKey')
		expect(router).toContain('scrollToTopSelectors')
		expect(router).not.toMatch(
			/path: '\/',\s*component: lazyRouteComponent/,
		)
		expect(router).not.toMatch(
			/path: '\/profiles',\s*component: lazyRouteComponent/,
		)
		expect(router).not.toMatch(
			/path: '\/settings',\s*[\s\S]*component: lazyRouteComponent/,
		)
	})
})
