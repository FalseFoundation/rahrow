import { defineSemanticTokens } from '@pandacss/dev'

export const semanticRadii = defineSemanticTokens.radii({
	l1: { value: '{radii.lg}' },
	l2: { value: '{radii.2xl}' },
	l3: { value: '{radii.3xl}' },
	l4: { value: '{radii.4xl}' },
})
