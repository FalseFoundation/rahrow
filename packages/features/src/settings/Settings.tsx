import type { ResetScope } from '@rahrow/core/settings/reset-orchestrator.ts'
import {
	ChevronIcon,
	CloseIcon,
	ConnectionIcon,
	InfoIcon,
	SearchIcon,
	SettingsIcon,
} from '@rahrow/ui/components/rahrow-icons.tsx'
import { useTheme } from '@rahrow/ui/components/theme-provider.tsx'
import { Button } from '@rahrow/ui/components/ui/button.tsx'
import {
	Drawer,
	DrawerBody,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from '@rahrow/ui/components/ui/drawer.tsx'
import { Field, FieldLabel } from '@rahrow/ui/components/ui/field.tsx'
import { IconAction } from '@rahrow/ui/components/ui/icon-action.tsx'
import { Input } from '@rahrow/ui/components/ui/input.tsx'
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from '@rahrow/ui/components/ui/item.tsx'
import {
	RadioGroup,
	RadioGroupItem,
} from '@rahrow/ui/components/ui/radio-group.tsx'
import { toast } from '@rahrow/ui/components/ui/sonner.tsx'
import { Switch } from '@rahrow/ui/components/ui/switch.tsx'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { useAppTranslation } from '../app/app-i18n.tsx'
import { SUPPORTED_APP_LOCALES } from '../app/app-locale.ts'
import { ProductHeader } from '../app/ProductHeader.tsx'
import { ProductSearch } from '../app/ProductSearch.tsx'
import { useAppRuntime } from '../app/runtime.tsx'
import { ScreenLoadingState } from '../app/ScreenLoadingState.tsx'
import { BackupDrawer } from '../backup/BackupDrawer.tsx'
import { Diagnostics } from '../diagnostics/Diagnostics.tsx'
import { AboutRahRow } from './AboutRahRow.tsx'
import styles from './Settings.module.css'
import {
	availableSettings,
	type SettingsRegistryEntry,
	settingsQueryMatches,
} from './settings-model.ts'
import { useSettings } from './useSettings.ts'

type Sheet =
	| 'about'
	| 'appearance'
	| 'connection-mode'
	| 'diagnostics'
	| 'engine'
	| 'language'
	| 'proxy'
	| 'routing'
	| null

export function Settings() {
	const { t } = useAppTranslation()
	const runtime = useAppRuntime()
	const { state, actions } = useSettings()
	const navigate = useNavigate()
	const search = useSearch({ from: '/settings' })
	const { setTheme: applyTheme } = useTheme()
	const [sheet, setSheet] = useState<Sheet>(null)
	const [resetOpen, setResetOpen] = useState(false)
	const [resetScope, setResetScope] = useState<ResetScope>('settings')
	const [backupOpen, setBackupOpen] = useState(false)
	const [searchOpen, setSearchOpen] = useState(false)
	const [query, setQuery] = useState('')
	const activeSheet: Sheet =
		search.drawer === 'diagnostics' ? 'diagnostics' : sheet
	const closeSheet = () => {
		setSheet(null)
		if (search.drawer === 'diagnostics') {
			void navigate({ to: '/settings', search: {}, replace: true })
		}
	}
	const settingsLocked = state.pendingAction !== null
	const appVersion = state.appVersion ?? t('settings.about.versionUnavailable')
	const settingsRegistry = availableSettings({
		vpnSupported: state.vpnSupported,
		systemProxySupported: state.systemProxySupported,
		lanProxySharingSupported:
			runtime.capabilities.lanProxySharing?.supported === true,
		autostartSupported: state.autostartSupported,
		privacyOptionsSupported: Boolean(
			runtime.advertising?.provider.openPrivacyOptions,
		),
		connectionMode: state.connectionMode,
		selectableLocaleCount: SUPPORTED_APP_LOCALES.length,
	})
	const visibleSettingIds = new Set(settingsRegistry.map((entry) => entry.id))
	const sectionMatches = (section: SettingsRegistryEntry['section']) =>
		settingsRegistry
			.filter((entry) => entry.section === section)
			.some((entry) =>
				settingsQueryMatches(query, [t(entry.titleKey), ...entry.searchKeywords]),
			)
	const updateTheme = (theme: typeof state.theme) => {
		const previousTheme = state.theme
		actions.setTheme(theme)
		applyTheme(theme)
		void actions.save({ theme }).then((saved) => {
			if (!saved) applyTheme(previousTheme)
		})
	}
	useEffect(() => {
		if (state.failure) {
			toast.error(t('settings.errors.updateTitle'), {
				description: state.failure,
				id: 'settings-action-failure',
				position: activeSheet ? 'top-center' : 'bottom-center',
			})
		} else toast.dismiss('settings-action-failure')
	}, [activeSheet, state.failure])
	if (state.isLoading) {
		return <UnavailableSettings message={t('settings.status.loading')} />
	}
	if (state.loadError) {
		return (
			<UnavailableSettings
				message={state.loadError}
				onRetry={() => void actions.load()}
			/>
		)
	}
	return (
		<>
			<ProductHeader
				title={t('app.screens.settings')}
				actions={
					<IconAction
						variant='toolbar'
						size='square'
						data-active
						label={t('settings.search')}
						aria-expanded={searchOpen}
						disabled={settingsLocked}
						onClick={() => setSearchOpen((open) => !open)}
					>
						<SearchIcon />
					</IconAction>
				}
			/>
			<section
				className={`${styles.page} ${styles.content}`}
				aria-label={t('app.screens.settings')}
			>
				{searchOpen ? (
					<ProductSearch
						label={t('settings.search')}
						value={query}
						onValueChange={setQuery}
						onClose={() => {
							setQuery('')
							setSearchOpen(false)
						}}
					/>
				) : null}
				<SettingsSection
					icon={<ConnectionIcon />}
					title={t('settings.sections.connection')}
					hidden={!sectionMatches('connection')}
				>
					{visibleSettingIds.has('connection-mode') ? (
						<Setting
							title={t('settings.connection.mode')}
							description={
								state.connectionMode === 'vpn'
									? state.vpnSupported
										? t('settings.connection.vpnDescription')
										: t('settings.connection.vpnUnavailable')
									: state.systemProxySupported
										? t('settings.connection.proxyDescription')
										: t('settings.connection.proxyUnavailable')
							}
							onClick={() => setSheet('connection-mode')}
							disabled={settingsLocked}
						/>
					) : null}
					{visibleSettingIds.has('engine') ? (
						<Setting
							title={t('settings.connection.engine')}
							description={state.engineId === 'xray' ? 'Xray Core' : state.engineId}
							onClick={() => setSheet('engine')}
							disabled={settingsLocked}
						/>
					) : null}
					{visibleSettingIds.has('routing') ? (
						<Setting
							title={t('settings.connection.routing')}
							description={t(`settings.options.${state.routingMode}`)}
							onClick={() => setSheet('routing')}
							disabled={settingsLocked}
						/>
					) : null}
					{visibleSettingIds.has('system-proxy') ? (
						<Setting
							title={t('settings.connection.proxy')}
							description={`SOCKS · 127.0.0.1:${state.localPort}`}
							onClick={() => setSheet('proxy')}
							disabled={settingsLocked}
						/>
					) : null}
					{visibleSettingIds.has('lan-proxy-sharing') ? (
						<Setting
							title={t('settings.connection.lanSharing')}
							description={t('settings.connection.lanSharingDescription')}
							accessory={false}
						/>
					) : null}
				</SettingsSection>
				<SettingsSection
					icon={<SettingsIcon />}
					title={t('settings.sections.app')}
					hidden={!sectionMatches('app')}
				>
					{visibleSettingIds.has('autostart') ? (
						<Setting
							title={t('settings.app.autostart')}
							description={t('settings.app.autostartDescription')}
						>
							<Switch
								checked={state.launchAtStartup}
								aria-label={t('settings.app.autostart')}
								disabled={settingsLocked}
								onCheckedChange={(value) => {
									actions.setLaunchAtStartup(value)
									void actions.save({ launchAtStartup: value })
								}}
							/>
						</Setting>
					) : null}
					{visibleSettingIds.has('language') ? (
						<Setting
							title={t('settings.language.label')}
							description={
								SUPPORTED_APP_LOCALES.find(
									(locale) => locale.language === state.language,
								)?.label ?? SUPPORTED_APP_LOCALES[0].label
							}
							onClick={() => setSheet('language')}
							disabled={settingsLocked}
						/>
					) : null}
					{visibleSettingIds.has('appearance') ? (
						<Setting
							title={t('settings.app.appearance')}
							description={t(`settings.options.${state.theme}`)}
							onClick={() => setSheet('appearance')}
							disabled={settingsLocked}
						/>
					) : null}
					{visibleSettingIds.has('backup') ? (
						<Setting
							title={t('backup.title.menu')}
							description={t('backup.description.menu')}
							onClick={() => setBackupOpen(true)}
							disabled={settingsLocked}
						/>
					) : null}
					{visibleSettingIds.has('diagnostics') ? (
						<Setting
							title={t('settings.app.diagnostics')}
							description={t('settings.app.diagnosticsDescription')}
							onClick={() => setSheet('diagnostics')}
							disabled={settingsLocked}
						/>
					) : null}
					{visibleSettingIds.has('privacy') ? (
						<Setting
							title={t('settings.app.privacy')}
							description={t('settings.app.privacyDescription')}
							onClick={() => {
								void runtime.advertising?.provider.openPrivacyOptions?.().catch(() => {
									toast.error(t('settings.errors.privacyTitle'), {
										description: t('settings.errors.tryAgain'),
									})
								})
							}}
							disabled={settingsLocked}
						/>
					) : null}
					{visibleSettingIds.has('reset-settings') ? (
						<Setting
							title={t('settings.app.reset')}
							description={t('settings.app.resetDescription')}
							destructive
							onClick={() => setResetOpen(true)}
							disabled={settingsLocked}
						/>
					) : null}
				</SettingsSection>
				<SettingsSection
					icon={<InfoIcon />}
					title={t('settings.sections.about')}
					hidden={!sectionMatches('about')}
				>
					{visibleSettingIds.has('about') ? (
						<Setting
							title={t('settings.about.title')}
							description={t('settings.about.description')}
							onClick={() => setSheet('about')}
							disabled={settingsLocked}
						/>
					) : null}
					{visibleSettingIds.has('app-version') ? (
						<Setting
							title={t('settings.about.appVersion')}
							description={appVersion}
							accessory={false}
						/>
					) : null}
				</SettingsSection>
			</section>
			<Drawer
				open={activeSheet !== null}
				onOpenChange={(open) => {
					if (!open) closeSheet()
				}}
				showSwipeHandle
			>
				<DrawerContent variant='app' scrollable>
					<DrawerHeader className={styles.drawerHeader}>
						<div>
							<DrawerTitle>{sheetTitle(activeSheet, t)}</DrawerTitle>
							<DrawerDescription className={styles.srOnly}>
								{activeSheet === 'diagnostics'
									? t('settings.drawer.diagnosticsDescription')
									: t('settings.drawer.description')}
							</DrawerDescription>
						</div>
						<IconAction
							variant='toolbar'
							size='square'
							label={t('common.closeDrawer')}
							onClick={closeSheet}
						>
							<CloseIcon />
						</IconAction>
					</DrawerHeader>
					<DrawerBody className={styles.drawerBody}>
						<div className={styles.drawerBodyContent}>
							{activeSheet === 'diagnostics' ? <Diagnostics /> : null}
							{activeSheet === 'appearance' ? (
								<Choice
									label={t('settings.app.appearance')}
									value={state.theme}
									values={['system', 'light', 'dark']}
									optionLabel={(value) => t(`settings.options.${value}`)}
									onChange={updateTheme}
									disabled={settingsLocked}
								/>
							) : null}
							{activeSheet === 'language' ? (
								<Choice
									label={t('settings.language.pickerLabel')}
									value={state.language}
									values={SUPPORTED_APP_LOCALES.map((locale) => locale.language)}
									optionLabel={(value) =>
										SUPPORTED_APP_LOCALES.find((locale) => locale.language === value)
											?.label ?? value
									}
									onChange={(language) => {
										actions.setLanguage(language)
										void actions.save({ language }).then((saved) => {
											if (saved) setSheet(null)
										})
									}}
									disabled={settingsLocked}
								/>
							) : null}
							{activeSheet === 'routing' ? (
								<Choice
									label={t('settings.connection.routing')}
									value={state.routingMode}
									values={['global', 'rule', 'direct']}
									optionLabel={(value) => t(`settings.options.${value}`)}
									onChange={(routingMode) => {
										actions.setRoutingMode(routingMode)
										void actions.save({ routingMode }).then((saved) => {
											if (saved) setSheet(null)
										})
									}}
									disabled={settingsLocked}
								/>
							) : null}
							{activeSheet === 'connection-mode' ? (
								<Choice
									label={t('settings.connection.mode')}
									value={state.connectionMode}
									values={(['vpn', 'proxy'] as const).filter((mode) =>
										mode === 'vpn' ? state.vpnSupported : state.systemProxySupported,
									)}
									optionLabel={(value) => t(`settings.options.${value}`)}
									onChange={(connectionMode) => {
										actions.setConnectionMode(connectionMode)
										void actions.save({ connectionMode }).then((saved) => {
											if (saved) setSheet(null)
										})
									}}
									disabled={settingsLocked}
								/>
							) : null}
							{activeSheet === 'engine' ? (
								<Choice
									label={t('settings.connection.engine')}
									value={state.engineId}
									values={state.engineIds}
									onChange={(engineId) => {
										actions.setEngineId(engineId)
										void actions.save({ engineId }).then((saved) => {
											if (saved) setSheet(null)
										})
									}}
									disabled={settingsLocked}
								/>
							) : null}
							{activeSheet === 'proxy' ? (
								<Field>
									<FieldLabel htmlFor='local-port'>
										{t('settings.connection.localPort')}
									</FieldLabel>
									<Input
										id='local-port'
										inputMode='numeric'
										type='number'
										min={1}
										max={65535}
										value={state.localPort}
										disabled={settingsLocked}
										onChange={(event) => actions.setLocalPort(event.target.value)}
									/>
								</Field>
							) : null}
							{activeSheet === 'about' ? (
								<AboutRahRow
									version={state.appVersion}
									build={runtime.buildMetadata?.build}
									engines={runtime.availableEngines}
									engineMetadata={runtime.buildMetadata?.engines}
									externalNavigation={runtime.capabilities.externalNavigation}
									configuration={runtime.buildMetadata?.about}
								/>
							) : null}
						</div>
					</DrawerBody>
					{activeSheet === 'proxy' ? (
						<DrawerFooter className={styles.drawerFooter}>
							<Button
								disabled={settingsLocked}
								onClick={() => {
									void actions.save().then((saved) => {
										if (saved) setSheet(null)
									})
								}}
							>
								{state.pendingAction === 'save'
									? t('settings.status.saving')
									: t('settings.connection.savePort')}
							</Button>
						</DrawerFooter>
					) : null}
				</DrawerContent>
			</Drawer>
			<Drawer open={resetOpen} onOpenChange={setResetOpen} showSwipeHandle>
				<DrawerContent variant='app'>
					<DrawerHeader className={styles.confirmationHeader}>
						<DrawerTitle>{t('settings.reset.title')}</DrawerTitle>
						<DrawerDescription>
							{t(`settings.reset.scopes.${resetScope}.description`)}
						</DrawerDescription>
					</DrawerHeader>
					<DrawerBody>
						<Choice
							label={t('settings.reset.scopeLabel')}
							value={resetScope}
							values={
								runtime.reset
									? ['tunnel-configuration', 'settings', 'app-data']
									: ['settings']
							}
							optionLabel={(scope) => t(`settings.reset.scopes.${scope}.label`)}
							onChange={setResetScope}
							disabled={settingsLocked}
						/>
					</DrawerBody>
					<DrawerFooter className={styles.confirmationFooter}>
						<Button
							variant='outline'
							disabled={settingsLocked}
							onClick={() => setResetOpen(false)}
						>
							{t('common.cancel')}
						</Button>
						<Button
							variant='destructive'
							disabled={settingsLocked}
							onClick={() => {
								void actions.reset(resetScope).then((reset) => {
									if (!reset) return
									if (resetScope !== 'tunnel-configuration') applyTheme('system')
									setResetOpen(false)
								})
							}}
						>
							{state.pendingAction === 'reset'
								? t('settings.status.resettingShort')
								: t('settings.app.reset')}
						</Button>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
			<BackupDrawer
				open={backupOpen}
				onOpenChange={setBackupOpen}
				profileStore={runtime.profileStore}
				settingsStore={runtime.settingsStore}
				subscriptionStore={runtime.subscriptionStore}
				fileSave={runtime.capabilities.fileSave}
				filePick={runtime.capabilities.filePick}
				adGate={runtime.advertising?.gate}
				logger={runtime.logger}
				onImported={async () => {
					await actions.load()
				}}
			/>
		</>
	)
}

function UnavailableSettings({
	message,
	onRetry,
}: {
	readonly message: string
	readonly onRetry?: () => void
}) {
	const { t } = useAppTranslation()
	return (
		<>
			<ProductHeader
				title={t('app.screens.settings')}
				actions={
					<IconAction
						variant='toolbar'
						size='square'
						label={t('settings.search')}
						disabled
					>
						<SearchIcon />
					</IconAction>
				}
			/>
			<section
				className={`${styles.page} ${styles.content}`}
				aria-label={t('app.screens.settings')}
			>
				{onRetry ? (
					<div className={styles.feedback}>
						<p role='alert' aria-live='assertive' aria-atomic='true'>
							{message}
						</p>
						<Button onClick={onRetry}>{t('common.tryAgain')}</Button>
					</div>
				) : (
					<ScreenLoadingState label={message} variant='settings' />
				)}
			</section>
		</>
	)
}

function SettingsSection({
	icon,
	title,
	hidden,
	children,
}: {
	readonly icon: React.ReactNode
	readonly title: string
	readonly hidden?: boolean
	readonly children: React.ReactNode
}) {
	return (
		<section className={styles.section} hidden={hidden}>
			<div className={styles.sectionTitle}>
				<ItemMedia variant='tile'>{icon}</ItemMedia>
				<h2>{title}</h2>
			</div>
			<ItemGroup className={styles.rows}>{children}</ItemGroup>
		</section>
	)
}
function Setting({
	title,
	description,
	children,
	onClick,
	disabled = false,
	destructive = false,
	accessory = true,
}: {
	readonly title: string
	readonly description: string
	readonly children?: React.ReactNode
	readonly onClick?: () => void
	readonly disabled?: boolean
	readonly destructive?: boolean
	readonly accessory?: boolean
}) {
	const content = (
		<>
			<ItemContent>
				<ItemTitle>{title}</ItemTitle>
				<ItemDescription>{description}</ItemDescription>
			</ItemContent>
			<ItemActions>{children ?? (accessory ? <ChevronIcon /> : null)}</ItemActions>
		</>
	)
	if (onClick)
		return (
			<Item
				variant='flush-interactive'
				data-destructive={destructive}
				render={<button type='button' disabled={disabled} />}
				onClick={onClick}
			>
				{content}
			</Item>
		)
	return <Item variant='flush-interactive'>{content}</Item>
}
function Choice<T extends string>({
	label,
	value,
	values,
	onChange,
	optionLabel = (option) => option,
	disabled = false,
}: {
	readonly label: string
	readonly value: T
	readonly values: readonly T[]
	readonly onChange: (value: T) => void
	readonly optionLabel?: (value: T) => string
	readonly disabled?: boolean
}) {
	return (
		<RadioGroup
			aria-label={label}
			className={styles.choices}
			value={value}
			onValueChange={(selected) => onChange(selected as T)}
		>
			{values.map((option) => {
				const id = `setting-${label}-${option}`.toLowerCase().replaceAll(' ', '-')
				return (
					<label className={styles.choice} htmlFor={id} key={option}>
						<RadioGroupItem id={id} value={option} disabled={disabled} />
						<span>{optionLabel(option)}</span>
					</label>
				)
			})}
		</RadioGroup>
	)
}
function sheetTitle(sheet: Sheet, t: (key: string) => string) {
	if (!sheet) return t('app.screens.settings')
	return t(`settings.drawer.${sheet}`)
}
