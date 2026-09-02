import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type { Protocol } from '@rahrow/core/protocol/connection-protocol.ts'
import {
	ClipboardActionIcon,
	QrIcon,
	UploadIcon,
} from '@rahrow/ui/components/rahrow-icons.tsx'
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from '@rahrow/ui/components/ui/alert.tsx'
import { Button } from '@rahrow/ui/components/ui/button.tsx'
import { DrawerBody, DrawerFooter } from '@rahrow/ui/components/ui/drawer.tsx'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldLabel,
} from '@rahrow/ui/components/ui/field.tsx'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupButton,
	InputGroupInput,
} from '@rahrow/ui/components/ui/input-group.tsx'
import {
	NativeSelect,
	NativeSelectOption,
} from '@rahrow/ui/components/ui/native-select.tsx'
import { Spinner } from '@rahrow/ui/components/ui/spinner.tsx'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@rahrow/ui/components/ui/tabs.tsx'
import { useForm } from '@tanstack/react-form'
import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useAppTranslation } from '../app/app-i18n.tsx'
import { firstFormError } from '../forms/form-validation.ts'
import { SecureProtocolEditor } from '../profiles/SecureProtocolEditor.tsx'
import { ShadowsocksEditor } from '../profiles/ShadowsocksEditor.tsx'
import styles from './ConnectionImportDrawer.module.css'
import { connectionImportFormSchema } from './connection-import-form.ts'
import type { StandardProtocol } from './manual-profile-model.ts'
import { StandardProtocolEditor } from './StandardProtocolEditor.tsx'

export interface ConnectionImportDrawerProps {
	readonly value: string
	readonly onValueChange: (value: string) => void
	readonly onPaste?: () => Promise<void>
	readonly onImportUrl: () => Promise<void>
	readonly onScanQr?: () => Promise<void>
	readonly qrPreview?: ReactNode
	readonly supportedProtocols: readonly Protocol[]
	readonly onCreateProfile: (profile: ConnectionProfile) => Promise<void>
}

interface AcquisitionError {
	readonly title: string
	readonly recovery: string
	readonly detail: string
}

export function ConnectionImportDrawer({
	value,
	onValueChange,
	onPaste,
	onImportUrl,
	onScanQr,
	qrPreview,
	supportedProtocols,
	onCreateProfile,
}: ConnectionImportDrawerProps) {
	const { t } = useAppTranslation()
	const [manualProtocol, setManualProtocol] = useState<Protocol>(
		supportedProtocols[0] ?? 'vless',
	)
	const [method, setMethod] = useState('url')
	const [importPending, setImportPending] = useState(false)
	const [pastePending, setPastePending] = useState(false)
	const [urlError, setUrlError] = useState<AcquisitionError>()
	const [manualSaving, setManualSaving] = useState(false)
	const [qrPending, setQrPending] = useState(false)
	const [qrError, setQrError] = useState<string>()
	const importLock = useRef(false)
	const pasteLock = useRef(false)
	const qrLock = useRef(false)
	const protocol = supportedProtocols.includes(manualProtocol)
		? manualProtocol
		: supportedProtocols[0]
	const hasQrImport = Boolean(onScanQr || qrPreview)
	const manualFormId = `manual-${protocol}-profile-form`
	const importUrl = async () => {
		if (importLock.current) return
		importLock.current = true
		setImportPending(true)
		setUrlError(undefined)
		try {
			await onImportUrl()
		} catch {
			setUrlError({
				title: t('import.errors.addTitle'),
				recovery: t('import.errors.addRecovery'),
				detail: t('import.errors.addDetail'),
			})
		} finally {
			importLock.current = false
			setImportPending(false)
		}
	}
	const urlForm = useForm({
		defaultValues: { url: value },
		validators: { onSubmit: connectionImportFormSchema },
		onSubmit: importUrl,
	})
	useEffect(() => {
		if (urlForm.state.values.url !== value) {
			urlForm.setFieldValue('url', value)
		}
	}, [urlForm, value])
	const paste = async () => {
		if (!onPaste || pasteLock.current) return
		pasteLock.current = true
		setPastePending(true)
		setUrlError(undefined)
		try {
			await onPaste()
		} catch {
			setUrlError({
				title: t('import.errors.pasteTitle'),
				recovery: t('import.errors.pasteRecovery'),
				detail: t('import.errors.pasteDetail'),
			})
		} finally {
			pasteLock.current = false
			setPastePending(false)
		}
	}
	const scanQr = async () => {
		if (!onScanQr || qrLock.current) return
		qrLock.current = true
		setQrPending(true)
		setQrError(undefined)
		try {
			await onScanQr()
		} catch {
			setQrError(t('import.errors.qrScan'))
		} finally {
			qrLock.current = false
			setQrPending(false)
		}
	}

	return (
		<Tabs className={styles.root} value={method} onValueChange={setMethod}>
			<TabsList className={styles.tabs} aria-label={t('import.method')}>
				{hasQrImport ? <TabsTrigger value='qr'>QR</TabsTrigger> : null}
				<TabsTrigger value='url'>URL</TabsTrigger>
				<TabsTrigger value='manual'>{t('import.tabs.manual')}</TabsTrigger>
			</TabsList>

			{hasQrImport ? (
				<TabsContent className={styles.panel} value='qr'>
					<DrawerBody className={styles.panelScroll}>
						<div className={styles.panelContent}>
							<section className={styles.camera} aria-label={t('import.qr.preview')}>
								{method === 'qr' ? qrPreview : null}
								{method === 'qr' && !qrPreview ? (
									<div className={styles.cameraPlaceholder}>
										<QrIcon aria-hidden='true' />
										<p>{t('import.qr.preview')}</p>
										<span>{t('import.qr.previewDescription')}</span>
									</div>
								) : null}
							</section>
							{qrError ? <p role='alert'>{qrError}</p> : null}
						</div>
					</DrawerBody>
					{onScanQr ? (
						<DrawerFooter className={styles.panelFooter}>
							<Button
								className={styles.primaryAction}
								disabled={qrPending}
								onClick={() => void scanQr()}
							>
								{qrPending ? (
									<Spinner data-icon='inline-start' />
								) : (
									<QrIcon data-icon='inline-start' />
								)}
								{qrPending ? t('import.qr.scanning') : t('import.qr.scan')}
							</Button>
						</DrawerFooter>
					) : null}
				</TabsContent>
			) : null}

			<TabsContent className={styles.panel} value='url'>
				<form
					className={styles.urlForm}
					noValidate
					onSubmit={(event) => {
						event.preventDefault()
						void urlForm.handleSubmit()
					}}
				>
					<DrawerBody className={styles.panelScroll}>
						<div className={styles.panelContent}>
							<urlForm.Field name='url'>
								{(field) => {
									const validationError = firstFormError(field.state.meta.errors)
									return (
										<Field data-invalid={Boolean(validationError)}>
											<FieldLabel htmlFor='connection-import-url'>
												{t('import.url.label')}
											</FieldLabel>
											<InputGroup>
												<InputGroupInput
													id='connection-import-url'
													type='url'
													aria-invalid={validationError ? true : undefined}
													aria-describedby={
														validationError ? 'connection-import-url-error' : undefined
													}
													value={field.state.value}
													onBlur={field.handleBlur}
													onChange={(event) => {
														setUrlError(undefined)
														field.handleChange(event.target.value)
														onValueChange(event.target.value)
													}}
													placeholder={t('import.url.placeholder')}
												/>
												{onPaste ? (
													<InputGroupAddon align='inline-end'>
														<InputGroupButton
															disabled={pastePending}
															onClick={() => void paste()}
														>
															<ClipboardActionIcon data-icon='inline-start' />
															{pastePending ? t('import.url.pasting') : t('import.url.paste')}
														</InputGroupButton>
													</InputGroupAddon>
												) : null}
											</InputGroup>
											<FieldDescription>{t('import.url.description')}</FieldDescription>
											{validationError ? (
												<FieldError id='connection-import-url-error'>
													{validationError}
												</FieldError>
											) : null}
										</Field>
									)
								}}
							</urlForm.Field>
							{urlError ? <AcquisitionErrorAlert error={urlError} /> : null}
						</div>
					</DrawerBody>
					<DrawerFooter className={styles.panelFooter}>
						<urlForm.Subscribe
							selector={(state) => [state.values.url, state.isSubmitting] as const}
						>
							{([url, isSubmitting]) => (
								<Button
									type='submit'
									className={styles.primaryAction}
									disabled={!url.trim() || importPending || isSubmitting}
								>
									{importPending ? (
										<Spinner data-icon='inline-start' />
									) : (
										<UploadIcon data-icon='inline-start' />
									)}
									{importPending ? t('import.url.adding') : t('import.addConnection')}
								</Button>
							)}
						</urlForm.Subscribe>
					</DrawerFooter>
				</form>
			</TabsContent>

			<TabsContent className={styles.panel} value='manual'>
				<DrawerBody className={styles.panelScroll}>
					<div className={styles.panelContent}>
						<Field>
							<FieldLabel htmlFor='manual-protocol'>
								{t('import.manual.protocol')}
							</FieldLabel>
							<NativeSelect
								id='manual-protocol'
								value={protocol ?? ''}
								onChange={(event) => {
									setManualSaving(false)
									setManualProtocol(event.target.value as Protocol)
								}}
							>
								{supportedProtocols.map((value) => (
									<NativeSelectOption key={value} value={value}>
										{value.toUpperCase()}
									</NativeSelectOption>
								))}
							</NativeSelect>
							<FieldDescription>{t('import.manual.description')}</FieldDescription>
						</Field>
						{protocol === undefined ? (
							<p role='status'>{t('import.manual.unavailable')}</p>
						) : protocol === 'shadowsocks' ? (
							<ShadowsocksEditor
								formId={manualFormId}
								onSave={onCreateProfile}
								onSavingChange={setManualSaving}
								showSubmit={false}
							/>
						) : ['hysteria', 'hysteria2', 'ssh'].includes(protocol) ? (
							<SecureProtocolEditor
								formId={manualFormId}
								initialProtocol={protocol as 'hysteria' | 'hysteria2' | 'ssh'}
								onSave={onCreateProfile}
								onSavingChange={setManualSaving}
								showSubmit={false}
							/>
						) : (
							<StandardProtocolEditor
								key={protocol}
								formId={manualFormId}
								protocol={protocol as StandardProtocol}
								onSave={onCreateProfile}
								onSavingChange={setManualSaving}
								showSubmit={false}
							/>
						)}
					</div>
				</DrawerBody>
				<DrawerFooter className={styles.panelFooter}>
					<Button
						className={styles.primaryAction}
						disabled={manualSaving || protocol === undefined}
						form={manualFormId}
						type='submit'
					>
						{manualSaving ? <Spinner data-icon='inline-start' /> : null}
						{manualSaving
							? t('import.manual.saving')
							: protocol
								? t('import.manual.create', { protocol: protocol.toUpperCase() })
								: t('import.manual.unavailableShort')}
					</Button>
				</DrawerFooter>
			</TabsContent>
		</Tabs>
	)
}

function AcquisitionErrorAlert({
	error,
}: {
	readonly error: AcquisitionError
}) {
	const { t } = useAppTranslation()
	return (
		<Alert variant='destructive'>
			<AlertTitle>{error.title}</AlertTitle>
			<AlertDescription>
				<p>{error.recovery}</p>
				<details className={styles.errorDetails}>
					<summary>{t('common.technicalDetails')}</summary>
					<p>{error.detail}</p>
				</details>
			</AlertDescription>
		</Alert>
	)
}
