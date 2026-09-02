import tailwindcss from '@tailwindcss/postcss'

const resolveInlinedFontsourceAssets = {
	postcssPlugin: 'resolve-inlined-fontsource-assets',
	OnceExit(root) {
		root.walkDecls('src', (declaration) => {
			declaration.value = declaration.value
				.replaceAll(
					'url(./files/manrope-',
					'url(@fontsource-variable/manrope/files/manrope-',
				)
				.replaceAll(
					'url(./files/geist-mono-',
					'url(@fontsource-variable/geist-mono/files/geist-mono-',
				)
		})
	},
}

export default {
	plugins: [tailwindcss(), resolveInlinedFontsourceAssets],
}
