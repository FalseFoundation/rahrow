import {
	type ConnectionProfile,
	SHADOWSOCKS_METHODS,
	type ShadowsocksMethod,
} from '@rahrow/core/profile/connection-profile.ts'
import { Button } from '@rahrow/ui/components/ui/button.tsx'
import { FieldGroup } from '@rahrow/ui/components/ui/field.tsx'
import { useMemo } from 'react'

import { useAppTranslation } from '../app/app-i18n.tsx'
import {
	ProtocolSelectField,
	ProtocolTextField,
	requiredText,
	validPort,
} from '../forms/ProtocolFormFields.tsx'
import { useProtocolEditorForm } from '../forms/useProtocolEditorForm.ts'
import styles from './ShadowsocksEditor.module.css'
import {
	createShadowsocksProfileFromForm,
	shadowsocksProfileDefaultValues,
	shadowsocksProfileFormSchema,
	shadowsocksSaveErrorMessage,
	validateShadowsocksMethod,
} from './shadowsocks-profile-model.ts'

export function ShadowsocksEditor({
	profile,
	onSave,
	formId,
	showSubmit = true,
	onSavingChange,
}: {
	readonly profile?: ConnectionProfile
	readonly onSave: (profile: ConnectionProfile) => Promise<void>
	readonly formId?: string
	readonly showSubmit?: boolean
	readonly onSavingChange?: (saving: boolean) => void
}) {
	const { t } = useAppTranslation()
	const shadowsocks = profile?.protocol === 'shadowsocks' ? profile : undefined
	const editing = Boolean(shadowsocks)
	const errorId = `${formId ?? 'shadowsocks-profile'}-save-error`
	const defaultValues = useMemo(
		() => shadowsocksProfileDefaultValues(shadowsocks),
		[shadowsocks],
	)
	const { form, formError, handleSubmit } = useProtocolEditorForm({
		defaultValues,
		resetKey: shadowsocks?.id ?? 'create',
		errorId,
		fallbackError: t('editor.errors.save'),
		validator: shadowsocksProfileFormSchema,
		onSavingChange,
		onSubmit: async (values) => {
			try {
				await onSave(createShadowsocksProfileFromForm(values, shadowsocks))
			} catch (reason) {
				throw new Error(shadowsocksSaveErrorMessage(reason, values.password))
			}
		},
	})

	return (
		<form id={formId} noValidate className={styles.form} onSubmit={handleSubmit}>
			<strong className={styles.heading}>
				{editing
					? t('editor.headings.editShadowsocks')
					: t('editor.headings.createShadowsocks')}
			</strong>
			<FieldGroup>
				<form.Field name='name'>
					{(field) => (
						<ProtocolTextField
							id='ss-name'
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
						validators={{
							onSubmit: ({ value }) => requiredText(value, t('editor.fields.server')),
						}}
					>
						{(field) => (
							<ProtocolTextField
								id='ss-host'
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
						validators={{ onSubmit: ({ value }) => validPort(value) }}
					>
						{(field) => (
							<ProtocolTextField
								id='ss-port'
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
					name='method'
					validators={{
						onSubmit: ({ value }) => validateShadowsocksMethod(value),
					}}
				>
					{(field) => (
						<ProtocolSelectField
							id='ss-method'
							label={t('editor.fields.method')}
							value={field.state.value}
							options={SHADOWSOCKS_METHODS}
							onChange={(value) => field.handleChange(value as ShadowsocksMethod)}
						/>
					)}
				</form.Field>
				<form.Field
					name='password'
					validators={{
						onSubmit: ({ value }) =>
							requiredText(value, t('editor.fields.passwordOrKey')),
					}}
				>
					{(field) => (
						<ProtocolTextField
							id='ss-password'
							technical
							label={t('editor.fields.passwordOrKey')}
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
								: editing
									? t('editor.actions.saveChanges')
									: t('editor.actions.createProfile')}
						</Button>
					)}
				</form.Subscribe>
			) : null}
		</form>
	)
}
