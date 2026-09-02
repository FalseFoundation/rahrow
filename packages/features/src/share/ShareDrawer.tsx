import type {
	Clipboard,
	FileSave,
	Share,
} from '@rahrow/core/platform/capabilities.ts'
import {
	CloseIcon,
	CopyIcon,
	DownloadIcon,
	QrIcon,
	ShareIcon,
} from '@rahrow/ui/components/rahrow-icons.tsx'
import { Button } from '@rahrow/ui/components/ui/button.tsx'
import { ButtonGroup } from '@rahrow/ui/components/ui/button-group.tsx'
import {
	Drawer,
	DrawerBody,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
} from '@rahrow/ui/components/ui/drawer.tsx'
import { Field, FieldLabel } from '@rahrow/ui/components/ui/field.tsx'
import { IconAction } from '@rahrow/ui/components/ui/icon-action.tsx'
import { toast } from '@rahrow/ui/components/ui/sonner.tsx'
import { Spinner } from '@rahrow/ui/components/ui/spinner.tsx'
import { useSelector } from '@tanstack/react-store'
import { Store } from '@tanstack/store'
import {
	createContext,
	type ReactNode,
	use,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'

import { useAppTranslation } from '../app/app-i18n.tsx'
import { createQrDataUrl } from './qr-image.ts'
import styles from './ShareDrawer.module.css'
import {
	qrPngFilename,
	shouldUseMultilineShareValue,
} from './share-drawer-model.ts'

export interface ShareDrawerPayload {
	readonly title: string
	readonly description?: string
	readonly label: string
	readonly value: string
	readonly qrValue?: string
	readonly filename?: string
}

export interface ShareDrawerController {
	readonly open: (payload: ShareDrawerPayload) => void
	readonly close: () => void
}

interface ShareDrawerState {
	readonly payload: ShareDrawerPayload | null
}

interface ShareDrawerContextValue {
	readonly capabilities: ShareDrawerCapabilities
	readonly controller: ShareDrawerController
	readonly registerNestedOutlet: () => () => void
	readonly store: Store<ShareDrawerState>
}

interface ShareDrawerCapabilities {
	readonly clipboard: Clipboard
	readonly share?: Share
	readonly fileSave?: FileSave
}

const ShareDrawerContext = createContext<ShareDrawerContextValue | null>(null)

export function ShareDrawerProvider({
	capabilities,
	children,
}: {
	readonly capabilities: ShareDrawerCapabilities
	readonly children: ReactNode
}) {
	const store = useMemo(() => new Store<ShareDrawerState>({ payload: null }), [])
	const [nestedOutletCount, setNestedOutletCount] = useState(0)
	const controller = useMemo<ShareDrawerController>(
		() => ({
			open: (payload) => store.setState(() => ({ payload })),
			close: () => store.setState(() => ({ payload: null })),
		}),
		[store],
	)
	const registerNestedOutlet = useCallback(() => {
		setNestedOutletCount((count) => count + 1)
		return () => setNestedOutletCount((count) => Math.max(0, count - 1))
	}, [])
	const contextValue = useMemo(
		() => ({ capabilities, controller, registerNestedOutlet, store }),
		[capabilities, controller, registerNestedOutlet, store],
	)
	const payload = useSelector(store, (state) => state.payload)

	return (
		<ShareDrawerContext value={contextValue}>
			{children}
			{nestedOutletCount === 0 ? (
				<ShareDrawer
					capabilities={capabilities}
					payload={payload}
					onClose={controller.close}
				/>
			) : null}
		</ShareDrawerContext>
	)
}

export function ShareDrawerOutlet() {
	const context = use(ShareDrawerContext)
	if (!context) {
		throw new Error('ShareDrawerOutlet must be used inside ShareDrawerProvider')
	}
	const payload = useSelector(context.store, (state) => state.payload)

	useEffect(() => context.registerNestedOutlet(), [context.registerNestedOutlet])

	return (
		<ShareDrawer
			capabilities={context.capabilities}
			payload={payload}
			onClose={context.controller.close}
		/>
	)
}

export function useShareDrawer(): ShareDrawerController {
	const context = use(ShareDrawerContext)

	if (!context) {
		throw new Error('useShareDrawer must be used inside ShareDrawerProvider')
	}

	return context.controller
}

function ShareDrawer({
	capabilities,
	payload,
	onClose,
}: {
	readonly capabilities: ShareDrawerCapabilities
	readonly payload: ShareDrawerPayload | null
	readonly onClose: () => void
}) {
	const { t } = useAppTranslation()
	const [qrDataUrl, setQrDataUrl] = useState('')
	const [qrError, setQrError] = useState<string>()
	const [qrAttempt, setQrAttempt] = useState(0)
	const [pendingAction, setPendingAction] = useState<
		'copy' | 'share' | 'download' | null
	>(null)
	const actionLock = useRef(false)

	useEffect(() => {
		let active = true
		setQrDataUrl('')
		setQrError(undefined)
		setPendingAction(null)

		if (!payload) return () => undefined

		void createQrDataUrl(payload.qrValue ?? payload.value)
			.then((dataUrl) => {
				if (active) setQrDataUrl(dataUrl)
			})
			.catch(() => {
				if (active) {
					setQrError(t('share.errors.qr'))
				}
			})

		return () => {
			active = false
		}
	}, [payload, qrAttempt, t])

	const runAction = useCallback(
		async (
			action: 'copy' | 'share',
			work: () => Promise<void>,
			success: string,
			failure: string,
		) => {
			if (actionLock.current) return
			actionLock.current = true
			setPendingAction(action)
			try {
				await work()
				toast.success(success)
			} catch (error) {
				if (!(error instanceof Error && error.name === 'AbortError')) {
					toast.error(failure)
				}
			} finally {
				actionLock.current = false
				setPendingAction(null)
			}
		},
		[],
	)

	if (!payload) {
		return <Drawer open={false} />
	}

	const multiline = shouldUseMultilineShareValue(payload.value)
	const actionPending = pendingAction !== null

	return (
		<Drawer
			open
			onOpenChange={(open) => {
				if (!open) onClose()
			}}
			showSwipeHandle
		>
			<DrawerContent variant='app' scrollable>
				<DrawerHeader className={styles.header}>
					<div className={styles.headerCopy}>
						<DrawerTitle>{payload.title}</DrawerTitle>
						{payload.description ? (
							<DrawerDescription>{payload.description}</DrawerDescription>
						) : null}
					</div>
					<IconAction
						className={styles.closeButton}
						variant='ghost'
						size='icon-sm'
						label={t('share.close')}
						render={<DrawerClose />}
					>
						<CloseIcon aria-hidden='true' />
					</IconAction>
				</DrawerHeader>

				<DrawerBody className={styles.body}>
					<div className={styles.bodyContent}>
						<div className={styles.qrFrame}>
							{qrDataUrl ? (
								<img src={qrDataUrl} alt={t('share.qrAlt', { title: payload.title })} />
							) : qrError ? (
								<div className={styles.qrError}>
									<QrIcon aria-hidden='true' />
									<span role='alert' aria-atomic='true'>
										{t('share.errors.qr')}
									</span>
									<Button
										variant='outline'
										onClick={() => setQrAttempt((attempt) => attempt + 1)}
									>
										{t('share.retryQr')}
									</Button>
								</div>
							) : (
								<div className={styles.qrLoading} role='status'>
									<QrIcon aria-hidden='true' />
									<span>{t('share.generating')}</span>
								</div>
							)}
						</div>

						<Field>
							<FieldLabel htmlFor='share-payload'>{payload.label}</FieldLabel>
							<textarea
								id='share-payload'
								className={styles.valuePreview}
								data-multiline={multiline || undefined}
								data-selectable
								readOnly
								rows={multiline ? 6 : 2}
								spellCheck={false}
								value={payload.value}
								wrap={multiline ? 'soft' : 'off'}
							/>
						</Field>
					</div>
				</DrawerBody>

				<DrawerFooter className={styles.footer}>
					<ButtonGroup className={styles.actions}>
						{capabilities.clipboard.supported !== false ? (
							<IconAction
								className={styles.action}
								variant='outline'
								size='icon-lg'
								disabled={actionPending}
								label={t('share.copy')}
								onClick={() =>
									void runAction(
										'copy',
										() => capabilities.clipboard.write(payload.value),
										t('share.copied'),
										t('share.errors.copy'),
									)
								}
							>
								{pendingAction === 'copy' ? (
									<Spinner data-icon='inline-start' />
								) : (
									<CopyIcon data-icon='inline-start' />
								)}
							</IconAction>
						) : null}
						{capabilities.share ? (
							<IconAction
								className={styles.action}
								variant='outline'
								size='icon-lg'
								disabled={actionPending}
								label={t('share.share')}
								onClick={() =>
									void runAction(
										'share',
										() =>
											capabilities.share?.share({
												title: payload.title,
												text: payload.value,
											}) ?? Promise.resolve(),
										t('share.opened'),
										t('share.errors.system'),
									)
								}
							>
								{pendingAction === 'share' ? (
									<Spinner data-icon='inline-start' />
								) : (
									<ShareIcon data-icon='inline-start' />
								)}
							</IconAction>
						) : null}
						{capabilities.fileSave ? (
							<IconAction
								className={styles.action}
								variant='outline'
								size='icon-lg'
								disabled={!qrDataUrl || actionPending}
								label={t('share.saveQr')}
								onClick={() => {
									if (actionLock.current) return
									actionLock.current = true
									setPendingAction('download')
									void capabilities.fileSave
										?.save({
											dataUrl: qrDataUrl,
											filename: qrPngFilename(payload.filename),
										})
										.then((result) => {
											if (result === 'cancelled') {
												return
											}
											toast.success(t('share.saved'))
										})
										.catch(() => {
											toast.error(t('share.errors.save'))
										})
										.finally(() => {
											actionLock.current = false
											setPendingAction(null)
										})
								}}
							>
								{pendingAction === 'download' || !qrDataUrl ? (
									<Spinner data-icon='inline-start' />
								) : (
									<DownloadIcon data-icon='inline-start' />
								)}
							</IconAction>
						) : null}
					</ButtonGroup>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	)
}
