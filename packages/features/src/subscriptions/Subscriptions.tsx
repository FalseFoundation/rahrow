import {
	CloudDownloadActionIcon,
	ConnectionIcon,
	DeleteIcon,
	RefreshActionIcon,
} from '@rahrow/ui/components/rahrow-icons.tsx'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@rahrow/ui/components/ui/alert-dialog.tsx'
import { Button } from '@rahrow/ui/components/ui/button.tsx'
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
} from '@rahrow/ui/components/ui/card.tsx'
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@rahrow/ui/components/ui/empty.tsx'
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
} from '@rahrow/ui/components/ui/field.tsx'
import { IconAction } from '@rahrow/ui/components/ui/icon-action.tsx'
import { Input } from '@rahrow/ui/components/ui/input.tsx'
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemMedia,
	ItemTitle,
} from '@rahrow/ui/components/ui/item.tsx'
import { Skeleton } from '@rahrow/ui/components/ui/skeleton.tsx'
import { useForm } from '@tanstack/react-form'
import { useEffect } from 'react'
import { useAppTranslation } from '../app/app-i18n.tsx'
import { ProductHeader } from '../app/ProductHeader.tsx'
import { formatRelativeTime } from '../app/relative-time.ts'
import { firstFormError } from '../forms/form-validation.ts'
import { SubscriptionMetadataSummary } from './SubscriptionMetadataSummary.tsx'
import styles from './Subscriptions.module.css'
import { subscriptionDraftFormSchema } from './subscription-actions-model.ts'
import { useSubscriptions } from './useSubscriptions.ts'

export function Subscriptions() {
	const { i18n, t } = useAppTranslation()
	const { state, actions } = useSubscriptions()
	const addFailure = state.failure?.operation === 'add' ? state.failure : null
	const addForm = useForm({
		defaultValues: { url: state.url, name: state.name },
		validators: { onSubmit: subscriptionDraftFormSchema },
		onSubmit: async () => actions.add(),
	})
	useEffect(() => {
		if (addForm.state.values.url !== state.url) {
			addForm.setFieldValue('url', state.url)
		}
		if (addForm.state.values.name !== state.name) {
			addForm.setFieldValue('name', state.name)
		}
	}, [addForm, state.name, state.url])

	return (
		<>
			<section className={styles.page} aria-label={t('subscriptions.title')}>
				<ProductHeader title={t('subscriptions.title')} />
				<div className={styles.grid}>
					<Card>
						<CardHeader>
							<h2 className={styles.cardTitle}>{t('subscriptions.addSource')}</h2>
							<CardDescription>{t('subscriptions.addDescription')}</CardDescription>
						</CardHeader>
						<form
							aria-label={t('subscriptions.addForm')}
							noValidate
							onSubmit={(event) => {
								event.preventDefault()
								void addForm.handleSubmit()
							}}
						>
							<CardContent>
								<FieldGroup>
									<addForm.Field name='url'>
										{(field) => {
											const validationError = firstFormError(field.state.meta.errors)
											const describedBy = [
												validationError ? 'subscription-url-validation-error' : '',
												addFailure ? 'subscription-add-error' : '',
											]
												.filter(Boolean)
												.join(' ')
											return (
												<Field data-invalid={Boolean(validationError || addFailure)}>
													<FieldLabel htmlFor='subscription-url'>
														{t('subscriptions.url')}
													</FieldLabel>
													<Input
														id='subscription-url'
														type='url'
														required
														disabled={!state.isInitialized}
														aria-invalid={validationError || addFailure ? true : undefined}
														aria-describedby={describedBy || undefined}
														onBlur={field.handleBlur}
														onChange={(event) => {
															field.handleChange(event.target.value)
															actions.setUrl(event.target.value)
														}}
														placeholder='https://example.com/sub.txt'
														value={field.state.value}
													/>
													{validationError ? (
														<FieldError id='subscription-url-validation-error'>
															{validationError}
														</FieldError>
													) : null}
												</Field>
											)
										}}
									</addForm.Field>
									<addForm.Field name='name'>
										{(field) => {
											const validationError = firstFormError(field.state.meta.errors)
											return (
												<Field data-invalid={Boolean(validationError)}>
													<FieldLabel htmlFor='subscription-name'>
														{t('subscriptions.name')}
													</FieldLabel>
													<Input
														id='subscription-name'
														disabled={!state.isInitialized}
														aria-invalid={validationError ? true : undefined}
														aria-describedby={
															validationError ? 'subscription-name-error' : undefined
														}
														onBlur={field.handleBlur}
														onChange={(event) => {
															field.handleChange(event.target.value)
															actions.setName(event.target.value)
														}}
														placeholder={t('subscriptions.optionalName')}
														value={field.state.value}
													/>
													{validationError ? (
														<FieldError id='subscription-name-error'>
															{validationError}
														</FieldError>
													) : null}
												</Field>
											)
										}}
									</addForm.Field>
								</FieldGroup>
								{addFailure ? (
									<p id='subscription-add-error' role='alert'>
										{addFailure.message}
									</p>
								) : null}
							</CardContent>
							<CardContent className={styles.actions}>
								<Button
									type='submit'
									disabled={state.addPending || !state.isInitialized}
								>
									{state.addPending ? t('subscriptions.adding') : t('subscriptions.add')}
								</Button>
							</CardContent>
						</form>
					</Card>
					<Card>
						<CardHeader>
							<h2 className={styles.cardTitle}>{t('subscriptions.remoteSources')}</h2>
							<CardDescription>{t('subscriptions.remoteDescription')}</CardDescription>
						</CardHeader>
						<CardContent>
							{state.initializationFailure ? (
								<div>
									<div role='alert' aria-atomic='true'>
										<h3>{state.initializationFailure.title}</h3>
										<p>{state.initializationFailure.description}</p>
										<small>{state.initializationFailure.detail}</small>
									</div>
									<Button
										type='button'
										variant='outline'
										onClick={() => void actions.retryInitialLoad()}
									>
										{t('common.retry')}
									</Button>
								</div>
							) : state.isLoading ? (
								<div
									className={styles.loadingList}
									role='status'
									aria-label={t('subscriptions.loading')}
								>
									<Skeleton />
									<Skeleton />
									<Skeleton />
								</div>
							) : state.subscriptions.length === 0 ? (
								<Empty>
									<EmptyHeader>
										<EmptyMedia variant='icon'>
											<ConnectionIcon />
										</EmptyMedia>
										<EmptyTitle>{t('subscriptions.empty')}</EmptyTitle>
										<EmptyDescription>
											{t('subscriptions.emptyDescription')}
										</EmptyDescription>
									</EmptyHeader>
								</Empty>
							) : (
								<ItemGroup>
									{state.subscriptions.map((subscription) => {
										const itemBusy =
											state.refreshingIds.has(subscription.id) ||
											state.removingIds.has(subscription.id)
										const itemFailure =
											state.failure?.subscriptionId === subscription.id
												? state.failure
												: null
										return (
											<Item variant='outline' size='sm' key={subscription.id}>
												<ItemMedia variant='icon'>
													<CloudDownloadActionIcon />
												</ItemMedia>
												<ItemContent className={styles.subscriptionContent}>
													<ItemTitle className={styles.truncate}>
														{subscription.name ?? subscription.id}
													</ItemTitle>
													<ItemDescription className={styles.subscriptionDetail}>
														<span title={subscription.url}>{subscription.url}</span>
														<span className={styles.updatedAt}>
															{t('subscriptions.updated', {
																value: subscription.updatedAt
																	? formatRelativeTime(
																			subscription.updatedAt,
																			Date.now(),
																			i18n.resolvedLanguage,
																		)
																	: t('common.never'),
															})}
														</span>
													</ItemDescription>
													{itemFailure ? (
														<div role='alert'>
															<span>{itemFailure.message}</span>
															<Button
																type='button'
																variant='link'
																onClick={() =>
																	itemFailure.operation === 'refresh'
																		? void actions.refresh(subscription)
																		: void actions.requestRemove(subscription)
																}
															>
																{t('common.tryAgain')}
															</Button>
														</div>
													) : null}
												</ItemContent>
												<ItemActions>
													<IconAction
														size='icon-sm'
														variant='ghost'
														label={t('subscriptions.refreshNamed', {
															name: subscription.name ?? subscription.id,
														})}
														disabled={itemBusy}
														onClick={() => void actions.refresh(subscription)}
													>
														<RefreshActionIcon />
													</IconAction>
													<IconAction
														size='icon-sm'
														variant='destructive'
														label={t('subscriptions.removeNamed', {
															name: subscription.name ?? subscription.id,
														})}
														disabled={itemBusy}
														onClick={() => void actions.requestRemove(subscription)}
													>
														<DeleteIcon />
													</IconAction>
												</ItemActions>
												<SubscriptionMetadataSummary metadata={subscription.metadata} />
											</Item>
										)
									})}
								</ItemGroup>
							)}
						</CardContent>
					</Card>
				</div>
			</section>
			<AlertDialog
				open={state.duplicate !== null}
				onOpenChange={(open) => {
					if (!open) actions.cancelReplace()
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('subscriptions.replaceTitle')}</AlertDialogTitle>
						<AlertDialogDescription>
							{t('subscriptions.replaceDescription')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={actions.cancelReplace}>
							{t('common.cancel')}
						</AlertDialogCancel>
						<AlertDialogAction onClick={() => void actions.confirmReplace()}>
							{t('subscriptions.replace')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
			<AlertDialog
				open={state.removalCandidate !== null}
				onOpenChange={(open) => {
					if (!open) actions.cancelRemove()
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{t('subscriptions.removeTitle')}</AlertDialogTitle>
						<AlertDialogDescription>
							{state.removalCandidate
								? t('subscriptions.removeDescription', {
										count: state.removalCandidate.ownedProfileCount,
									})
								: ''}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel onClick={actions.cancelRemove}>
							{t('common.cancel')}
						</AlertDialogCancel>
						<AlertDialogAction
							variant='destructive'
							onClick={() => void actions.confirmRemove()}
						>
							{t('subscriptions.remove')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
