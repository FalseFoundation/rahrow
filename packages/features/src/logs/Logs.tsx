import { ActivityIcon } from '@rahrow/ui/components/rahrow-icons.tsx'
import { Badge } from '@rahrow/ui/components/ui/badge.tsx'
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from '@rahrow/ui/components/ui/empty.tsx'
import { Heading } from '@rahrow/ui/components/ui/heading.tsx'
import { Text } from '@rahrow/ui/components/ui/text.tsx'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useLayoutEffect, useRef, useState } from 'react'
import { useAppTranslation } from '../app/app-i18n.tsx'
import { useAppScrollViewport } from '../app/app-scroll-context.tsx'
import styles from './Logs.module.css'
import { formatLogTime, logLevelBadgeVariant } from './logs-model.ts'
import { useLogs } from './useLogs.ts'

export function Logs() {
	const { t } = useAppTranslation()
	const records = useLogs()
	const appScrollViewport = useAppScrollViewport()
	const listRef = useRef<HTMLUListElement>(null)
	const [scrollMargin, setScrollMargin] = useState(0)
	const virtualizer = useVirtualizer({
		count: records.length,
		getScrollElement: () => appScrollViewport.current,
		getItemKey: (index) => records[index]?.id ?? index,
		estimateSize: () => 72,
		overscan: 8,
		scrollMargin,
		anchorTo: 'start',
		useFlushSync: false,
	})

	useLayoutEffect(() => {
		const viewport = appScrollViewport.current
		const list = listRef.current
		if (!viewport || !list) return

		const measureMargin = () => {
			const next =
				list.getBoundingClientRect().top -
				viewport.getBoundingClientRect().top +
				viewport.scrollTop
			setScrollMargin((current) => (current === next ? current : next))
		}
		measureMargin()
		if (typeof ResizeObserver === 'undefined') return
		const observer = new ResizeObserver(measureMargin)
		observer.observe(list)
		return () => observer.disconnect()
	}, [appScrollViewport])

	return (
		<section className={styles.page} aria-labelledby='application-logs-title'>
			<div className={styles.sectionHeading}>
				<Heading level={2} id='application-logs-title'>
					{t('logs.title')}
				</Heading>
				<Text>{t('logs.description')}</Text>
			</div>
			<div className={styles.logCard}>
				{records.length === 0 ? (
					<Empty className={styles.empty}>
						<EmptyHeader>
							<EmptyMedia variant='icon'>
								<ActivityIcon />
							</EmptyMedia>
							<EmptyTitle>{t('logs.empty')}</EmptyTitle>
							<EmptyDescription>{t('logs.emptyDescription')}</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<ul
						ref={listRef}
						className={styles.virtualizer}
						aria-label={t('logs.records')}
						style={{ height: virtualizer.getTotalSize() }}
					>
						{virtualizer.getVirtualItems().map((item) => {
							const record = records[item.index]
							if (!record) return null

							return (
								<li
									className={styles.logRow}
									data-index={item.index}
									data-level={record.level}
									data-selectable
									key={record.id}
									ref={virtualizer.measureElement}
									style={{
										transform: `translateY(${item.start - scrollMargin}px)`,
									}}
								>
									<time className={styles.time} dateTime={formatLogTime(record.time)}>
										{formatLogTime(record.time)}
									</time>
									<Badge
										className={styles.level}
										variant={logLevelBadgeVariant(record.level)}
									>
										{record.level}
									</Badge>
									<span className={styles.module}>{record.module ?? 'app'}</span>
									<p className={styles.message}>{record.msg}</p>
								</li>
							)
						})}
					</ul>
				)}
			</div>
		</section>
	)
}
