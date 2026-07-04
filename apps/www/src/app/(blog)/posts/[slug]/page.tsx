import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { MDXWrapper } from 'nextra'
import type { MDXComponents } from 'nextra/mdx-components'
import { useMDXComponents as getBlogComponents } from 'nextra-theme-blog'
import { getPost, getPostSlugs } from '../../../../blog/posts'

interface PostPageProps {
	readonly params: Promise<{
		readonly slug: string
	}>
}

export const dynamicParams = false

export function generateStaticParams() {
	return getPostSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
	const post = await getPost((await params).slug)

	if (!post) {
		notFound()
	}

	return {
		title: post.metadata.title,
		description: post.metadata.description,
	}
}

const blogComponents = getBlogComponents() as MDXComponents
const { wrapper: blogWrapper, ...contentComponents } = blogComponents
const Wrapper = blogWrapper as MDXWrapper

export default async function PostPage({ params }: PostPageProps) {
	const post = await getPost((await params).slug)

	if (!post) {
		notFound()
	}

	const PostContent = post.default

	return (
		<Wrapper toc={post.toc} metadata={post.metadata} sourceCode={post.sourceCode}>
			<PostContent components={contentComponents} />
		</Wrapper>
	)
}
