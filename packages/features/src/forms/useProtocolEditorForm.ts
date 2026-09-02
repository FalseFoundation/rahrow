import { useForm } from '@tanstack/react-form'
import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import type { ZodType } from 'zod'

import { focusFirstInvalid } from './ProtocolFormFields.tsx'

export interface ProtocolEditorFormOptions<TValues> {
	readonly defaultValues: TValues
	readonly resetKey: string
	readonly errorId: string
	readonly fallbackError: string
	readonly validator: ZodType<TValues, TValues>
	readonly onSubmit: (values: TValues) => Promise<void>
	readonly onSavingChange?: (saving: boolean) => void
}

/**
 * Shared protocol-editor convention: TanStack Form owns values, validation and
 * pending state; feature models own defaults and draft conversion; this hook
 * owns only async submission, reset, form errors and invalid-field focus.
 */
export function useProtocolEditorForm<TValues>({
	defaultValues,
	resetKey,
	errorId,
	fallbackError,
	validator,
	onSubmit,
	onSavingChange,
}: ProtocolEditorFormOptions<TValues>) {
	const [formError, setFormError] = useState('')
	const submitInFlight = useRef(false)
	const form = useForm({
		defaultValues,
		validators: { onSubmit: validator },
		onSubmit: async ({ value }) => {
			setFormError('')
			onSavingChange?.(true)
			try {
				await onSubmit(value)
			} catch (reason) {
				setFormError(reason instanceof Error ? reason.message : fallbackError)
			} finally {
				onSavingChange?.(false)
			}
		},
	})

	useEffect(() => {
		setFormError('')
		form.reset(defaultValues)
	}, [defaultValues, form, resetKey])

	const handleSubmit = useCallback(
		async (event: FormEvent<HTMLFormElement>) => {
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
		},
		[form],
	)

	return {
		form,
		formError,
		errorId,
		handleSubmit,
	}
}
