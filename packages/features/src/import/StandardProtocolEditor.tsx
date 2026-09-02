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
import {
	createStandardProfileFromForm,
	type StandardProtocol,
	standardProfileDefaultValues,
	standardProfileFormSchema,
	validateStandardCredential,
	validateStandardHost,
	validateStandardPort,
} from './manual-profile-model.ts'
import styles from './StandardProtocolEditor.module.css'

export function StandardProtocolEditor({
	protocol,
	onSave,
	formId,
	showSubmit = true,
	onSavingChange,
}: {
	readonly protocol: StandardProtocol
	readonly onSave: (profile: ConnectionProfile) => Promise<void>
	readonly formId?: string
	readonly showSubmit?: boolean
	readonly onSavingChange?: (saving: boolean) => void
}) {
	const { t } = useAppTranslation()
	const errorId = `${formId ?? 'manual-profile'}-save-error`
	const defaultValues = useMemo(
		() => standardProfileDefaultValues(protocol),
		[protocol],
	)
	const { form, formError, handleSubmit } = useProtocolEditorForm({
		defaultValues,
		resetKey: protocol,
		errorId,
		fallbackError: t('editor.errors.create'),
		validator: standardProfileFormSchema,
		onSubmit: async (values) => onSave(createStandardProfileFromForm(values)),
		onSavingChange,
	})
	const security = useSelector(form.store, (state) => state.values.security)
	const credentialLabel =
		protocol === 'trojan'
			? t('editor.fields.password')
			: t('editor.fields.userId')

	return (
		<form
			id={formId}
			noValidate
			className={styles.manualForm}
			onSubmit={handleSubmit}
		>
			<FieldGroup>
				<form.Field name='name'>
					{(field) => (
						<ProtocolTextField
							id='manual-name'
							label={t('editor.fields.name')}
							value={field.state.value}
							onBlur={field.handleBlur}
							onChange={field.handleChange}
						/>
					)}
				</form.Field>
				<div className={styles.fieldRow}>
					<form.Field
						name='host'
						validators={{ onSubmit: ({ value }) => validateStandardHost(value) }}
					>
						{(field) => (
							<ProtocolTextField
								id='manual-host'
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
						validators={{ onSubmit: ({ value }) => validateStandardPort(value) }}
					>
						{(field) => (
							<ProtocolTextField
								id='manual-port'
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
				<form.Field
					name='credential'
					validators={{
						onSubmit: ({ value }) => validateStandardCredential(protocol, value),
					}}
				>
					{(field) => (
						<ProtocolTextField
							id='manual-credential'
							technical
							label={credentialLabel}
							required
							type={protocol === 'trojan' ? 'password' : 'text'}
							value={field.state.value}
							errors={field.state.meta.errors}
							onBlur={field.handleBlur}
							onChange={field.handleChange}
						/>
					)}
				</form.Field>
				<form.Field name='security'>
					{(field) => (
						<ProtocolSelectField
							id='manual-security'
							label={t('editor.fields.security')}
							value={field.state.value}
							options={['tls', 'none']}
							onChange={(value) => field.handleChange(value as 'none' | 'tls')}
						/>
					)}
				</form.Field>
				{security === 'tls' ? (
					<form.Field name='serverName'>
						{(field) => (
							<ProtocolTextField
								id='manual-sni'
								technical
								label={t('editor.fields.serverName')}
								value={field.state.value}
								onBlur={field.handleBlur}
								onChange={field.handleChange}
							/>
						)}
					</form.Field>
				) : null}
			</FieldGroup>
			{formError ? (
				<p id={errorId} role='alert'>
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
								: t('editor.actions.createProtocolProfile', {
										protocol: protocol.toUpperCase(),
									})}
						</Button>
					)}
				</form.Subscribe>
			) : null}
		</form>
	)
}
