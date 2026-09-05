import {
	type ConnectionProfile,
	SHADOWSOCKS_METHODS,
} from '@rahrow/core/profile/connection-profile.ts'
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '@rahrow/ui/components/ui/accordion.tsx'
import { Button } from '@rahrow/ui/components/ui/button.tsx'
import { DrawerBody, DrawerFooter } from '@rahrow/ui/components/ui/drawer.tsx'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from '@rahrow/ui/components/ui/field.tsx'
import {
	NativeSelect,
	NativeSelectOption,
} from '@rahrow/ui/components/ui/native-select.tsx'
import { Spinner } from '@rahrow/ui/components/ui/spinner.tsx'
import { Switch } from '@rahrow/ui/components/ui/switch.tsx'
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from '@rahrow/ui/components/ui/tabs.tsx'
import { Textarea } from '@rahrow/ui/components/ui/textarea.tsx'
import { useForm } from '@tanstack/react-form'
import { useSelector } from '@tanstack/react-store'
import { useEffect, useRef, useState } from 'react'
import { translate, useAppTranslation } from '../app/app-i18n.tsx'
import {
	focusFirstInvalid,
	requiredText,
	ProtocolTextField as TextControl,
	validPort,
} from '../forms/ProtocolFormFields.tsx'
import styles from './ConnectionProfileEditor.module.css'
import {
	buildEditedConnectionProfile,
	type CanonicalProfileChangePreview,
	connectionProfileEditorFormSchema,
	formatCanonicalProfileJson,
	previewCanonicalProfileJsonChange,
	profileSupportsSecurity,
	profileSupportsTransport,
	toConnectionProfileEditorValues,
} from './connection-profile-editor-model.ts'

const TRANSPORT_TYPES = ['tcp', 'ws', 'grpc', 'httpupgrade', 'quic'] as const
const SECURITY_TYPES = ['none', 'tls', 'reality'] as const
const PACKET_ENCODINGS = ['none', 'packet', 'xudp'] as const

export interface ConnectionProfileEditorProps {
	readonly profile: ConnectionProfile
	readonly onSave: (profile: ConnectionProfile) => Promise<void>
}

/**
 * Edits RahRow's canonical profile model. This is intentionally not an Xray or
 * sing-box configuration editor: engine configuration is generated downstream.
 */
export function ConnectionProfileEditor({
	profile,
	onSave,
}: ConnectionProfileEditorProps) {
	const { t } = useAppTranslation()
	const [baseProfile, setBaseProfile] = useState(profile)
	const [tab, setTab] = useState<'form' | 'advanced'>('form')
	const [error, setError] = useState('')
	const [canonicalJson, setCanonicalJson] = useState(() =>
		formatCanonicalProfileJson(profile),
	)
	const [jsonError, setJsonError] = useState('')
	const [jsonPreview, setJsonPreview] =
		useState<CanonicalProfileChangePreview | null>(null)
	const submitInFlight = useRef(false)
	const form = useForm({
		defaultValues: toConnectionProfileEditorValues(baseProfile),
		validators: { onSubmit: connectionProfileEditorFormSchema(baseProfile) },
		onSubmit: async ({ value }) => {
			setError('')
			try {
				await onSave(buildEditedConnectionProfile(baseProfile, value))
			} catch {
				setError(t('editor.errors.save'))
			}
		},
	})

	useEffect(() => {
		setBaseProfile(profile)
		setCanonicalJson(formatCanonicalProfileJson(profile))
		setTab('form')
		setJsonError('')
		setJsonPreview(null)
		setError('')
		form.reset(toConnectionProfileEditorValues(profile))
	}, [profile])

	const transportEnabled = useSelector(
		form.store,
		(state) => state.values.transportEnabled,
	)
	const transportType = useSelector(
		form.store,
		(state) => state.values.transportType,
	)
	const securityType = useSelector(
		form.store,
		(state) => state.values.securityType,
	)
	const supportsTransport = profileSupportsTransport(baseProfile)
	const supportsSecurity = profileSupportsSecurity(baseProfile)
	const hysteria =
		baseProfile.protocol === 'hysteria' || baseProfile.protocol === 'hysteria2'

	function syncFormToCanonicalJson() {
		setJsonError('')
		setJsonPreview(null)
		try {
			setCanonicalJson(
				formatCanonicalProfileJson(
					buildEditedConnectionProfile(baseProfile, form.state.values),
				),
			)
		} catch {
			setJsonError(t('editor.errors.buildJson'))
		}
	}

	function applyCanonicalJson() {
		setJsonError('')
		try {
			const preview =
				jsonPreview ?? previewCanonicalProfileJsonChange(canonicalJson, baseProfile)
			if (!jsonPreview && preview.changedPaths.length > 0) {
				setJsonPreview(preview)
				return
			}
			const parsed = preview.profile
			setBaseProfile(parsed)
			form.reset(toConnectionProfileEditorValues(parsed))
			setCanonicalJson(formatCanonicalProfileJson(parsed))
			setJsonPreview(null)
		} catch {
			setJsonError(t('editor.errors.applyJson'))
			setTimeout(() => document.getElementById('profile-editor-json')?.focus(), 0)
		}
	}

	return (
		<form
			className={styles.form}
			noValidate
			onSubmit={async (event) => {
				event.preventDefault()
				if (submitInFlight.current) return
				submitInFlight.current = true
				const element = event.currentTarget
				try {
					await form.handleSubmit()
					focusFirstInvalid(element)
				} finally {
					submitInFlight.current = false
				}
			}}
		>
			<DrawerBody className={styles.editorBody}>
				<div className={styles.editorBodyContent}>
					<Tabs
						value={tab}
						onValueChange={(value) => {
							const next = value as 'form' | 'advanced'
							if (next === 'advanced') {
								syncFormToCanonicalJson()
							}
							setTab(next)
						}}
					>
						<TabsList className={styles.tabs} aria-label={t('editor.mode')}>
							<TabsTrigger value='form'>{t('editor.tabs.fields')}</TabsTrigger>
							<TabsTrigger value='advanced'>{t('editor.tabs.json')}</TabsTrigger>
						</TabsList>

						<TabsContent value='form' className={styles.tabContent}>
							<Accordion defaultValue={['common', 'authentication']}>
								<AccordionItem value='common'>
									<AccordionTrigger>{t('editor.sections.common')}</AccordionTrigger>
									<AccordionContent>
										<FieldGroup>
											<Field data-disabled='true'>
												<FieldLabel htmlFor='profile-editor-protocol'>
													{t('editor.fields.protocol')}
												</FieldLabel>
												<NativeSelect
													id='profile-editor-protocol'
													disabled
													value={baseProfile.protocol}
												>
													<NativeSelectOption value={baseProfile.protocol}>
														{protocolLabel(baseProfile.protocol)}
													</NativeSelectOption>
												</NativeSelect>
												<FieldDescription>
													{t('editor.fields.protocolReadonly')}
												</FieldDescription>
											</Field>

											<form.Field name='name'>
												{(field) => (
													<TextControl
														id='profile-editor-name'
														label={t('editor.fields.remarks')}
														value={field.state.value}
														onBlur={field.handleBlur}
														onChange={field.handleChange}
													/>
												)}
											</form.Field>

											<div className={styles.endpointRow}>
												<form.Field
													name='host'
													validators={{
														onBlur: ({ value }) =>
															value.trim() ? undefined : t('editor.validation.serverRequired'),
														onSubmit: ({ value }) =>
															requiredText(value, t('editor.fields.server')),
													}}
												>
													{(field) => (
														<TextControl
															id='profile-editor-host'
															technical
															label={t('editor.fields.address')}
															required
															value={field.state.value}
															errors={field.state.meta.errors}
															onBlur={field.handleBlur}
															onChange={field.handleChange}
														/>
													)}
												</form.Field>

												<form.Field
													name='port'
													validators={{
														onBlur: ({ value }) => {
															const port = Number(value)
															return Number.isInteger(port) && port > 0 && port <= 65_535
																? undefined
																: t('editor.validation.port')
														},
														onSubmit: ({ value }) => validPort(value),
													}}
												>
													{(field) => (
														<TextControl
															id='profile-editor-port'
															label={t('editor.fields.port')}
															required
															inputMode='numeric'
															value={field.state.value}
															errors={field.state.meta.errors}
															onBlur={field.handleBlur}
															onChange={field.handleChange}
														/>
													)}
												</form.Field>
											</div>
										</FieldGroup>
									</AccordionContent>
								</AccordionItem>

								<AccordionItem value='authentication'>
									<AccordionTrigger>
										{t('editor.sections.authentication')}
									</AccordionTrigger>
									<AccordionContent>
										<AuthenticationFields profile={baseProfile} form={form} />
									</AccordionContent>
								</AccordionItem>

								{supportsTransport ? (
									<AccordionItem value='transport'>
										<AccordionTrigger>{t('editor.sections.transport')}</AccordionTrigger>
										<AccordionContent>
											<FieldGroup>
												<form.Field name='transportEnabled'>
													{(field) => (
														<Field orientation='horizontal'>
															<FieldLabel htmlFor='profile-editor-transport-enabled'>
																{t('editor.fields.explicitTransport')}
															</FieldLabel>
															<Switch
																id='profile-editor-transport-enabled'
																checked={field.state.value}
																onCheckedChange={field.handleChange}
															/>
														</Field>
													)}
												</form.Field>

												{transportEnabled ? (
													<>
														<form.Field name='transportType'>
															{(field) => (
																<SelectControl
																	id='profile-editor-transport'
																	label={t('editor.fields.network')}
																	value={field.state.value}
																	onChange={(value) =>
																		field.handleChange(value as typeof field.state.value)
																	}
																	options={TRANSPORT_TYPES}
																/>
															)}
														</form.Field>
														<TransportDetailFields type={transportType} form={form} />
													</>
												) : null}
											</FieldGroup>
										</AccordionContent>
									</AccordionItem>
								) : null}

								{supportsSecurity ? (
									<AccordionItem value='security'>
										<AccordionTrigger>{t('editor.sections.security')}</AccordionTrigger>
										<AccordionContent>
											<FieldGroup>
												<form.Field name='securityType'>
													{(field) => (
														<SelectControl
															id='profile-editor-security'
															label={t('editor.fields.streamSecurity')}
															disabled={hysteria}
															value={hysteria ? 'tls' : field.state.value}
															onChange={(value) =>
																field.handleChange(value as typeof field.state.value)
															}
															options={hysteria ? ['tls'] : SECURITY_TYPES}
														/>
													)}
												</form.Field>

												{securityType !== 'none' || hysteria ? (
													<SecurityFields
														form={form}
														reality={securityType === 'reality' && !hysteria}
													/>
												) : null}
											</FieldGroup>
										</AccordionContent>
									</AccordionItem>
								) : null}

								{hysteria ? (
									<AccordionItem value='hysteria'>
										<AccordionTrigger>{t('editor.sections.hysteria')}</AccordionTrigger>
										<AccordionContent>
											<HysteriaFields profile={baseProfile} form={form} />
										</AccordionContent>
									</AccordionItem>
								) : null}
							</Accordion>
						</TabsContent>

						<TabsContent value='advanced' className={styles.tabContent}>
							<FieldGroup>
								<Field data-invalid={Boolean(jsonError)}>
									<FieldLabel htmlFor='profile-editor-json'>
										{t('editor.json.label')}
									</FieldLabel>
									<Textarea
										id='profile-editor-json'
										technical
										className={styles.jsonEditor}
										aria-invalid={Boolean(jsonError)}
										aria-errormessage={
											jsonError ? 'profile-editor-json-error' : undefined
										}
										aria-describedby={jsonError ? 'profile-editor-json-error' : undefined}
										spellCheck={false}
										value={canonicalJson}
										onChange={(event) => {
											setCanonicalJson(event.target.value)
											setJsonPreview(null)
										}}
									/>
									<FieldDescription>{t('editor.json.description')}</FieldDescription>
									{jsonError ? (
										<FieldError id='profile-editor-json-error'>{jsonError}</FieldError>
									) : null}
									{jsonPreview ? (
										<div className={styles.jsonDiff} role='status'>
											<strong>{t('editor.json.apply')}</strong>
											<ul>
												{jsonPreview.changedPaths.map((path) => (
													<li key={path}>{path}</li>
												))}
											</ul>
										</div>
									) : null}
								</Field>
							</FieldGroup>
						</TabsContent>
					</Tabs>

					{error ? (
						<FieldError id='profile-editor-save-error' role='alert'>
							{error}
						</FieldError>
					) : null}
				</div>
			</DrawerBody>
			<DrawerFooter className={styles.editorFooter}>
				{tab === 'advanced' ? (
					<div className={styles.editorUtilities}>
						<Button type='button' variant='outline' onClick={syncFormToCanonicalJson}>
							{t('editor.json.reset')}
						</Button>
						<Button type='button' variant='secondary' onClick={applyCanonicalJson}>
							{t('editor.json.apply')}
						</Button>
					</div>
				) : null}
				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(saving) => (
						<Button
							type='submit'
							disabled={saving}
							aria-describedby={error ? 'profile-editor-save-error' : undefined}
						>
							{saving ? <Spinner data-icon='inline-start' /> : null}
							{saving ? t('editor.actions.saving') : t('editor.actions.saveChanges')}
						</Button>
					)}
				</form.Subscribe>
			</DrawerFooter>
		</form>
	)
}

type EditorForm = ReturnType<typeof useConnectionEditorFormType>

function useConnectionEditorFormType() {
	const profile = {} as ConnectionProfile
	return useForm({
		defaultValues: toConnectionProfileEditorValues(profile),
		validators: { onSubmit: connectionProfileEditorFormSchema(profile) },
	})
}

function AuthenticationFields({
	profile,
	form,
}: {
	readonly profile: ConnectionProfile
	readonly form: EditorForm
}) {
	if (profile.protocol === 'vless' || profile.protocol === 'vmess') {
		return (
			<FieldGroup>
				<form.Field
					name='authenticationId'
					validators={{
						onSubmit: ({ value }) =>
							requiredText(value, translate('editor.fields.userId')),
					}}
				>
					{(field) => (
						<TextControl
							id='profile-editor-id'
							technical
							label={translate('editor.fields.userId')}
							required
							value={field.state.value}
							errors={field.state.meta.errors}
							onBlur={field.handleBlur}
							onChange={field.handleChange}
						/>
					)}
				</form.Field>
				<form.Field name='flow'>
					{(field) => (
						<TextControl
							id='profile-editor-flow'
							technical
							label={translate('editor.fields.flow')}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={field.handleChange}
						/>
					)}
				</form.Field>
				<form.Field name='encryption'>
					{(field) => (
						<TextControl
							id='profile-editor-encryption'
							technical
							label={translate('editor.fields.encryption')}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={field.handleChange}
						/>
					)}
				</form.Field>
			</FieldGroup>
		)
	}

	if (profile.protocol === 'shadowsocks') {
		return (
			<FieldGroup>
				<form.Field name='method'>
					{(field) => (
						<SelectControl
							id='profile-editor-method'
							label={translate('editor.fields.method')}
							value={field.state.value}
							onChange={(value) =>
								field.handleChange(value as typeof field.state.value)
							}
							options={SHADOWSOCKS_METHODS}
						/>
					)}
				</form.Field>
				<PasswordField
					form={form}
					label={translate('editor.fields.passwordOrKey')}
				/>
			</FieldGroup>
		)
	}

	if (profile.protocol === 'ssh') {
		return (
			<FieldGroup>
				<form.Field
					name='username'
					validators={{
						onSubmit: ({ value }) =>
							requiredText(value, translate('editor.fields.username')),
					}}
				>
					{(field) => (
						<TextControl
							id='profile-editor-username'
							technical
							label={translate('editor.fields.username')}
							required
							value={field.state.value}
							errors={field.state.meta.errors}
							onBlur={field.handleBlur}
							onChange={field.handleChange}
						/>
					)}
				</form.Field>
				<PasswordField form={form} />
				<form.Field
					name='hostKey'
					validators={{
						onSubmit: ({ value }) =>
							requiredText(value, translate('editor.fields.hostKey')),
					}}
				>
					{(field) => (
						<TextControl
							id='profile-editor-host-key'
							technical
							label={translate('editor.fields.hostKey')}
							required
							value={field.state.value}
							errors={field.state.meta.errors}
							onBlur={field.handleBlur}
							onChange={field.handleChange}
						/>
					)}
				</form.Field>
			</FieldGroup>
		)
	}

	return (
		<FieldGroup>
			<PasswordField form={form} />
		</FieldGroup>
	)
}

function PasswordField({
	form,
	label = translate('editor.fields.password'),
}: {
	readonly form: EditorForm
	readonly label?: string
}) {
	return (
		<form.Field
			name='password'
			validators={{ onSubmit: ({ value }) => requiredText(value, label) }}
		>
			{(field) => (
				<TextControl
					id='profile-editor-password'
					technical
					label={label}
					required
					type='password'
					autoComplete='new-password'
					value={field.state.value}
					errors={field.state.meta.errors}
					onBlur={field.handleBlur}
					onChange={field.handleChange}
				/>
			)}
		</form.Field>
	)
}

function TransportDetailFields({
	type,
	form,
}: {
	readonly type: 'tcp' | 'ws' | 'grpc' | 'httpupgrade' | 'quic'
	readonly form: EditorForm
}) {
	return (
		<>
			{type === 'ws' || type === 'httpupgrade' ? (
				<>
					<form.Field name='transportHost'>
						{(field) => (
							<TextControl
								id='profile-editor-transport-host'
								technical
								label={translate('editor.fields.host')}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={field.handleChange}
							/>
						)}
					</form.Field>
					<form.Field name='transportPath'>
						{(field) => (
							<TextControl
								id='profile-editor-transport-path'
								technical
								label={translate('editor.fields.path')}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={field.handleChange}
							/>
						)}
					</form.Field>
				</>
			) : null}

			{type === 'grpc' ? (
				<form.Field name='serviceName'>
					{(field) => (
						<TextControl
							id='profile-editor-service-name'
							technical
							label={translate('editor.fields.serviceName')}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={field.handleChange}
						/>
					)}
				</form.Field>
			) : null}

			{type === 'tcp' ? (
				<form.Field name='headerType'>
					{(field) => (
						<SelectControl
							id='profile-editor-header-type'
							label={translate('editor.fields.headerType')}
							value={field.state.value}
							onChange={(value) =>
								field.handleChange(value as typeof field.state.value)
							}
							options={['none', 'http']}
						/>
					)}
				</form.Field>
			) : null}

			<form.Field name='packetEncoding'>
				{(field) => (
					<SelectControl
						id='profile-editor-packet-encoding'
						label={translate('editor.fields.packetEncoding')}
						value={field.state.value}
						onChange={(value) =>
							field.handleChange(value as typeof field.state.value)
						}
						options={PACKET_ENCODINGS}
					/>
				)}
			</form.Field>

			<form.Field name='mux'>
				{(field) => (
					<Field orientation='horizontal'>
						<FieldLabel htmlFor='profile-editor-mux'>
							{translate('editor.fields.multiplexing')}
						</FieldLabel>
						<Switch
							id='profile-editor-mux'
							checked={field.state.value}
							onCheckedChange={field.handleChange}
						/>
					</Field>
				)}
			</form.Field>
		</>
	)
}

function SecurityFields({
	form,
	reality,
}: {
	readonly form: EditorForm
	readonly reality: boolean
}) {
	return (
		<>
			<form.Field name='serverName'>
				{(field) => (
					<TextControl
						id='profile-editor-sni'
						technical
						label={translate('editor.fields.serverName')}
						value={field.state.value}
						onBlur={field.handleBlur}
						onChange={field.handleChange}
					/>
				)}
			</form.Field>
			<form.Field name='fingerprint'>
				{(field) => (
					<TextControl
						id='profile-editor-fingerprint'
						technical
						label={translate('editor.fields.fingerprint')}
						value={field.state.value}
						onBlur={field.handleBlur}
						onChange={field.handleChange}
					/>
				)}
			</form.Field>
			<form.Field name='alpn'>
				{(field) => (
					<TextControl
						id='profile-editor-alpn'
						technical
						label={translate('editor.fields.alpn')}
						value={field.state.value}
						onBlur={field.handleBlur}
						onChange={field.handleChange}
					/>
				)}
			</form.Field>

			{reality ? (
				<>
					<form.Field name='publicKey'>
						{(field) => (
							<TextControl
								id='profile-editor-public-key'
								technical
								label={translate('editor.fields.publicKey')}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={field.handleChange}
							/>
						)}
					</form.Field>
					<form.Field name='shortId'>
						{(field) => (
							<TextControl
								id='profile-editor-short-id'
								technical
								label={translate('editor.fields.shortId')}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={field.handleChange}
							/>
						)}
					</form.Field>
					<form.Field name='spiderX'>
						{(field) => (
							<TextControl
								id='profile-editor-spider-x'
								technical
								label={translate('editor.fields.spiderX')}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={field.handleChange}
							/>
						)}
					</form.Field>
				</>
			) : null}

			<form.Field name='allowInsecure'>
				{(field) => (
					<Field orientation='horizontal'>
						<div>
							<FieldLabel htmlFor='profile-editor-allow-insecure'>
								{translate('editor.fields.allowInsecure')}
							</FieldLabel>
							<FieldDescription>
								{translate('editor.fields.allowInsecureDescription')}
							</FieldDescription>
						</div>
						<Switch
							id='profile-editor-allow-insecure'
							checked={field.state.value}
							onCheckedChange={field.handleChange}
						/>
					</Field>
				)}
			</form.Field>
		</>
	)
}

function HysteriaFields({
	profile,
	form,
}: {
	readonly profile: ConnectionProfile
	readonly form: EditorForm
}) {
	return (
		<FieldGroup>
			{profile.protocol === 'hysteria' ? (
				<div className={styles.endpointRow}>
					<form.Field
						name='upMbps'
						validators={{
							onSubmit: ({ value }) =>
								positiveRate(value, translate('editor.fields.uploadMbps')),
						}}
					>
						{(field) => (
							<TextControl
								id='profile-editor-up-mbps'
								label={translate('editor.fields.uploadMbps')}
								required
								inputMode='numeric'
								value={field.state.value}
								errors={field.state.meta.errors}
								onBlur={field.handleBlur}
								onChange={field.handleChange}
							/>
						)}
					</form.Field>
					<form.Field
						name='downMbps'
						validators={{
							onSubmit: ({ value }) =>
								positiveRate(value, translate('editor.fields.downloadMbps')),
						}}
					>
						{(field) => (
							<TextControl
								id='profile-editor-down-mbps'
								label={translate('editor.fields.downloadMbps')}
								required
								inputMode='numeric'
								value={field.state.value}
								errors={field.state.meta.errors}
								onBlur={field.handleBlur}
								onChange={field.handleChange}
							/>
						)}
					</form.Field>
				</div>
			) : null}
			<form.Field name='obfsPassword'>
				{(field) => (
					<TextControl
						id='profile-editor-obfs-password'
						technical
						label={translate('editor.fields.obfsPassword')}
						type='password'
						autoComplete='new-password'
						value={field.state.value}
						onBlur={field.handleBlur}
						onChange={field.handleChange}
					/>
				)}
			</form.Field>
		</FieldGroup>
	)
}

function SelectControl({
	id,
	label,
	value,
	options,
	onChange,
	disabled,
}: {
	readonly id: string
	readonly label: string
	readonly value: string
	readonly options: readonly string[]
	readonly onChange: (value: string) => void
	readonly disabled?: boolean
}) {
	return (
		<Field data-disabled={disabled || undefined}>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<NativeSelect
				id={id}
				disabled={disabled}
				value={value}
				onChange={(event) => onChange(event.target.value)}
			>
				{options.map((option) => (
					<NativeSelectOption key={option} value={option}>
						{protocolLabel(option)}
					</NativeSelectOption>
				))}
			</NativeSelect>
		</Field>
	)
}

function protocolLabel(value: string): string {
	if (value === 'httpupgrade') {
		return 'HTTP Upgrade'
	}

	if (value === 'grpc') {
		return 'gRPC'
	}

	return value.toUpperCase()
}

function positiveRate(value: string, label: string): string | undefined {
	const number = Number(value)
	return Number.isFinite(number) && number > 0
		? undefined
		: translate('editor.validation.positive', { label })
}
