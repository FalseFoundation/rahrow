import type { MDXComponents } from 'nextra/mdx-components'
import { useMDXComponents as getNextraComponents } from 'nextra/mdx-components'

const nextraComponents = getNextraComponents()

export function useMDXComponents(components: MDXComponents = {}): MDXComponents {
	return {
		...nextraComponents,
		...components,
	}
}
