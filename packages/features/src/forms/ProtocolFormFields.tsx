import {
	Field,
	FieldError,
	FieldLabel,
} from '@rahrow/ui/components/ui/field.tsx'
import { Input } from '@rahrow/ui/components/ui/input.tsx'
import {
	NativeSelect,
	NativeSelectOption,
} from '@rahrow/ui/components/ui/native-select.tsx'

import { translate } from '../app/app-i18n.tsx'
import { firstFormError } from './form-validation.ts'

export function requiredText(value: string, label: string): string | undefined {
	return value.trim() ? undefined : translate('validation.required', { label })
}

export function validPort(value: string): string | undefined {
	const port = Number(value)
	return Number.isInteger(port) && port > 0 && port <= 65_535
		? undefined
		: translate('validation.port')
}

export function focusFirstInvalid(form: HTMLFormElement): void {
	setTimeout(() => {
		form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
	}, 0)
}

export function ProtocolTextField({
	id,
	label,
	value,
	errors,
	onChange,
	...props
}: {
	readonly id: string
	readonly label: string
	readonly value: string
	readonly errors?: readonly unknown[]
	readonly onChange: (value: string) => void
} & Omit<
	React.ComponentProps<typeof Input>,
	'id' | 'value' | 'onChange' | 'aria-invalid' | 'aria-errormessage'
>) {
	const message = firstFormError(errors ?? [])
	const errorId = `${id}-error`

	return (
		<Field data-invalid={Boolean(message)}>
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			<Input
				id={id}
				aria-invalid={message ? true : undefined}
				aria-errormessage={message ? errorId : undefined}
				aria-describedby={message ? errorId : undefined}
				value={value}
				onChange={(event) => onChange(event.target.value)}
				{...props}
			/>
			{message ? <FieldError id={errorId}>{message}</FieldError> : null}
		</Field>
	)
}

export function ProtocolSelectField({
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
						{option}
					</NativeSelectOption>
				))}
			</NativeSelect>
		</Field>
	)
}
