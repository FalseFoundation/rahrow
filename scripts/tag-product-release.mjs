import { spawnSync } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'

import {
	productReleaseTag,
	readProductVersion,
	shouldTagProductRelease,
} from './sync-app-versions.mjs'

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))

function runGit(args, { cwd = repositoryRoot, allowFailure = false } = {}) {
	const result = spawnSync('git', args, {
		cwd,
		encoding: 'utf8',
	})
	if (result.error) throw result.error
	if (result.status !== 0 && !allowFailure) {
		throw new Error(
			`git ${args.join(' ')} failed: ${result.stderr || result.stdout}`,
		)
	}
	return {
		status: result.status ?? 1,
		stdout: result.stdout?.trim() ?? '',
		stderr: result.stderr?.trim() ?? '',
	}
}

export function readPreviousProductVersion(root = repositoryRoot) {
	const result = runGit(['show', 'HEAD^:apps/desktop/package.json'], {
		cwd: root,
		allowFailure: true,
	})
	if (result.status !== 0) return undefined
	try {
		const manifest = JSON.parse(result.stdout)
		return typeof manifest.version === 'string' ? manifest.version : undefined
	} catch {
		return undefined
	}
}

export function tagExists(tag, root = repositoryRoot) {
	const result = runGit(['rev-parse', '-q', '--verify', `refs/tags/${tag}`], {
		cwd: root,
		allowFailure: true,
	})
	return result.status === 0
}

export function createProductReleaseTag({
	version,
	root = repositoryRoot,
	dryRun = false,
} = {}) {
	const nextVersion = version ?? readProductVersion(root)
	const previousVersion = readPreviousProductVersion(root)
	if (!shouldTagProductRelease({ previousVersion, nextVersion })) {
		return {
			tagged: false,
			reason: 'product-version-unchanged',
			previousVersion,
			version: nextVersion,
			tag: productReleaseTag(nextVersion),
		}
	}

	const tag = productReleaseTag(nextVersion)
	if (tagExists(tag, root)) {
		return {
			tagged: false,
			reason: 'tag-already-exists',
			previousVersion,
			version: nextVersion,
			tag,
		}
	}

	if (!dryRun) {
		runGit(
			['tag', '-a', tag, '-m', `RahRow ${nextVersion} (unsigned development)`],
			{ cwd: root },
		)
	}

	return {
		tagged: true,
		reason: 'created',
		previousVersion,
		version: nextVersion,
		tag,
	}
}

export function main(root = repositoryRoot) {
	const result = createProductReleaseTag({ root })
	if (!result.tagged) {
		console.info(`Skipped product release tag ${result.tag}: ${result.reason}`)
		return result
	}
	console.info(`Created product release tag ${result.tag}`)
	return result
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	main()
}
