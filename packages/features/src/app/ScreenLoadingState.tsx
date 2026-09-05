import { Skeleton } from '@rahrow/ui/components/ui/skeleton.tsx'

import styles from './ScreenLoadingState.module.css'

export type ScreenLoadingVariant =
	| 'home'
	| 'connections'
	| 'subscriptions'
	| 'settings'
	| 'diagnostics'
	| 'logs'
	| 'generic'

const rowsByVariant: Readonly<Record<ScreenLoadingVariant, number>> = {
	home: 3,
	connections: 6,
	subscriptions: 5,
	settings: 7,
	diagnostics: 4,
	logs: 6,
	generic: 4,
}

export function ScreenLoadingState({
	label,
	variant = 'generic',
}: {
	readonly label: string
	readonly variant?: ScreenLoadingVariant
}) {
	return (
		<section className={styles.state} data-loading-variant={variant}>
			<div role='status' aria-live='polite' aria-atomic='true'>
				<span className={styles.srOnly}>{label}</span>
				<div className={styles.skeletons} aria-hidden='true'>
					<Skeleton className={styles.heading} />
					{Array.from({ length: rowsByVariant[variant] }, (_, index) => (
						<Skeleton
							className={index === 0 ? styles.featuredRow : styles.row}
							key={`${variant}-${index}`}
						/>
					))}
				</div>
			</div>
		</section>
	)
}
