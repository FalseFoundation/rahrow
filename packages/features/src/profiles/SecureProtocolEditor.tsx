import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { Button } from '@rahrow/ui/components/ui/button.tsx'
import { FieldGroup } from '@rahrow/ui/components/ui/field.tsx'
import { useSelector } from '@tanstack/react-store'
import { useMemo } from 'react'

import { useAppTranslation } from '../app/app-i18n.tsx'
import {
	ProtocolSelectField,
	ProtocolTextField,
} from '../forms/ProtocolFormFields.tsx'
import { useProtocolEditorForm } from '../forms/useProtocolEditorForm.ts'
import styles from './SecureProtocolEditor.module.css'
import {
	createSecureProtocolProfileFromForm,
	type SecureProtocol,
	secureProtocolDefaultValues,
	secureProtocolFormSchema,
	validateSecureHost,
	validateSecurePort,
	validateSecureRate,
	validateSecureRequired,
} from './secure-protocol-profile-model.ts'

const secureProtocols: readonly SecureProtocol[] = [
	'hysteria',
	'hysteria2',
	'ssh',
]

export function SecureProtocolEditor({
	profile,
	initialProtocol,
	onSave,
	formId,
	showSubmit = true,
	onSavingChange,
}: {
	readonly profile?: ConnectionProfile
	readonly initialProtocol?: SecureProtocol
	readonly onSave: (profile: ConnectionProfile) => Promise<void>
	readonly formId?: string
	readonly showSubmit?: boolean
	readonly onSavingChange?: (saving: boolean) => void
}) {
	const { t } = useAppTranslation()
	const current = secureProtocols.includes(profile?.protocol as SecureProtocol)
		? profile
		: undefined
	const errorId = `${formId ?? 'secure-profile'}-save-error`
	const defaultValues = useMemo(
		() => secureProtocolDefaultValues(current, initialProtocol),
		[current, initialProtocol],
	)
	const { form, formError, handleSubmit } = useProtocolEditorForm({
		defaultValues,
		resetKey: `${current?.id ?? 'new'}:${initialProtocol ?? ''}`,
		errorId,
		fallbackError: t('editor.errors.save'),
		validator: secureProtocolFormSchema,
		onSubmit: async (values) =>
			onSave(createSecureProtocolProfileFromForm(values, current)),
		onSavingChange,
	})
	const protocol = useSelector(form.store, (state) => state.values.protocol)
	const isSsh = protocol === 'ssh'

	return (
		<form id={formId} noValidate className={styles.form} onSubmit={handleSubmit}>
			<strong className={styles.heading}>
				{current
					? t('editor.headings.editSecure')
					: t('editor.headings.createSecure')}
			</strong>
			<FieldGroup>
				<form.Field name='protocol'>
					{(field) => (
						<ProtocolSelectField
							id='secure-protocol'
							label={t('editor.fields.protocol')}
							disabled={Boolean(current || initialProtocol)}
							value={field.state.value}
							options={secureProtocols}
							onChange={(value) => field.handleChange(value as SecureProtocol)}
						/>
					)}
				</form.Field>
				<form.Field name='name'>
					{(field) => (
						<ProtocolTextField
							id='secure-name'
							label={t('editor.fields.name')}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={field.handleChange}
						/>
					)}
				</form.Field>
				<div className={styles.row}>
					<form.Field
						name='host'
						validators={{ onSubmit: ({ value }) => validateSecureHost(value) }}
					>
						{(field) => (
							<ProtocolTextField
								id='secure-host'
								technical
								label={t('editor.fields.server')}
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
						validators={{ onSubmit: ({ value }) => validateSecurePort(value) }}
					>
						{(field) => (
							<ProtocolTextField
								id='secure-port'
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
				{isSsh ? (
					<>
						<form.Field
							name='username'
							validators={{
								onSubmit: ({ value }) =>
									validateSecureRequired(value, t('editor.fields.username')),
							}}
						>
							{(field) => (
								<ProtocolTextField
									id='secure-user'
									technical
									label={t('editor.fields.username')}
									required
									value={field.state.value}
									errors={field.state.meta.errors}
									onBlur={field.handleBlur}
									onChange={field.handleChange}
								/>
							)}
						</form.Field>
						<form.Field
							name='hostKey'
							validators={{
								onSubmit: ({ value }) =>
									validateSecureRequired(value, t('editor.fields.hostKey')),
							}}
						>
							{(field) => (
								<ProtocolTextField
									id='secure-host-key'
									technical
									label={t('editor.fields.hostKey')}
									required
									value={field.state.value}
									errors={field.state.meta.errors}
									onBlur={field.handleBlur}
									onChange={field.handleChange}
								/>
							)}
						</form.Field>
					</>
				) : (
					<>
						<form.Field name='serverName'>
							{(field) => (
								<ProtocolTextField
									id='secure-sni'
									technical
									label={t('editor.fields.serverName')}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={field.handleChange}
								/>
							)}
						</form.Field>
						<form.Field name='obfsPassword'>
							{(field) => (
								<ProtocolTextField
									id='secure-obfs-password'
									technical
									label={t('editor.fields.obfsPassword')}
									type='password'
									autoComplete='new-password'
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={field.handleChange}
								/>
							)}
						</form.Field>
						{protocol === 'hysteria' ? (
							<div className={styles.row}>
								<form.Field
									name='upMbps'
									validators={{
										onSubmit: ({ value }) =>
											validateSecureRate(value, t('editor.fields.uploadMbps')),
									}}
								>
									{(field) => (
										<ProtocolTextField
											id='secure-up'
											label={t('editor.fields.uploadMbps')}
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
											validateSecureRate(value, t('editor.fields.downloadMbps')),
									}}
								>
									{(field) => (
										<ProtocolTextField
											id='secure-down'
											label={t('editor.fields.downloadMbps')}
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
					</>
				)}
				<form.Field
					name='password'
					validators={{
						onSubmit: ({ value }) =>
							validateSecureRequired(value, t('editor.fields.password')),
					}}
				>
					{(field) => (
						<ProtocolTextField
							id='secure-password'
							technical
							label={t('editor.fields.password')}
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
			</FieldGroup>
			{formError ? (
				<p className={styles.error} id={errorId} role='alert'>
					{formError}
				</p>
			) : null}
			{showSubmit ? (
				<form.Subscribe selector={(state) => state.isSubmitting}>
					{(saving) => (
						<Button
							type='submit'
							disabled={saving}
							aria-describedby={formError ? errorId : undefined}
						>
							{saving
								? t('editor.actions.saving')
								: current
									? t('editor.actions.saveChanges')
									: t('editor.actions.createProfile')}
						</Button>
					)}
				</form.Subscribe>
			) : null}
		</form>
	)
}
