import { CloseIcon, SearchIcon } from '@rahrow/ui/components/rahrow-icons.tsx'
import { IconAction } from '@rahrow/ui/components/ui/icon-action.tsx'
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
} from '@rahrow/ui/components/ui/input-group.tsx'
import { useAppTranslation } from './app-i18n.tsx'
import styles from './ProductSearch.module.css'

export function ProductSearch({
	label,
	value,
	onValueChange,
	onClose,
}: {
	readonly label: string
	readonly value: string
	readonly onValueChange: (value: string) => void
	readonly onClose: () => void
}) {
	const { t } = useAppTranslation()
	return (
		<InputGroup className={styles.search}>
			<InputGroupAddon>
				<SearchIcon />
			</InputGroupAddon>
			<InputGroupInput
				autoFocus
				value={value}
				onChange={(event) => onValueChange(event.target.value)}
				placeholder={label}
				aria-label={label}
			/>
			<InputGroupAddon align='inline-end'>
				<IconAction
					variant='ghost'
					size='icon-xs'
					label={t('common.closeSearch')}
					onClick={onClose}
				>
					<CloseIcon />
				</IconAction>
			</InputGroupAddon>
		</InputGroup>
	)
}
