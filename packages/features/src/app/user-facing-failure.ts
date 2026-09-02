export type RecoverableOperation = 'connect' | 'disconnect'

export interface UserFacingFailure {
	readonly operation: RecoverableOperation
	readonly title: string
	readonly description: string
	readonly retryLabel: string
}

export function connectionFailure(
	operation: RecoverableOperation,
): UserFacingFailure {
	return operation === 'connect'
		? {
				operation: 'connect',
				title: translate('connectionFailure.connect.title'),
				description: translate('connectionFailure.connect.description'),
				retryLabel: translate('common.tryAgain'),
			}
		: {
				operation: 'disconnect',
				title: translate('connectionFailure.disconnect.title'),
				description: translate('connectionFailure.disconnect.description'),
				retryLabel: translate('common.tryAgain'),
			}
}

import { translate } from './app-i18n.tsx'
