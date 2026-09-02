import type { ReactNode, Ref } from 'react'
import { createPortal } from 'react-dom'
import { useAppHeaderTarget } from './AppHeaderSlot.tsx'
import styles from './ProductHeader.module.css'

export function ProductHeader({
	title,
	eyebrow,
	leading,
	actions,
	ref,
}: {
	readonly title: string
	readonly eyebrow?: ReactNode
	readonly leading?: ReactNode
	readonly actions?: ReactNode
	readonly ref?: Ref<HTMLElement>
}) {
	const target = useAppHeaderTarget()
	const header = (
		<header ref={ref} className={styles.header} data-app-header>
			<div className={styles.identity}>
				{leading}
				<div className={styles.copy}>
					{eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
					<h1 className={styles.title}>{title}</h1>
				</div>
			</div>
			{actions ? <div className={styles.actions}>{actions}</div> : null}
		</header>
	)

	if (target === undefined) return header
	if (target === null) return null
	return createPortal(header, target)
}
