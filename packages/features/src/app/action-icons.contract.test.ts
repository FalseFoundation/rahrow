import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const sources = {
	ads: read('../ads/AdGateOutlet.tsx'),
	cleanup: read('../profiles/ConnectionCleanupDrawer.tsx'),
	diagnostics: read('../diagnostics/Diagnostics.tsx'),
	home: read('../home/Home.tsx'),
	imports: read('../import/ConnectionImportDrawer.tsx'),
	iconAction: read('../../../ui/src/components/ui/icon-action.tsx'),
	logs: read('../logs/Logs.tsx'),
	productSearch: read('./ProductSearch.tsx'),
	profiles: [
		read('../profiles/ProfileManagement.tsx'),
		read('../profiles/ConnectionProfileList.tsx'),
		read('../profiles/ConnectionGroup.tsx'),
		read('../profiles/ConnectionActionDrawers.tsx'),
	].join('\n'),
	appShellLayout: read('./AppShellLayout.tsx'),
	settings: read('../settings/Settings.tsx'),
	share: read('../share/ShareDrawer.tsx'),
	subscriptions: read('../subscriptions/Subscriptions.tsx'),
} as const

// biome-ignore format: The compact rows make the action-to-icon inventory scannable.
const actionMap = [
	['Home', 'connect or disconnect', sources.home, /<PowerIcon\b/],
	['Home', 'browse connections', sources.home, /<ConnectionIcon data-icon='inline-start'/],
	['Connections', 'add', sources.profiles, /<AddIcon(?: data-icon='inline-start')? \/>/],
	['Connections', 'search', sources.profiles, /label={t\('profiles\.actions\.search'\)}[\s\S]{0,240}<SearchIcon \/>/],
	['Connections', 'sort', sources.profiles, /label={t\('profiles\.actions\.sort'\)}[\s\S]{0,240}<FilterIcon \/>/],
	['Connections', 'more actions', sources.profiles, /<MoreIcon \/>/],
	['Connections', 'latency test', sources.profiles, /<TestIcon data-icon='inline-start' \/>/],
	['Connections', 'duplicate', sources.profiles, /icon={<DuplicateIcon \/>}[\s\S]{0,80}title={t\('profiles\.actions\.duplicate'\)}/],
	['Connections', 'share', sources.profiles, /icon={<ShareIcon \/>}[\s\S]{0,80}title={t\('profiles\.actions\.share'\)}/],
	['Connections', 'edit', sources.profiles, /icon={<EditIcon \/>}[\s\S]{0,80}title={t\('profiles\.actions\.edit'\)}/],
	['Connections', 'remove', sources.profiles, /icon={<DeleteIcon \/>}[\s\S]{0,80}title={t\('profiles\.actions\.remove'\)}/],
	['Connections', 'reload', sources.profiles, /icon={<RefreshActionIcon \/>}[\s\S]{0,80}title={t\('profiles\.actions\.reload'\)}/],
	['Import', 'scan QR', sources.imports, /<QrIcon data-icon='inline-start' \/>/],
	['Import', 'paste', sources.imports, /<ClipboardActionIcon data-icon='inline-start' \/>/],
	['Import', 'add connection', sources.imports, /<UploadIcon data-icon='inline-start' \/>/],
	['Share', 'copy', sources.share, /<CopyIcon data-icon='inline-start' \/>/],
	['Share', 'share', sources.share, /<ShareIcon data-icon='inline-start' \/>/],
	['Share', 'download', sources.share, /<DownloadIcon data-icon='inline-start' \/>/],
	['Settings', 'search', sources.settings, /label={t\('settings\.search'\)}[\s\S]{0,280}<SearchIcon \/>/],
	['Diagnostics', 'refresh', sources.diagnostics, /label={t\('diagnostics\.refresh'\)}[\s\S]{0,300}<RefreshActionIcon \/>/],
	['Subscriptions', 'refresh', sources.subscriptions, /label={t\('subscriptions\.refreshNamed'[\s\S]{0,400}<RefreshActionIcon \/>/],
	['Subscriptions', 'remove', sources.subscriptions, /label={t\('subscriptions\.removeNamed'[\s\S]{0,400}<DeleteIcon \/>/],
	['Navigation', 'back', sources.appShellLayout, /<BackIcon/],
	['Navigation', 'home', sources.appShellLayout, /titleKey: 'app\.screens\.home', icon: HomeIcon/],
	['Navigation', 'connections', sources.appShellLayout, /titleKey: 'app\.screens\.profiles', icon: WifiIcon/],
	['Navigation', 'settings', sources.appShellLayout, /titleKey: 'app\.screens\.settings', icon: SettingsIcon/],
] as const

describe('product action icon contract', () => {
	it.each(actionMap)(
		'%s maps %s to its semantic wrapper',
		(_surface, _action, source, pattern) => {
			expect(source).toMatch(pattern)
		},
	)

	it('does not expose the retired pin action or generic icon-only names', () => {
		const productSource = Object.values(sources).join('\n')

		expect(productSource).not.toContain('PinActionIcon')
		expect(productSource).not.toMatch(
			/aria-label=['"](?:Action|Button|Menu|More)['"]/,
		)
	})

	it.each([
		[sources.profiles, "label={t('profiles.actions.search')}"],
		[sources.profiles, "label={t('profiles.actions.sort')}"],
		[sources.profiles, "label={t('import.addConnection')}"],
		[sources.productSearch, "label={t('common.closeSearch')}"],
		[sources.diagnostics, "label={t('diagnostics.refresh')}"],
		[sources.settings, "label={t('settings.search')}"],
		[sources.settings, "label={t('common.closeDrawer')}"],
		[sources.share, "label={t('share.close')}"],
		[sources.ads, "label={t('ads.close')}"],
		[sources.cleanup, "label={t('common.closeDrawer')}"],
	] as const)(
		'passes an icon-only accessible name to the shared IconAction contract',
		(source, label) => {
			const labelIndex = source.indexOf(label)

			expect(labelIndex).toBeGreaterThan(-1)
			expect(source.slice(Math.max(0, labelIndex - 180), labelIndex)).toContain(
				'<IconAction',
			)
		},
	)

	it('projects every IconAction label to a matching accessible name and fallback title', () => {
		expect(sources.iconAction).toContain('aria-label={label}')
		expect(sources.iconAction).toContain('title={label}')
	})

	it('routes every eligible product icon-only button through IconAction', () => {
		const plainIconButton =
			/<Button\b(?=[^>]*\bsize='(?:icon|icon-xs|icon-sm|icon-lg|square)')[^>]*>/g

		for (const [file, source] of featureComponentSources()) {
			expect(source.match(plainIconButton), file).toEqual(null)
		}
	})

	it('keeps non-interactive status and empty-state icons in the inventory', () => {
		expect(sources.logs).toContain('<ActivityIcon />')
		expect(sources.diagnostics).toContain('<ServerIcon />')
		expect(sources.home).toContain('<ServerIcon />')
	})

	it('keeps drawer tool actions horizontal and lone commits in footers', () => {
		const connectionActions = read('../profiles/ConnectionActionDrawers.tsx')
		const shareDrawer = read('../share/ShareDrawer.tsx')
		const shareFooter = shareDrawer.slice(
			shareDrawer.indexOf('<DrawerFooter className={styles.footer}>'),
		)

		expect(connectionActions.indexOf('<ButtonGroup')).toBeLessThan(
			connectionActions.indexOf('<DrawerFooter'),
		)
		expect(
			connectionActions.slice(connectionActions.indexOf('<DrawerFooter')),
		).toContain("t('profiles.actions.testLatency')")
		expect(shareFooter.indexOf("label={t('share.copy')}")).toBeGreaterThan(
			shareFooter.indexOf('<ButtonGroup'),
		)
		expect(shareFooter.indexOf("label={t('share.copy')}")).toBeLessThan(
			shareFooter.indexOf('</ButtonGroup>'),
		)
		expect(shareDrawer).not.toContain('secondaryCopy')
	})
})

function read(relativePath: string) {
	return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}

function featureComponentSources() {
	const root = resolve(process.cwd(), 'packages/features/src')
	const sources: [string, string][] = []
	const visit = (directory: string) => {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const path = join(directory, entry.name)
			if (entry.isDirectory()) visit(path)
			else if (entry.name.endsWith('.tsx') && !entry.name.endsWith('.test.tsx'))
				sources.push([path.slice(root.length + 1), readFileSync(path, 'utf8')])
		}
	}

	visit(root)
	return sources
}
