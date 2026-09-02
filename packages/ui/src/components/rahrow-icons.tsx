import {
	Activity01Icon,
	Add01Icon,
	ArrowLeft01Icon,
	ArrowRight01Icon,
	Cancel01Icon,
	CleanIcon,
	ClipboardIcon,
	CloudDownloadIcon,
	Copy01Icon,
	Copy02Icon,
	Delete02Icon,
	Download01Icon,
	FileImportIcon,
	FilterHorizontalIcon,
	Globe02Icon,
	Home01Icon,
	LockIcon as HugeLockIcon,
	InformationCircleIcon,
	Link01Icon,
	MoreHorizontalIcon,
	NetworkIcon,
	PencilEdit02Icon,
	PowerServiceIcon,
	QrCodeIcon,
	RefreshIcon,
	Route01Icon,
	Search01Icon,
	ServerStack01Icon,
	Settings02Icon,
	Share01Icon,
	Shield01Icon,
	ShieldCheckIcon,
	Sun02Icon,
	TestTube01Icon,
	Tick02Icon,
	Upload01Icon,
	Wifi01Icon,
	ZapIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import type * as React from 'react'
import { cn } from '../lib/utils'

type IconProps = Omit<React.ComponentProps<typeof HugeiconsIcon>, 'icon'>

function createIcon(icon: typeof Home01Icon, defaultClassName?: string) {
	return function RahrowIcon({
		className,
		strokeWidth = 2,
		...props
	}: IconProps) {
		return (
			<HugeiconsIcon
				icon={icon}
				className={cn(defaultClassName, className)}
				strokeWidth={strokeWidth}
				{...props}
				aria-hidden='true'
				focusable='false'
			/>
		)
	}
}

const ActivityIcon = createIcon(Activity01Icon)
const AddIcon = createIcon(Add01Icon)
const BackIcon = createIcon(ArrowLeft01Icon, 'rtl:rotate-180')
const ChevronIcon = createIcon(ArrowRight01Icon, 'rtl:rotate-180 size-4')
const CloseIcon = createIcon(Cancel01Icon)
const ClipboardActionIcon = createIcon(ClipboardIcon)
const CloudDownloadActionIcon = createIcon(CloudDownloadIcon)
const CleanActionIcon = createIcon(CleanIcon)
const CopyIcon = createIcon(Copy01Icon)
const DuplicateIcon = createIcon(Copy02Icon)
const DeleteIcon = createIcon(Delete02Icon)
const DownloadIcon = createIcon(Download01Icon)
const ImportIcon = createIcon(FileImportIcon)
const FilterIcon = createIcon(FilterHorizontalIcon)
const GlobeIcon = createIcon(Globe02Icon)
const HomeIcon = createIcon(Home01Icon)
const InfoIcon = createIcon(InformationCircleIcon)
const ConnectionIcon = createIcon(Link01Icon)
const LockIcon = createIcon(HugeLockIcon)
const MoreIcon = createIcon(MoreHorizontalIcon)
const NetworkRouteIcon = createIcon(NetworkIcon)
const EditIcon = createIcon(PencilEdit02Icon)
const PowerIcon = createIcon(PowerServiceIcon)
const RouteIcon = createIcon(Route01Icon)
const QrIcon = createIcon(QrCodeIcon)
const RefreshActionIcon = createIcon(RefreshIcon)
const SearchIcon = createIcon(Search01Icon)
const ServerIcon = createIcon(ServerStack01Icon)
const ShareIcon = createIcon(Share01Icon)
const ShieldIcon = createIcon(Shield01Icon)
const ShieldReadyIcon = createIcon(ShieldCheckIcon)
const SettingsIcon = createIcon(Settings02Icon)
const AppearanceIcon = createIcon(Sun02Icon)
const TestIcon = createIcon(TestTube01Icon)
const CheckIcon = createIcon(Tick02Icon)
const UploadIcon = createIcon(Upload01Icon)
const WifiIcon = createIcon(Wifi01Icon)
const ZapIconComponent = createIcon(ZapIcon)

export {
	ActivityIcon,
	AddIcon,
	AppearanceIcon,
	BackIcon,
	CheckIcon,
	ChevronIcon,
	CleanActionIcon,
	ClipboardActionIcon,
	CloseIcon,
	CloudDownloadActionIcon,
	ConnectionIcon,
	CopyIcon,
	DeleteIcon,
	DownloadIcon,
	DuplicateIcon,
	EditIcon,
	FilterIcon,
	GlobeIcon,
	HomeIcon,
	ImportIcon,
	InfoIcon,
	LockIcon,
	MoreIcon,
	NetworkRouteIcon,
	PowerIcon,
	QrIcon,
	RefreshActionIcon,
	RouteIcon,
	SearchIcon,
	ServerIcon,
	SettingsIcon,
	ShareIcon,
	ShieldIcon,
	ShieldReadyIcon,
	TestIcon,
	UploadIcon,
	WifiIcon,
	ZapIconComponent,
}
