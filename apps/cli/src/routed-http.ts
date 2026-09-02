import type { EgressIdentityRequester } from '@rahrow/core/platform/egress-identity.ts'

/**
 * Node's built-in fetch/undici transport has no SOCKS dispatcher. Keep CLI
 * egress observation unavailable until RahRow ships a reviewed native bridge.
 */
export function createCliRoutedHttpRequester(): EgressIdentityRequester {
	return async () => {
		throw new Error(
			'CLI proxy-routed HTTP is unavailable: the bundled Node transport cannot guarantee SOCKS routing',
		)
	}
}
