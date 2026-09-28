import blackLogo from '@rahrow/static/images/rahrow-logo-black.svg'
import whiteLogo from '@rahrow/static/images/rahrow-logo-white.svg'

import styles from './BrandLogo.module.css'

type BrandLogoProps = {
	className?: string
	label?: string
	inverted?: boolean
}

export function BrandLogo({
	className,
	label = 'RahRow',
	inverted = false,
}: BrandLogoProps) {
	const classNames = [styles.logo, className].filter(Boolean).join(' ')

	return (
		<span
			className={classNames}
			data-inverted={inverted || undefined}
			role='img'
			aria-label={label}
		>
			<img
				className={styles.lightLogo}
				src={blackLogo}
				alt=''
				aria-hidden='true'
			/>
			<img className={styles.darkLogo} src={whiteLogo} alt='' aria-hidden='true' />
		</span>
	)
}
