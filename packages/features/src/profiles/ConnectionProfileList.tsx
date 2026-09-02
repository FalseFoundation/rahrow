import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { ChevronIcon, MoreIcon } from '@rahrow/ui/components/rahrow-icons.tsx'
import { Badge } from '@rahrow/ui/components/ui/badge.tsx'
import { Button } from '@rahrow/ui/components/ui/button.tsx'
import { IconAction } from '@rahrow/ui/components/ui/icon-action.tsx'
import {
	Item,
	ItemActions,
	ItemContent,
	ItemDescription,
	ItemGroup,
	ItemTitle,
} from '@rahrow/ui/components/ui/item.tsx'
import { NumberTicker } from '@rahrow/ui/components/ui/number-ticker.tsx'
import { Spinner } from '@rahrow/ui/components/ui/spinner.tsx'
import { useAppTranslation } from '../app/app-i18n.tsx'
import {
	type LatencyProbeResult,
	presentLatency,
} from '../app/latency-presentation.ts'
import styles from './ConnectionProfileList.module.css'
import { profileName } from './profile-library-model.ts'

export interface ConnectionProfileListProps {
	readonly listKey?: string
	readonly profiles: readonly ConnectionProfile[]
	readonly selectedId: string
	readonly onActivate: (profile: ConnectionProfile) => Promise<void>
	readonly onActions: (profile: ConnectionProfile) => void
	readonly speedTests: Readonly<Record<string, LatencyProbeResult | undefined>>
	readonly testingIds?: ReadonlySet<string>
}

export function ConnectionProfileList(props: ConnectionProfileListProps) {
	return (
		<ItemGroup className={styles.rows} role='list'>
			{props.profiles.map((profile, index) => (
				<ConnectionProfileRow
					key={profile.id}
					profile={profile}
					selected={profile.id === props.selectedId}
					latency={props.speedTests[profile.id]}
					testing={props.testingIds?.has(profile.id) ?? false}
					onActivate={props.onActivate}
					onActions={props.onActions}
					position={index + 1}
					setSize={props.profiles.length}
				/>
			))}
		</ItemGroup>
	)
}

export function ConnectionProfileRow({
	profile,
	selected,
	latency,
	testing,
	onActivate,
	onActions,
	onFocus,
	role = 'listitem',
	position,
	setSize,
}: {
	readonly profile: ConnectionProfile
	readonly selected: boolean
	readonly latency: LatencyProbeResult | undefined
	readonly testing: boolean
	readonly onActivate: (profile: ConnectionProfile) => Promise<void>
	readonly onActions: (profile: ConnectionProfile) => void
	readonly onFocus?: () => void
	readonly role?: 'listitem' | 'presentation'
	readonly position: number
	readonly setSize: number
}) {
	const { t } = useAppTranslation()
	const latencyPresentation = latency ? presentLatency(latency) : null

	return (
		<Item
			variant='flush'
			size='xs'
			className={styles.profileRow}
			data-selected={selected}
			role={role}
			aria-posinset={position}
			aria-setsize={setSize}
		>
			<Button
				variant='ghost'
				className={styles.profileActivate}
				data-profile-activate
				data-profile-id={profile.id}
				aria-current={selected ? 'true' : undefined}
				onFocus={onFocus}
				onClick={() => void onActivate(profile)}
			>
				<ItemContent className={styles.profileMain}>
					<Badge variant='flag'>{protocolBadgeLabel(profile.protocol)}</Badge>
					<span className={styles.profileCopy}>
						<ItemTitle>{profileName(profile)}</ItemTitle>
						<ItemDescription className={styles.endpoint}>
							{profile.endpoint.host}:{profile.endpoint.port}
						</ItemDescription>
					</span>
				</ItemContent>
				{testing ? (
					<Spinner aria-label={`Testing ${profileName(profile)}`} />
				) : latencyPresentation ? (
					<span
						role='status'
						className={styles.rowMeta}
						data-latency-kind={latencyPresentation.kind}
						aria-label={latencyPresentation.label}
					>
						{latencyPresentation.kind === 'measured' ? (
							<span aria-hidden='true' dir='ltr'>
								<NumberTicker value={latencyPresentation.value} /> ms
							</span>
						) : (
							latencyPresentation.label
						)}
					</span>
				) : null}
			</Button>
			<ItemActions className={styles.rowMeta}>
				<IconAction
					variant='ghost'
					size='square'
					label={t('profiles.actions.more')}
					onClick={(event) => {
						event.stopPropagation()
						onActions(profile)
					}}
				>
					<MoreIcon />
				</IconAction>
				<IconAction
					variant='ghost'
					size='icon-xs'
					aria-current={selected ? 'true' : undefined}
					label={t('profiles.actions.use')}
					onClick={() => void onActivate(profile)}
				>
					<ChevronIcon />
				</IconAction>
			</ItemActions>
		</Item>
	)
}

function protocolBadgeLabel(protocol: ConnectionProfile['protocol']): string {
	return protocol === 'shadowsocks' ? 'SS' : protocol.toUpperCase()
}
