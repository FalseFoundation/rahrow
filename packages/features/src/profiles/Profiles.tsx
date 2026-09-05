import { useAppTranslation } from '../app/app-i18n.tsx'
import { useAppRuntime } from '../app/runtime.tsx'
import { useSubscriptions } from '../subscriptions/useSubscriptions.ts'
import { ProfileManagement } from './ProfileManagement.tsx'
import styles from './Profiles.module.css'

export function Profiles() {
	const { t } = useAppTranslation()
	const runtime = useAppRuntime()
	const subscriptions = useSubscriptions()

	return (
		<section className={styles.page} aria-label={t('app.screens.profiles')}>
			<ProfileManagement
				adGate={runtime.advertising?.gate}
				capabilities={runtime.capabilities}
				engine={runtime.engine}
				logger={runtime.logger}
				profileStore={runtime.profileStore}
				registry={runtime.registry}
				settingsStore={runtime.settingsStore}
				rawEngineDocuments={runtime.rawEngineDocuments}
				smartConnect={runtime.smartConnect}
				qrPreview={runtime.renderQrCameraPreview?.()}
				subscriptions={subscriptions.state.subscriptions}
				subscriptionMessage={subscriptions.state.message}
				isLoadingSubscriptions={subscriptions.state.isLoading}
				refreshingSubscriptionIds={subscriptions.state.refreshingIds}
				onAddSubscription={subscriptions.actions.addFromUrl}
				onRefreshSubscription={subscriptions.actions.refresh}
				onRefreshSubscriptions={subscriptions.actions.refreshAll}
				onRemoveSubscription={subscriptions.actions.remove}
				onUpdateSubscription={subscriptions.actions.update}
				onReloadSubscriptions={async () => {
					await subscriptions.actions.reload()
				}}
				subscriptionFetcher={runtime.subscriptionFetcher}
				subscriptionStore={runtime.subscriptionStore}
			/>
		</section>
	)
}
