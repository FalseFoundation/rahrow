import {
	ChevronIcon,
	ConnectionIcon,
	GlobeIcon,
	PowerIcon,
	ServerIcon,
	ShieldReadyIcon,
	ZapIconComponent,
} from '@rahrow/ui/components/rahrow-icons.tsx'
import { Backlight } from '@rahrow/ui/components/ui/backlight.tsx'
import { Badge } from '@rahrow/ui/components/ui/badge.tsx'
import { Button } from '@rahrow/ui/components/ui/button.tsx'
import { Card, CardContent } from '@rahrow/ui/components/ui/card.tsx'
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@rahrow/ui/components/ui/empty.tsx'
import { Heading } from '@rahrow/ui/components/ui/heading.tsx'
import { IconAction } from '@rahrow/ui/components/ui/icon-action.tsx'
import { MorphingText } from '@rahrow/ui/components/ui/morphing-text.tsx'
import { NumberTicker } from '@rahrow/ui/components/ui/number-ticker.tsx'
import { Ripple } from '@rahrow/ui/components/ui/ripple.tsx'
import { Skeleton } from '@rahrow/ui/components/ui/skeleton.tsx'
import { toast } from '@rahrow/ui/components/ui/sonner.tsx'
import { Spinner } from '@rahrow/ui/components/ui/spinner.tsx'
import { Text } from '@rahrow/ui/components/ui/text.tsx'
import { useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAppTranslation } from '../app/app-i18n.tsx'
import { BrandLogo } from '../app/BrandLogo.tsx'
import { presentLatency } from '../app/latency-presentation.ts'
import { ProductHeader } from '../app/ProductHeader.tsx'
import { SmartConnectStatus } from '../smart-connect/SmartConnectStatus.tsx'
import styles from './Home.module.css'
import {
	connectionModeLabel,
	countryPresentation,
	homeDisplay,
} from './home-model.ts'
import { useHome } from './useHome.ts'

export function Home() {
	const { t, i18n } = useAppTranslation()
	const { state, actions, smartConnect } = useHome()
	const navigate = useNavigate()
	const connected = state.connectionState === 'connected'
	const connecting = state.pendingAction === 'connect'
	const selected = state.selectedProfile
	const toggleConnection = state.canDisconnect
		? actions.disconnect
		: actions.connect
	const profileName = selected ? state.profileLabel(selected) : ''
	const protocol = selected?.protocol.toUpperCase() ?? '—'
	const latency = state.latency ? presentLatency(state.latency) : null
	const locale = i18n.resolvedLanguage ?? i18n.language ?? 'en'
	const egressCountry =
		state.egressIdentity.status === 'available'
			? countryPresentation(state.egressIdentity.observation.countryCode, locale)
			: null
	const currentCountry =
		state.egressIdentity.status !== 'disconnected' &&
		state.egressIdentity.status !== 'loading' &&
		state.egressIdentity.current?.status === 'available'
			? countryPresentation(
					state.egressIdentity.current.observation.countryCode,
					locale,
				)
			: null
	const display = homeDisplay({
		hasProfile: Boolean(selected),
		connectionState: state.connectionState,
		engineStatus: state.engineStatus,
		latency: state.latency,
	})
	const modeLabel = connectionModeLabel({
		connectionMode: state.connectionMode,
		vpnSupported: state.vpnSupported,
		systemProxySupported: state.systemProxySupported,
	})
	const connectionActionLabel = connecting
		? t('home.actions.connecting')
		: state.canDisconnect
			? t('home.actions.disconnect')
			: t('home.actions.connect')
	const connectingText = [
		t('home.connecting.connecting'),
		t('home.connecting.securing'),
		t('home.connecting.almostReady'),
	]

	useEffect(() => {
		if (!state.failure) {
			toast.dismiss('home-connection-failure')
			return
		}
		toast.error(state.failure.title, {
			description: state.failure.description,
			id: 'home-connection-failure',
			action: {
				label: state.failure.retryLabel,
				onClick: () => void actions.retryFailure(),
			},
			cancel: {
				label: t('settings.app.diagnostics'),
				onClick: () =>
					void navigate({
						to: '/settings',
						search: { drawer: 'diagnostics' },
					}),
			},
		})
	}, [actions.retryFailure, navigate, state.failure, t])

	return (
		<section className={styles.page} aria-label={t('app.screens.home')}>
			<ProductHeader
				title={t('app.name')}
				leading={
					<BrandLogo
						className={styles.brandMark}
						inverted
						label={t('app.name')}
					/>
				}
				actions={
					smartConnect.state.status !== 'unavailable' ? (
						<IconAction
							variant='toolbar'
							size='square'
							disabled={
								state.isInitialized === false ||
								!selected ||
								smartConnect.state.isLoading ||
								smartConnect.state.status === 'running'
							}
							data-active={smartConnect.state.enabled || undefined}
							aria-pressed={smartConnect.state.enabled}
							aria-busy={smartConnect.state.status === 'running'}
							label={t('smartConnect.action')}
							onClick={() =>
								void (smartConnect.state.enabled
									? smartConnect.actions.run()
									: smartConnect.actions.start())
							}
						>
							<ZapIconComponent />
						</IconAction>
					) : undefined
				}
			/>

			<div className={styles.homeView}>
				{state.initializationFailure ? (
					<Card variant='glass' className={styles.failure}>
						<CardContent className={styles.failureContent}>
							<div
								className={styles.failureCopy}
								role='alert'
								aria-live='assertive'
								aria-atomic='true'
							>
								<h2>{state.initializationFailure.title}</h2>
								<p>{state.initializationFailure.description}</p>
								<small>{state.initializationFailure.detail}</small>
							</div>
							<div className={styles.failureActions}>
								<Button type='button' onClick={() => void actions.refresh()}>
									{t('common.retry')}
								</Button>
								<Button
									type='button'
									variant='outline'
									onClick={() =>
										void navigate({
											to: '/settings',
											search: { drawer: 'diagnostics' },
										})
									}
								>
									{t('home.actions.viewDiagnostics')}
								</Button>
							</div>
						</CardContent>
					</Card>
				) : state.isInitialized === false ? (
					<div
						className={styles.homeLoading}
						role='status'
						aria-label={t('home.loading')}
					>
						<Skeleton className={styles.loadingIntro} />
						<Skeleton className={styles.loadingHero} />
						<Skeleton className={styles.loadingConnection} />
					</div>
				) : display.showEmptyState ? (
					<Empty className={styles.homeEmpty}>
						<EmptyHeader>
							<EmptyMedia variant='icon'>
								<ServerIcon />
							</EmptyMedia>
							<EmptyTitle>{t('home.empty.title')}</EmptyTitle>
							<EmptyDescription>{t('home.empty.description')}</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button type='button' onClick={() => void navigate({ to: '/profiles' })}>
								<ConnectionIcon data-icon='inline-start' />
								{t('home.actions.browseConnections')}
							</Button>
						</EmptyContent>
					</Empty>
				) : (
					<>
						<SmartConnectStatus {...smartConnect} compact />
						<div className={styles.intro}>
							<span className={styles.eyebrow}>
								<span className={styles.statusDot} data-live={connected} />
								{connecting
									? t('home.status.connecting')
									: connected
										? state.connectionMode === 'proxy'
											? t('home.status.proxyActive')
											: t('home.status.tunnelActive')
										: t('home.status.ready')}
							</span>
							<span className={styles.version}>{modeLabel}</span>
						</div>

						<Card
							variant='featured'
							className={styles.hero}
							data-connected={connected}
						>
							<CardContent className={styles.heroContent}>
								{/* <div className={styles.pointField} aria-hidden='true'>
							· ··· · · ·· · ··· ·
						</div> */}
								<div className={styles.powerControl} data-connected={connected}>
									<Ripple
										className={styles.powerRipple}
										mainCircleSize={92}
										mainCircleOpacity={connected ? 0.2 : 0.1}
										numCircles={4}
									/>
									<Backlight className={styles.powerBacklight} blur={connected ? 14 : 8}>
										<div
											className={styles.powerHalo}
											data-active={connected || connecting}
											data-connected={connected}
										>
											<Button
												variant='status'
												size='control-xl'
												data-connected={connected}
												disabled={
													state.isPending || (!state.canConnect && !state.canDisconnect)
												}
												onClick={() => void toggleConnection()}
												aria-label={connectionActionLabel}
												title={connectionActionLabel}
												aria-describedby={
													!connected && state.connectUnavailableReason
														? 'home-connect-unavailable'
														: undefined
												}
											>
												{state.isPending && state.pendingAction !== 'test' ? (
													<Spinner />
												) : connected ? (
													<ShieldReadyIcon strokeWidth={1.5} />
												) : (
													<PowerIcon strokeWidth={1.5} />
												)}
											</Button>
										</div>
									</Backlight>
								</div>
								<div className={styles.connectionCopy}>
									{connecting ? (
										<MorphingText
											aria-label={t('home.actions.connecting')}
											className={styles.connectionMorph}
											texts={connectingText}
											variant='compact'
										/>
									) : (
										<Heading level={2} className={styles.connectionTitle}>
											{connected
												? state.connectionMode === 'proxy'
													? t('home.hero.proxyConnected')
													: t('home.hero.protected')
												: t('home.hero.ready')}
										</Heading>
									)}
									<Text
										className={styles.connectionDescription}
										id={
											!connected && state.connectUnavailableReason
												? 'home-connect-unavailable'
												: undefined
										}
									>
										{connected
											? state.connectionMode === 'proxy'
												? t('home.hero.proxyDescription', { protocol })
												: t('home.hero.tunnelDescription', { protocol })
											: connecting
												? t('home.hero.establishing')
												: (state.connectUnavailableReason ?? t('home.hero.oneTap'))}
									</Text>
								</div>
								<div className={styles.telemetry}>
									<div>
										<span>{t('home.telemetry.protocol')}</span>
										<strong>{protocol}</strong>
									</div>
									{display.showEngineStatus ? (
										<div>
											<span>{t('home.telemetry.engine')}</span>
											<strong>{state.engineStatus}</strong>
										</div>
									) : null}
									{display.showLatency ? (
										<div>
											<span>{t('home.telemetry.latency')}</span>
											<strong
												role='status'
												data-latency-kind={latency?.kind}
												aria-label={latency?.label}
											>
												{latency?.kind === 'measured' ? (
													<span aria-hidden='true' dir='ltr'>
														<NumberTicker value={latency.value} /> ms
													</span>
												) : (
													latency?.label
												)}
											</strong>
										</div>
									) : null}
								</div>
							</CardContent>
						</Card>

						<Button
							variant='surface'
							className={styles.activeConnection}
							type='button'
							onClick={() => void navigate({ to: '/profiles' })}
						>
							<span className={styles.serverIcon}>
								<GlobeIcon />
							</span>
							<span className={styles.activeCopy}>
								<span>
									{connected
										? t('home.connection.active')
										: t('home.connection.selected')}
								</span>
								<strong>
									<Badge variant='flag'>{protocol.slice(0, 2)}</Badge>
									{profileName}
								</strong>
							</span>
							<ChevronIcon data-icon='inline-end' />
						</Button>

						{display.showRoute ? (
							<div className={styles.metrics}>
								<article className={styles.metric}>
									<span>{t('home.route.egress')}</span>
									<strong data-selectable dir='ltr' role='status'>
										{state.egressIdentity.status === 'available'
											? state.egressIdentity.observation.ip
											: state.egressIdentity.status === 'loading'
												? t('home.route.checking')
												: t('home.route.unavailable')}
									</strong>
									<small>
										{state.egressIdentity.status === 'available' ? (
											<>
												{egressCountry ? (
													<>
														<span aria-hidden='true'>{egressCountry.flag}</span>{' '}
														{egressCountry.name} ·{' '}
													</>
												) : null}
												{state.egressIdentity.observation.provider === 'cloudflare'
													? t('home.route.observedCloudflare')
													: t('home.route.observedIpify')}
											</>
										) : state.egressIdentity.status === 'loading' ? (
											t('home.route.checkingHint')
										) : (
											t('home.route.unavailableHint')
										)}
									</small>
								</article>
								{state.egressIdentity.status !== 'disconnected' &&
								state.egressIdentity.status !== 'loading' &&
								state.egressIdentity.current ? (
									<article className={styles.metric}>
										<span>{t('home.route.current')}</span>
										<strong data-selectable dir='ltr' role='status'>
											{state.egressIdentity.current.status === 'available'
												? state.egressIdentity.current.observation.ip
												: t('home.route.unavailable')}
										</strong>
										<small>
											{state.egressIdentity.current.status === 'available' ? (
												<>
													{currentCountry ? (
														<>
															<span aria-hidden='true'>{currentCountry.flag}</span>{' '}
															{currentCountry.name} ·{' '}
														</>
													) : null}
													{t('home.route.currentHint')}
												</>
											) : (
												t('home.route.unavailableHint')
											)}
										</small>
									</article>
								) : null}
								{state.networkQuality.status === 'testing' ? (
									<article className={`${styles.metric} ${styles.metricWide}`}>
										<small className={styles.networkQuality} role='status'>
											{t('home.route.qualityTesting')}
										</small>
									</article>
								) : state.networkQuality.status === 'complete' &&
									state.networkQuality.result.reachable ? (
									<>
										<article className={styles.metric}>
											<span>{t('home.route.latency')}</span>
											<strong data-selectable dir='ltr' role='status'>
												{state.networkQuality.result.latencyMs !== undefined
													? t('home.route.latencyValue', {
															latency: state.networkQuality.result.latencyMs,
														})
													: t('home.route.unavailable')}
											</strong>
											<small>{t('home.route.latencyHint')}</small>
										</article>
										<article className={styles.metric}>
											<span>{t('home.route.download')}</span>
											<strong data-selectable dir='ltr' role='status'>
												{state.networkQuality.result.downloadMbps !== undefined
													? t('home.route.downloadValue', {
															download: state.networkQuality.result.downloadMbps,
														})
													: t('home.route.unavailable')}
											</strong>
											<small>
												{state.networkQuality.result.downloadMbps !== undefined
													? t('home.route.downloadHint')
													: t('home.route.qualityDownloadUnavailable')}
											</small>
										</article>
									</>
								) : state.networkQuality.status === 'complete' ? (
									<article className={`${styles.metric} ${styles.metricWide}`}>
										<small className={styles.networkQuality} role='status'>
											{t('home.route.qualityUnavailable')}
										</small>
									</article>
								) : null}
							</div>
						) : null}
					</>
				)}
			</div>
		</section>
	)
}
