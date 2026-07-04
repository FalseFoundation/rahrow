import type { MDXWrapper } from 'nextra'
import type { MDXComponents } from 'nextra/mdx-components'
import { generateStaticParamsFor, importPage } from 'nextra/pages'
import { useMDXComponents as getDocsComponents } from 'nextra-theme-docs'
import {
	toMaintainersStaticParams,
	withMaintainersPrefix,
	withRepositoryFilePath,
} from '../../../../docs/pageMap'

interface PageProps {
	readonly params: Promise<{
		readonly mdxPath?: string[]
	}>
}

const generateContentStaticParams = generateStaticParamsFor('mdxPath')

export async function generateStaticParams() {
	return toMaintainersStaticParams(await generateContentStaticParams())
}

export async function generateMetadata(props: PageProps) {
	const params = await props.params
	const { metadata } = await importPage(withMaintainersPrefix(params.mdxPath))

	return metadata
}

const docsComponents = getDocsComponents() as MDXComponents
const { wrapper: docsWrapper, ...contentComponents } = docsComponents
const Wrapper = docsWrapper as MDXWrapper

export default async function Page(props: PageProps) {
	const params = await props.params
	const sourcePath = withMaintainersPrefix(params.mdxPath)
	const { default: MDXContent, toc, metadata, sourceCode } = await importPage(sourcePath)

	return (
		<Wrapper toc={toc} metadata={withRepositoryFilePath(metadata)} sourceCode={sourceCode}>
			<MDXContent {...props} components={contentComponents} params={params} />
		</Wrapper>
	)
}
