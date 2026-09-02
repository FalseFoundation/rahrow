import { isHttpSubscriptionUrl } from '@rahrow/core/subscription/subscription-import.ts'
import { useAppTranslation } from '../app/app-i18n.tsx'
import { ProductHeader } from '../app/ProductHeader.tsx'
import { useAppRuntime } from '../app/runtime.tsx'
import { useSubscriptions } from '../subscriptions/useSubscriptions.ts'
import { ConnectionImportDrawer } from './ConnectionImportDrawer.tsx'
import styles from './Import.module.css'
import { useImport } from './useImport.ts'

export function Import() {
	const { t } = useAppTranslation()
	const runtime = useAppRuntime()
	const { state, actions } = useImport()
	const subscriptions = useSubscriptions()

	return (
		<section className={styles.page} aria-label={t('import.ariaLabel')}>
			<ProductHeader
				eyebrow={t('app.screens.profiles')}
				title={t('import.addConnection')}
			/>
			<ConnectionImportDrawer
				value={state.value}
				onValueChange={actions.setValue}
				onPaste={
					runtime.capabilities.clipboard.supported === false
						? undefined
						: async () => {
								actions.setValue(await runtime.capabilities.clipboard.read())
							}
				}
				onImportUrl={async () => {
					if (isHttpSubscriptionUrl(state.value)) {
						await subscriptions.actions.addFromUrl(state.value)
						return
					}
					await actions.importPasted()
				}}
				onScanQr={runtime.capabilities.qrDecoder ? actions.decodeQr : undefined}
				qrPreview={runtime.renderQrCameraPreview?.()}
				supportedProtocols={runtime.engine.manifest.supportedProtocols}
				onCreateProfile={async (profile) => {
					await runtime.profileStore.save(profile)
				}}
			/>
			<p className={styles.status} role='status'>
				{state.message} · {subscriptions.state.message}
			</p>
		</section>
	)
}
