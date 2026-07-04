import type { PageMapItem } from 'nextra'

export const MAINTAINERS_ROUTE = '/maintainers'
const MAINTAINERS_SEGMENT = 'maintainers'

type StaticParam = {
	readonly mdxPath?: string[]
}

type FileMetadata = {
	readonly filePath?: string
}

export function excludeMaintainersPageMap(pageMap: PageMapItem[]): PageMapItem[] {
	return pageMap.filter((item) => !('name' in item && item.name === MAINTAINERS_SEGMENT))
}

export function isMaintainersPath(pathSegments: readonly string[] | undefined): boolean {
	return pathSegments?.[0] === MAINTAINERS_SEGMENT
}

export function toUsageStaticParams(params: readonly StaticParam[]): StaticParam[] {
	return params.filter((param) => !isMaintainersPath(param.mdxPath))
}

export function toMaintainersStaticParams(params: readonly StaticParam[]): StaticParam[] {
	return params
		.filter((param) => isMaintainersPath(param.mdxPath))
		.map((param) => ({ mdxPath: param.mdxPath?.slice(1) ?? [] }))
}

export function withMaintainersPrefix(pathSegments: readonly string[] | undefined): string[] {
	return [MAINTAINERS_SEGMENT, ...(pathSegments ?? [])]
}

export function withRepositoryFilePath<TMetadata extends FileMetadata>(
	metadata: TMetadata,
): TMetadata {
	const filePath = metadata.filePath?.replace(/^(\.\.\/)+/, '')

	if (!filePath || filePath === metadata.filePath) {
		return metadata
	}

	return {
		...metadata,
		filePath,
	}
}
