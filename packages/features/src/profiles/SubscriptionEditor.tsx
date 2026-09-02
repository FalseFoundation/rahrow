import type { Subscription } from '@rahrow/core/subscription/subscription-import.ts'
import { LockIcon } from '@rahrow/ui/components/rahrow-icons.tsx'
import { Button } from '@rahrow/ui/components/ui/button.tsx'
import { DrawerBody, DrawerFooter } from '@rahrow/ui/components/ui/drawer.tsx'
import {
	Field,
	FieldGroup,
	FieldLabel,
	FieldTitle,
} from '@rahrow/ui/components/ui/field.tsx'
import { Input } from '@rahrow/ui/components/ui/input.tsx'
import { Switch } from '@rahrow/ui/components/ui/switch.tsx'
import { useState } from 'react'
import { useAppTranslation } from '../app/app-i18n.tsx'
import styles from './SubscriptionEditor.module.css'

export function SubscriptionEditor({
	subscription,
	onSave,
}: {
	readonly subscription: Subscription
	readonly onSave: (subscription: Subscription) => Promise<void>
}) {
	const { t } = useAppTranslation()
	const [name, setName] = useState(subscription.name ?? '')
	const [url, setUrl] = useState(subscription.url)
	const [locked, setLocked] = useState(Boolean(subscription.locked))

	return (
		<div className={styles.drawerBody}>
			<DrawerBody className={styles.drawerScroll}>
				<FieldGroup className={styles.drawerScrollContent}>
					<Field>
						<FieldLabel htmlFor='subscription-name'>
							{t('subscriptions.editor.name')}
						</FieldLabel>
						<Input
							id='subscription-name'
							value={name}
							disabled={locked}
							onChange={(event) => setName(event.currentTarget.value)}
						/>
					</Field>
					<Field>
						<FieldLabel htmlFor='subscription-url'>
							{t('subscriptions.url')}
						</FieldLabel>
						<Input
							id='subscription-url'
							type='url'
							value={url}
							disabled={locked}
							onChange={(event) => setUrl(event.currentTarget.value)}
						/>
					</Field>
					<Field orientation='horizontal'>
						<div className={styles.lockLabel}>
							<LockIcon />
							<FieldTitle>{t('subscriptions.editor.lock')}</FieldTitle>
						</div>
						<Switch
							aria-label={t('subscriptions.editor.lock')}
							checked={locked}
							onCheckedChange={setLocked}
						/>
					</Field>
				</FieldGroup>
			</DrawerBody>
			<DrawerFooter className={styles.drawerFooter}>
				<Button
					className={styles.fullButton}
					onClick={() =>
						void onSave({
							...subscription,
							url: url.trim(),
							name: name.trim() || undefined,
							locked,
						})
					}
				>
					{t('editor.actions.saveChanges')}
				</Button>
			</DrawerFooter>
		</div>
	)
}
