import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { Button } from './button.tsx'
import { EmptyDescription, EmptyTitle } from './empty.tsx'
import { Field, FieldError } from './field.tsx'
import { Input } from './input.tsx'
import { Spinner } from './spinner.tsx'
import { Text } from './text.tsx'
import { Textarea } from './textarea.tsx'

describe('primitive semantics', () => {
	it('renders empty-state titles and descriptions as meaningful text elements', () => {
		const markup = renderToStaticMarkup(
			<>
				<EmptyTitle>No connections</EmptyTitle>
				<EmptyDescription>Add a connection to begin.</EmptyDescription>
			</>,
		)

		expect(markup).toContain('<h3')
		expect(markup).toContain('<p')
	})

	it('renders text as a paragraph by default and supports semantic composition', () => {
		expect(renderToStaticMarkup(<Text>Connection ready</Text>)).toContain('<p')
		expect(
			renderToStaticMarkup(
				<Text render={<span data-context='inline' />}>Inline status</Text>,
			),
		).toContain('<span data-context="inline"')
	})

	it('keeps an unlabelled spinner decorative and announces a labelled spinner', () => {
		const decorative = renderToStaticMarkup(<Spinner />)
		const labelled = renderToStaticMarkup(
			<Spinner aria-label='Loading profiles' />,
		)

		expect(decorative).toContain('aria-hidden="true"')
		expect(decorative).not.toContain('role="status"')
		expect(labelled).toContain('role="status"')
		expect(labelled).toContain('aria-label="Loading profiles"')
		expect(labelled).not.toContain('aria-hidden=')
	})

	it('supports explicit, durable field error association', () => {
		const markup = renderToStaticMarkup(
			<Field data-invalid>
				<Input aria-invalid aria-errormessage='server-error' />
				<FieldError id='server-error'>Server is required</FieldError>
			</Field>,
		)

		expect(markup).toContain('aria-errormessage="server-error"')
		expect(markup).toContain('id="server-error"')
		expect(markup).toContain('role="alert"')
	})

	it('keeps technical and machine-readable fields LTR', () => {
		const markup = renderToStaticMarkup(
			<>
				<Input type='url' />
				<Input inputMode='numeric' />
				<Input technical />
				<Textarea technical />
			</>,
		)
		const freeform = renderToStaticMarkup(<Input aria-label='Display name' />)

		expect(markup.match(/dir="ltr"/g)).toHaveLength(4)
		expect(freeform).toContain('aria-label="Display name"')
		expect(freeform).not.toContain('dir=')
	})

	it.each(['icon', 'icon-xs', 'icon-sm', 'icon-lg', 'square'] as const)(
		'keeps the %s icon-button alias medium and fully rounded',
		(size) => {
			const markup = renderToStaticMarkup(<Button size={size} aria-label={size} />)

			expect(markup).toContain('size-9')
			expect(markup).toContain('rounded-full')
		},
	)

	it('prevents tooltip copy from becoming selectable UI chrome', () => {
		const source = readFileSync(
			fileURLToPath(new URL('./tooltip.tsx', import.meta.url)),
			'utf8',
		)

		expect(source).toContain("'z-50 inline-flex w-fit max-w-xs select-none")
	})
})
