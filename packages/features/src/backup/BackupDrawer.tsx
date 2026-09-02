import {
	type AdGateController,
	createAdActionEventId,
} from '@rahrow/ads/ad-gate.ts'
import {
	applyRahrowBackupImport,
	BACKUP_FILE_NAME,
	BACKUP_SETTING_KEYS,
	type BackupConflictPolicy,
	BackupError,
	createRahrowBackup,
	openRahrowBackup,
	planRahrowBackupImport,
	type RahrowBackupImportPlan,
	type RahrowBackupPayload,
} from '@rahrow/core/backup/backup-envelope.ts'
import type { Logger } from '@rahrow/core/logging/logger.ts'
import type { FilePick, FileSave } from '@rahrow/core/platform/capabilities.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type {
	ProfileStore,
	Settings,
	SettingsStore,
} from '@rahrow/core/storage/json-store.ts'
import type { SubscriptionStore } from '@rahrow/core/subscription/subscription-import.ts'
import {
	BackIcon,
	ChevronIcon,
	CloseIcon,
	DownloadIcon,
	ImportIcon,
	LockIcon,
} from '@rahrow/ui/components/rahrow-icons.tsx'
import { Button } from '@rahrow/ui/components/ui/button.tsx'
import { Checkbox } from '@rahrow/ui/components/ui/checkbox.tsx'
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
	ItemMedia,
	ItemTitle,
} from '@rahrow/ui/components/ui/item.tsx'
import {
	RadioGroup,
	RadioGroupItem,
} from '@rahrow/ui/components/ui/radio-group.tsx'
import { Spinner } from '@rahrow/ui/components/ui/spinner.tsx'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { recordAdAction } from '../ads/record-ad-action.ts'
import { useAppTranslation } from '../app/app-i18n.tsx'
import styles from './BackupDrawer.module.css'

type Screen = 'menu' | 'export' | 'import-password' | 'import-review' | 'done'
type ExportScope = 'all' | 'connections' | 'settings'
type Protection = 'password' | 'plaintext'

export interface BackupDrawerProps {
	readonly open: boolean
	readonly onOpenChange: (open: boolean) => void
	readonly profileStore: ProfileStore
	readonly settingsStore: SettingsStore
	readonly subscriptionStore?: Pick<SubscriptionStore, 'list'>
	readonly fileSave?: FileSave
	readonly filePick?: FilePick
	readonly adGate?: AdGateController
	readonly logger?: Logger
	readonly onImported?: () => void | Promise<void>
}

export function BackupDrawer({
	open,
	onOpenChange,
	profileStore,
	settingsStore,
	subscriptionStore,
	fileSave,
	filePick,
	adGate,
	logger,
	onImported,
}: BackupDrawerProps) {
	const { t } = useAppTranslation()
	const [screen, setScreen] = useState<Screen>('menu')
	const [profiles, setProfiles] = useState<readonly ConnectionProfile[]>([])
	const [settings, setSettings] = useState<Settings>({})
	const [scope, setScope] = useState<ExportScope>('all')
	const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set())
	const [protection, setProtection] = useState<Protection>('password')
	const [password, setPassword] = useState('')
	const [passwordConfirmation, setPasswordConfirmation] = useState('')
	const [documentText, setDocumentText] = useState('')
	const [importPassword, setImportPassword] = useState('')
	const [payload, setPayload] = useState<RahrowBackupPayload>()
	const [plan, setPlan] = useState<RahrowBackupImportPlan>()
	const [conflictPolicy, setConflictPolicy] =
		useState<BackupConflictPolicy>('reject')
	const [pending, setPending] = useState(false)
	const [error, setError] = useState<string>()
	const actionLock = useRef(false)

	useEffect(() => {
		if (!open) {
			setScreen('menu')
			setPassword('')
			setPasswordConfirmation('')
			setImportPassword('')
			setError(undefined)
			setPayload(undefined)
			setPlan(undefined)
		}
	}, [open])

	const beginExport = async () => {
		if (!fileSave) return
		setPending(true)
		setError(undefined)
		try {
			const [nextProfiles, nextSettings] = await Promise.all([
				profileStore.list(),
				settingsStore.read(),
			])
			setProfiles(nextProfiles)
			setSettings(nextSettings)
			setSelectedIds(new Set(nextProfiles.map(({ id }) => id)))
			setScreen('export')
		} catch {
			setError(t('backup.errors.read'))
		} finally {
			setPending(false)
		}
	}

	const saveBackup = async () => {
		if (!fileSave || actionLock.current) return
		const eventId = createAdActionEventId('backup-export')
		actionLock.current = true
		setPending(true)
		setError(undefined)
		try {
			const connectionIds = scope === 'settings' ? undefined : [...selectedIds]
			const settingKeys = scope === 'connections' ? undefined : BACKUP_SETTING_KEYS
			const backup = await createRahrowBackup({
				connections: profiles,
				settings,
				selection: { connectionIds, settingKeys },
				...(protection === 'password' ? { password } : {}),
			})
			const text = `${JSON.stringify(backup.document, null, 2)}\n`
			const result = await fileSave.save({
				filename: BACKUP_FILE_NAME,
				dataUrl: `data:application/json;charset=utf-8,${encodeURIComponent(text)}`,
			})
			await recordAdAction(adGate, logger, {
				id: eventId,
				action: 'backup-export',
				outcome: result === 'saved' ? 'completed' : 'cancelled',
			})
			if (result === 'saved') setScreen('done')
		} catch {
			setError(t('backup.errors.export'))
		} finally {
			actionLock.current = false
			setPending(false)
		}
	}

	const beginImport = async () => {
		if (!filePick || actionLock.current) return
		actionLock.current = true
		setPending(true)
		setError(undefined)
		try {
			const file = await filePick.pick({ accept: ['application/json', '.json'] })
			if (!file) return
			setDocumentText(file.text)
			await prepareImport(file.text, undefined, 'reject')
		} catch (nextError) {
			if (
				nextError instanceof BackupError &&
				nextError.code === 'password_required'
			) {
				setScreen('import-password')
			} else setError(t('backup.errors.import'))
		} finally {
			actionLock.current = false
			setPending(false)
		}
	}

	const prepareImport = async (
		text: string,
		nextPassword: string | undefined,
		policy: BackupConflictPolicy,
	) => {
		const [nextPayload, currentConnections, currentSettings] = await Promise.all([
			openRahrowBackup(text, nextPassword),
			profileStore.list(),
			settingsStore.read(),
		])
		const nextPlan = await planRahrowBackupImport({
			document: text,
			password: nextPassword,
			currentConnections,
			currentSettings,
			connectionConflict: policy,
			settingConflict: policy,
		})
		setPayload(nextPayload)
		setPlan(nextPlan)
		setConflictPolicy(policy)
		setScreen('import-review')
	}

	const changeConflictPolicy = async (policy: BackupConflictPolicy) => {
		setPending(true)
		setError(undefined)
		try {
			await prepareImport(documentText, importPassword || undefined, policy)
		} catch {
			setError(t('backup.errors.import'))
		} finally {
			setPending(false)
		}
	}

	const applyImport = async () => {
		if (!plan?.canApply || actionLock.current) return
		const eventId = createAdActionEventId('backup-import')
		actionLock.current = true
		setPending(true)
		setError(undefined)
		try {
			await applyRahrowBackupImport(plan, {
				profileStore,
				settingsStore,
				subscriptionStore,
			})
			await onImported?.()
			await recordAdAction(adGate, logger, {
				id: eventId,
				action: 'backup-import',
				outcome:
					plan.nextConnections.length === plan.previousConnections.length &&
					JSON.stringify(plan.nextConnections) ===
						JSON.stringify(plan.previousConnections) &&
					JSON.stringify(plan.nextSettings) === JSON.stringify(plan.previousSettings)
						? 'no-op'
						: 'completed',
			})
			setScreen('done')
		} catch {
			setError(t('backup.errors.apply'))
		} finally {
			actionLock.current = false
			setPending(false)
		}
	}

	const selectedCount = selectedIds.size
	const allSelected = profiles.length > 0 && selectedCount === profiles.length
	const selectAllState: boolean | 'indeterminate' =
		selectedCount === 0 ? false : allSelected ? true : 'indeterminate'
	const passwordValid =
		protection === 'plaintext' ||
		(password.length > 0 && password === passwordConfirmation)
	const canSave =
		!pending && passwordValid && (scope === 'settings' || selectedCount > 0)
	const title = t(`backup.title.${screen}`)
	const description = t(`backup.description.${screen}`)
	const visibleConflicts =
		plan?.conflicts.filter(({ kind }) => kind !== 'duplicate') ?? []

	return (
		<Drawer open={open} onOpenChange={onOpenChange} showSwipeHandle>
			<DrawerContent variant='app' scrollable>
				<DrawerHeader className={styles.header}>
					{screen !== 'menu' ? (
						<IconAction
							variant='toolbar'
							size='square'
							label={t('backup.back')}
							disabled={pending}
							onClick={() => {
								setError(undefined)
								setScreen('menu')
							}}
						>
							<BackIcon />
						</IconAction>
					) : null}
					<div className={styles.headerCopy}>
						<DrawerTitle>{title}</DrawerTitle>
						<DrawerDescription>{description}</DrawerDescription>
					</div>
					<IconAction
						variant='toolbar'
						size='square'
						label={t('common.closeDrawer')}
						disabled={pending}
						onClick={() => onOpenChange(false)}
					>
						<CloseIcon />
					</IconAction>
				</DrawerHeader>

				<DrawerBody className={styles.body}>
					<div className={styles.bodyContent}>
						{screen === 'menu' ? (
							<div className={styles.menu}>
								<FlowAction
									icon={<DownloadIcon />}
									title={t('backup.export.action')}
									description={t('backup.export.description')}
									disabled={!fileSave || pending}
									onClick={() => void beginExport()}
								/>
								<FlowAction
									icon={<ImportIcon />}
									title={t('backup.import.action')}
									description={t('backup.import.description')}
									disabled={!filePick || pending}
									onClick={() => void beginImport()}
								/>
								{!fileSave || !filePick ? (
									<p className={styles.hint}>{t('backup.unavailable')}</p>
								) : null}
							</div>
						) : null}

						{screen === 'export' ? (
							<ExportForm
								profiles={profiles}
								scope={scope}
								onScopeChange={setScope}
								selectedIds={selectedIds}
								onSelectedIdsChange={setSelectedIds}
								selectAllState={selectAllState}
								protection={protection}
								onProtectionChange={setProtection}
								password={password}
								passwordConfirmation={passwordConfirmation}
								onPasswordChange={setPassword}
								onPasswordConfirmationChange={setPasswordConfirmation}
							/>
						) : null}

						{screen === 'import-password' ? (
							<Field>
								<FieldLabel htmlFor='backup-import-password'>
									{t('backup.password.label')}
								</FieldLabel>
								<Input
									id='backup-import-password'
									type='password'
									autoComplete='current-password'
									value={importPassword}
									onChange={(event) => setImportPassword(event.target.value)}
								/>
							</Field>
						) : null}

						{screen === 'import-review' && payload && plan ? (
							<div className={styles.review}>
								<dl className={styles.summary}>
									<div>
										<dt>{t('backup.review.created')}</dt>
										<dd>{new Date(payload.createdAt).toLocaleString()}</dd>
									</div>
									<div>
										<dt>{t('backup.review.connections')}</dt>
										<dd>{payload.connections?.length ?? 0}</dd>
									</div>
									<div>
										<dt>{t('backup.review.settings')}</dt>
										<dd>{Object.keys(payload.settings ?? {}).length}</dd>
									</div>
								</dl>
								{payload.connections?.length ? (
									<ul
										className={styles.previewList}
										aria-label={t('backup.review.connections')}
									>
										{payload.connections.map((profile) => (
											<li key={profile.id}>{profileLabel(profile)}</li>
										))}
									</ul>
								) : null}
								{visibleConflicts.length > 0 ? (
									<div className={styles.conflicts}>
										<p role='status'>
											{t('backup.review.conflictCount', {
												count: visibleConflicts.length,
											})}
										</p>
										<ul>
											{visibleConflicts.map((conflict) => (
												<li key={`${conflict.area}-${conflict.key}`}>{conflict.key}</li>
											))}
										</ul>
										<RadioChoices
											label={t('backup.review.resolution')}
											value={conflictPolicy}
											values={['replace', 'keep-existing']}
											onChange={(value) => void changeConflictPolicy(value)}
										/>
									</div>
								) : (
									<p role='status'>{t('backup.review.ready')}</p>
								)}
							</div>
						) : null}

						{screen === 'done' ? (
							<div className={styles.done} role='status'>
								<LockIcon />
								<p>{t('backup.done')}</p>
							</div>
						) : null}
						{pending ? (
							<div className={styles.pending} role='status'>
								<Spinner />
								{t('backup.working')}
							</div>
						) : null}
						{error ? (
							<p className={styles.error} role='alert'>
								{error}
							</p>
						) : null}
					</div>
				</DrawerBody>

				{screen !== 'menu' && screen !== 'done' ? (
					<DrawerFooter className={styles.footer}>
						{screen === 'export' ? (
							<Button disabled={!canSave} onClick={() => void saveBackup()}>
								{pending ? t('backup.working') : t('backup.export.save')}
							</Button>
						) : null}
						{screen === 'import-password' ? (
							<Button
								disabled={pending || importPassword.length === 0}
								onClick={() =>
									void prepareImport(documentText, importPassword, 'reject').catch(() =>
										setError(t('backup.errors.password')),
									)
								}
							>
								{t('backup.import.unlock')}
							</Button>
						) : null}
						{screen === 'import-review' ? (
							<Button
								disabled={pending || !plan?.canApply}
								onClick={() => void applyImport()}
							>
								{t('backup.import.action')}
							</Button>
						) : null}
					</DrawerFooter>
				) : null}
			</DrawerContent>
		</Drawer>
	)
}

function ExportForm(props: {
	readonly profiles: readonly ConnectionProfile[]
	readonly scope: ExportScope
	readonly onScopeChange: (scope: ExportScope) => void
	readonly selectedIds: ReadonlySet<string>
	readonly onSelectedIdsChange: (ids: ReadonlySet<string>) => void
	readonly selectAllState: boolean | 'indeterminate'
	readonly protection: Protection
	readonly onProtectionChange: (protection: Protection) => void
	readonly password: string
	readonly passwordConfirmation: string
	readonly onPasswordChange: (value: string) => void
	readonly onPasswordConfirmationChange: (value: string) => void
}) {
	const { t } = useAppTranslation()
	const showConnections = props.scope !== 'settings'
	return (
		<div className={styles.form}>
			<RadioChoices
				label={t('backup.scope.label')}
				value={props.scope}
				values={['all', 'connections', 'settings']}
				onChange={props.onScopeChange}
			/>
			{showConnections ? (
				<fieldset className={styles.connectionSelection}>
					<legend>{t('backup.connections.label')}</legend>
					<label className={styles.checkboxRow} htmlFor='backup-select-all'>
						<Checkbox
							id='backup-select-all'
							checked={props.selectAllState === true}
							indeterminate={props.selectAllState === 'indeterminate'}
							onCheckedChange={(checked) =>
								props.onSelectedIdsChange(
									checked ? new Set(props.profiles.map(({ id }) => id)) : new Set(),
								)
							}
						/>
						<span>{t('backup.connections.selectAll')}</span>
					</label>
					{props.profiles.map((profile) => {
						const id = `backup-connection-${profile.id}`
						return (
							<label className={styles.checkboxRow} htmlFor={id} key={profile.id}>
								<Checkbox
									id={id}
									checked={props.selectedIds.has(profile.id)}
									onCheckedChange={(checked) => {
										const next = new Set(props.selectedIds)
										if (checked) next.add(profile.id)
										else next.delete(profile.id)
										props.onSelectedIdsChange(next)
									}}
								/>
								<span>{profileLabel(profile)}</span>
							</label>
						)
					})}
				</fieldset>
			) : null}
			<RadioChoices
				label={t('backup.protection.label')}
				value={props.protection}
				values={['password', 'plaintext']}
				onChange={props.onProtectionChange}
			/>
			{props.protection === 'password' ? (
				<div className={styles.passwordFields}>
					<Field>
						<FieldLabel htmlFor='backup-password'>
							{t('backup.password.label')}
						</FieldLabel>
						<Input
							id='backup-password'
							type='password'
							autoComplete='new-password'
							value={props.password}
							onChange={(event) => props.onPasswordChange(event.target.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor='backup-password-confirm'>
							{t('backup.password.confirm')}
						</FieldLabel>
						<Input
							id='backup-password-confirm'
							type='password'
							autoComplete='new-password'
							value={props.passwordConfirmation}
							onChange={(event) =>
								props.onPasswordConfirmationChange(event.target.value)
							}
							aria-invalid={
								props.passwordConfirmation.length > 0 &&
								props.password !== props.passwordConfirmation
							}
						/>
					</Field>
				</div>
			) : (
				<p className={styles.warning} role='alert'>
					{t('backup.plaintextWarning')}
				</p>
			)}
		</div>
	)
}

function RadioChoices<T extends string>({
	label,
	value,
	values,
	onChange,
}: {
	readonly label: string
	readonly value: T
	readonly values: readonly T[]
	readonly onChange: (value: T) => void
}) {
	const { t } = useAppTranslation()
	return (
		<RadioGroup
			aria-label={label}
			className={styles.radioChoices}
			value={value}
			onValueChange={(next) => onChange(next as T)}
		>
			{values.map((option) => {
				const id = `backup-option-${label}-${option}`
					.toLowerCase()
					.replaceAll(' ', '-')
				return (
					<label className={styles.radioChoice} htmlFor={id} key={option}>
						<RadioGroupItem id={id} value={option} />
						<span>{t(`backup.options.${option}`)}</span>
					</label>
				)
			})}
		</RadioGroup>
	)
}

function FlowAction({
	icon,
	title,
	description,
	disabled,
	onClick,
}: {
	readonly icon: ReactNode
	readonly title: string
	readonly description: string
	readonly disabled: boolean
	readonly onClick: () => void
}) {
	return (
		<Item
			aria-label={title}
			variant='flush-interactive'
			render={<button type='button' disabled={disabled} />}
			onClick={onClick}
		>
			<ItemMedia variant='tile'>{icon}</ItemMedia>
			<ItemContent>
				<ItemTitle>{title}</ItemTitle>
				<ItemDescription>{description}</ItemDescription>
			</ItemContent>
			<ItemActions>
				<ChevronIcon />
			</ItemActions>
		</Item>
	)
}

function profileLabel(profile: ConnectionProfile) {
	return (
		profile.metadata?.name ?? `${profile.endpoint.host}:${profile.endpoint.port}`
	)
}
