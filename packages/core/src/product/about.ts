export type RahrowAboutLinkId =
	| 'support-email'
	| 'telegram'
	| 'source'
	| 'license'
	| 'organization'
	| 'organization-site'
	| 'product-site'
	| 'donation'

export type RahrowAboutGroup = 'support' | 'source' | 'organization'

export interface RahrowAboutLink {
	readonly id: RahrowAboutLinkId
	readonly group: RahrowAboutGroup
	readonly target: string
}

export interface RahrowAboutConfiguration {
	readonly telegramUrl?: string
	readonly donationUrl?: string
}

export interface RahrowAboutManifest {
	readonly product: 'RahRow'
	readonly owner: 'False Foundation'
	readonly supportEmail: 'falsefoundation.co@gmail.com'
	readonly license: {
		readonly name: 'MIT License'
		readonly spdx: 'MIT'
	}
	readonly links: readonly RahrowAboutLink[]
}

const fixedLinks = [
	{
		id: 'support-email',
		group: 'support',
		target: 'mailto:falsefoundation.co@gmail.com',
	},
	{
		id: 'source',
		group: 'source',
		target: 'https://github.com/FalseFoundation/rahrow',
	},
	{
		id: 'license',
		group: 'source',
		target: 'https://github.com/FalseFoundation/rahrow/blob/main/LICENSE',
	},
	{
		id: 'organization',
		group: 'organization',
		target: 'https://github.com/FalseFoundation',
	},
	{
		id: 'organization-site',
		group: 'organization',
		target: 'https://false.foundation/',
	},
	{
		id: 'product-site',
		group: 'organization',
		target: 'https://rahrow.false.foundation/',
	},
] as const satisfies readonly RahrowAboutLink[]

const exactTargets = new Set<string>(fixedLinks.map((link) => link.target))
const optionalHosts: Readonly<
	Record<'telegram' | 'donation', ReadonlySet<string>>
> = {
	telegram: new Set(['t.me']),
	donation: new Set(['buymeacoffee.com', 'www.buymeacoffee.com', 'ko-fi.com']),
}

export function isAllowedAboutTarget(target: string): boolean {
	if (exactTargets.has(target)) return true

	let url: URL
	try {
		url = new URL(target)
	} catch {
		return false
	}
	if (
		url.protocol !== 'https:' ||
		url.username !== '' ||
		url.password !== '' ||
		url.hash !== ''
	)
		return false

	return [...optionalHosts.telegram, ...optionalHosts.donation].includes(
		url.hostname,
	)
}

function optionalLink(
	id: 'telegram' | 'donation',
	target: string | undefined,
): RahrowAboutLink | undefined {
	if (!target) return undefined
	let url: URL
	try {
		url = new URL(target)
	} catch {
		return undefined
	}
	if (
		url.protocol !== 'https:' ||
		url.username ||
		url.password ||
		url.hash ||
		!optionalHosts[id].has(url.hostname)
	)
		return undefined

	return { id, group: id === 'telegram' ? 'support' : 'organization', target }
}

export function createRahrowAboutManifest(
	configuration: RahrowAboutConfiguration = {},
): RahrowAboutManifest {
	const telegram = optionalLink('telegram', configuration.telegramUrl)
	const donation = optionalLink('donation', configuration.donationUrl)

	return {
		product: 'RahRow',
		owner: 'False Foundation',
		supportEmail: 'falsefoundation.co@gmail.com',
		license: { name: 'MIT License', spdx: 'MIT' },
		links: [
			fixedLinks[0],
			...(telegram ? [telegram] : []),
			...fixedLinks.slice(1),
			...(donation ? [donation] : []),
		],
	}
}
