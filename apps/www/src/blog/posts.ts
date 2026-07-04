import type { EvaluateResult } from 'nextra'

type PostMetadata = EvaluateResult['metadata'] & {
	readonly author?: string
	readonly date: string
	readonly description: string
	readonly title: string
}

type PostModule = Omit<EvaluateResult, 'metadata'> & {
	readonly metadata: PostMetadata
}

interface PostDefinition {
	readonly slug: string
	readonly load: () => Promise<PostModule>
}

export interface Post extends PostModule {
	readonly route: string
	readonly slug: string
}

const postDefinitions: readonly PostDefinition[] = [
	// {
	// 	slug: 'rahrow-cli-on-npm',
	// 	load: async () => (await import('../../posts/rahrow-cli-on-npm.md')) as unknown as PostModule,
	// },
]

async function loadPost(definition: PostDefinition): Promise<Post> {
	return {
		...(await definition.load()),
		route: `/posts/${definition.slug}`,
		slug: definition.slug,
	}
}

export function getPostSlugs(): string[] {
	return postDefinitions.map(({ slug }) => slug)
}

export async function getPost(slug: string): Promise<Post | undefined> {
	const definition = postDefinitions.find((post) => post.slug === slug)

	return definition ? loadPost(definition) : undefined
}

export async function getPosts(): Promise<Post[]> {
	const posts = await Promise.all(postDefinitions.map(loadPost))

	return posts.sort(
		(left, right) =>
			new Date(right.metadata.date).getTime() - new Date(left.metadata.date).getTime(),
	)
}
