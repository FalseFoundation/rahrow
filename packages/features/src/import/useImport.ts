import { importProfilesToStore } from '@rahrow/core/profile/profile-workflow.ts'
import { isHttpSubscriptionUrl } from '@rahrow/core/subscription/subscription-import.ts'
import { useCallback, useMemo, useState } from 'react'

import { translate } from '../app/app-i18n.tsx'
import { type AppRuntime, useAppRuntime } from '../app/runtime.tsx'

export function useImport() {
	const runtime = useAppRuntime()
	const logger = useMemo(
		() => runtime.logger.child({ module: 'user-action' }),
		[runtime.logger],
	)
	const [value, setValue] = useState('')
	const [message, setMessage] = useState(translate('import.status.prompt'))
	const decodeSupported = Boolean(runtime.capabilities.qrDecoder)

	const importValue = useCallback(
		async (
			source: 'manual' | 'clipboard' | 'qr' | 'share' | 'url',
			next: string,
		) => {
			try {
				const importSource = isHttpSubscriptionUrl(next) ? 'subscription' : source
				const value = await resolveImportValue(next, runtime)
				const result = await importProfilesToStore(
					{
						value,
						source: importSource,
					},
					runtime.profileStore,
					runtime.registry,
				)

				if (result.profiles.length === 0) {
					logger.warn(
						{
							action: 'profile.import',
							outcome: 'empty',
							source: importSource,
							skippedCount: result.issues.length,
						},
						`Profile import from ${importSource} found no supported profiles`,
					)
					const message = translate('import.errors.noSupported')
					setMessage(message)
					throw new Error(message)
				}

				logger.info(
					{
						action: 'profile.import',
						outcome: 'success',
						source: importSource,
						profileCount: result.profiles.length,
						skippedCount: result.issues.length,
					},
					`Imported ${result.profiles.length} profile${result.profiles.length === 1 ? '' : 's'} from ${importSource}`,
				)
				setMessage(
					result.issues.length > 0
						? translate('import.status.importedWithSkipped', {
								count: result.profiles.length,
								skipped: result.issues.length,
							})
						: translate('import.status.imported', { count: result.profiles.length }),
				)
			} catch (error) {
				logger.warn(
					{
						action: 'profile.import',
						outcome: 'failure',
						source,
						errorType: error instanceof Error ? error.name : typeof error,
					},
					`Profile import from ${source} failed`,
				)
				setMessage(translate('import.errors.failed'))
				throw error
			}
		},
		[logger, runtime],
	)

	const importPasted = useCallback(async () => {
		await importValue('manual', value)
	}, [importValue, value])

	const importClipboard = useCallback(async () => {
		try {
			const next = await runtime.capabilities.clipboard.read()
			setValue(next)
			await importValue('clipboard', next)
		} catch {
			setMessage(translate('import.errors.clipboardFailed'))
		}
	}, [importValue, runtime])

	const decodeQr = useCallback(async () => {
		if (!runtime.capabilities.qrDecoder) {
			setMessage(translate('import.errors.qrUnavailable'))
			return
		}

		try {
			const next = await runtime.capabilities.qrDecoder.decode(value)
			setValue(next)
			await importValue('qr', next)
		} catch {
			setMessage(translate('import.errors.qrDecode'))
		}
	}, [importValue, runtime, value])

	return {
		state: { value, message, decodeSupported },
		actions: {
			setValue,
			importPasted,
			importClipboard,
			decodeQr,
		},
	}
}

async function resolveImportValue(next: string, runtime: AppRuntime) {
	if (!isHttpSubscriptionUrl(next)) {
		return next
	}

	return runtime.subscriptionFetcher.fetch({
		id: 'import-url',
		url: next.trim(),
	})
}
