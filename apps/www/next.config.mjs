import nextra from 'nextra'

const withNextra = nextra({})
const staticExport = process.env.STATIC_EXPORT
const staticExportBasePath = staticExport === '/' ? '' : staticExport

export default withNextra({
	reactCompiler: true,
	reactStrictMode: true,
	typedRoutes: false,
	...(staticExport !== undefined && {
		basePath: staticExportBasePath,
		images: {
			unoptimized: true,
		},
		output: 'export',
		trailingSlash: true,
	}),
	devIndicators: {
		position: 'bottom-right',
	},
	experimental: {
		appNewScrollHandler: true,
		externalDir: true,
		viewTransition: true,
	},
	turbopack: {
		resolveAlias: {
			'next-mdx-import-source-file': './mdx-components.tsx',
		},
	},
})
