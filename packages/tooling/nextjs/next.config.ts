import type { NextConfig } from 'next'

export const nextConfig: NextConfig = {
	/* config options here */
	reactCompiler: true,
	reactStrictMode: true,
	typedRoutes: false,
	experimental: {
		externalDir: true,
		appNewScrollHandler: true,
		viewTransition: true,
	},
}

export default nextConfig
