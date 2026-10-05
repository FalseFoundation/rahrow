import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url))

export const officialEngines = {
	xray: {
		release: { owner: 'XTLS', repo: 'Xray-core' },
		source: { owner: 'XTLS', repo: 'libXray' },
	},
	'sing-box': {
		release: { owner: 'SagerNet', repo: 'sing-box' },
		source: { owner: 'SagerNet', repo: 'sing-box' },
	},
}

const singBoxTargets = {
	'darwin-arm64': 'darwin-arm64',
	'darwin-x64': 'darwin-amd64',
	'linux-arm64': 'linux-arm64',
	'linux-x64': 'linux-amd64',
	'windows-x64': 'windows-amd64',
}

const xrayArchives = {
	'darwin-arm64': ['Xray-macos-arm64-v8a.zip', 'xray'],
	'darwin-x64': ['Xray-macos-64.zip', 'xray'],
	'linux-arm64': ['Xray-linux-arm64-v8a.zip', 'xray'],
	'linux-x64': ['Xray-linux-64.zip', 'xray'],
	'windows-x64': ['Xray-windows-64.zip', 'xray.exe'],
}

export function versionFromTag(tagName) {
	if (typeof tagName !== 'string' || tagName.trim().length === 0) {
		throw new Error('Official release tag is missing')
	}
	return tagName.startsWith('v') ? tagName.slice(1) : tagName
}

function releaseVersion(version) {
	const match = /^(\d+(?:\.\d+)*)(?:-([0-9A-Za-z.-]+))?$/.exec(version)
	if (!match?.[1]) return undefined
	return {
		parts: match[1].split('.').map((part) => Number(part)),
		prerelease: match[2],
	}
}

export function compareReleaseVersions(left, right) {
	const a = releaseVersion(left)
	const b = releaseVersion(right)
	if (!a || !b) return left.localeCompare(right)
	const length = Math.max(a.parts.length, b.parts.length)
	for (let index = 0; index < length; index += 1) {
		const delta = (a.parts[index] ?? 0) - (b.parts[index] ?? 0)
		if (delta !== 0) return delta
	}
	if (a.prerelease === b.prerelease) return 0
	if (a.prerelease === undefined) return 1
	if (b.prerelease === undefined) return -1
	return a.prerelease.localeCompare(b.prerelease)
}

export function selectOfficialRelease(releases) {
	const candidates = releases.filter(
		(release) => release?.draft !== true && typeof release?.tag_name === 'string',
	)
	const selected = candidates.reduce((best, release) => {
		if (!best) return release
		return compareReleaseVersions(
			versionFromTag(release.tag_name),
			versionFromTag(best.tag_name),
		) > 0
			? release
			: best
	}, undefined)
	if (!selected) throw new Error('No official release was published')
	return selected
}

export function sha256Digest(digest) {
	if (typeof digest !== 'string') return undefined
	const match = /^sha256:([a-f0-9]{64})$/i.exec(digest.trim())
	return match?.[1]?.toLowerCase()
}

export function artifactSpec(engine, version, platform) {
	if (engine === 'xray') {
		const archive = xrayArchives[platform]
		if (!archive) throw new Error(`Xray has no official archive for ${platform}`)
		const [archiveName, executablePath] = archive
		return { archiveName, executablePath }
	}

	if (engine === 'sing-box') {
		const target = singBoxTargets[platform]
		if (!target)
			throw new Error(`sing-box has no official archive for ${platform}`)
		const extension = platform === 'windows-x64' ? 'zip' : 'tar.gz'
		const executable = platform === 'windows-x64' ? 'sing-box.exe' : 'sing-box'
		const archiveName = `sing-box-${version}-${target}.${extension}`
		return {
			archiveName,
			executablePath: `sing-box-${version}-${target}/${executable}`,
		}
	}

	throw new Error(`Unsupported engine ${engine}`)
}

export function nextRuntimeManifest(current, release) {
	const version = versionFromTag(release.tag_name)
	const assets = release.assets ?? []
	const artifacts = current.artifacts.map((artifact) => {
		const spec = artifactSpec(current.engine, version, artifact.platform)
		const asset = assets.find((candidate) => candidate.name === spec.archiveName)
		if (!asset) {
			const found = assets.map((candidate) => candidate.name).join(', ')
			throw new Error(
				`${current.engine} ${version} is missing ${spec.archiveName}. Found: ${found}`,
			)
		}
		const checksum = sha256Digest(asset.digest)
		if (!checksum) {
			throw new Error(
				`${current.engine} ${version} asset ${spec.archiveName} has no sha256 digest`,
			)
		}
		if (!asset.browser_download_url) {
			throw new Error(
				`${current.engine} ${version} asset ${spec.archiveName} has no download URL`,
			)
		}
		return {
			...artifact,
			archiveName: spec.archiveName,
			executablePath: spec.executablePath,
			checksum: { algorithm: 'sha256', value: checksum },
			url: asset.browser_download_url,
		}
	})

	return { ...current, version, artifacts }
}

export function nextNativePins(pins, updates) {
	const engines = { ...pins.engines }
	for (const [engineId, update] of Object.entries(updates)) {
		const current = engines[engineId]
		if (!current) throw new Error(`Native runtime pins omit ${engineId}`)
		if (!/^[a-f0-9]{40}$/.test(update.revision)) {
			throw new Error(`${engineId} source revision must be a 40-character Git SHA`)
		}
		engines[engineId] = {
			...current,
			version: update.version,
			ref: `v${update.version}`,
			revision: update.revision,
		}
	}
	return { ...pins, engines }
}

export async function hashDownload(url, fetchImpl = fetch) {
	const response = await fetchImpl(url)
	if (!response.ok) {
		throw new Error(`Download failed for ${url} (${response.status})`)
	}
	const bytes = Buffer.from(await response.arrayBuffer())
	return createHash('sha256').update(bytes).digest('hex')
}

export async function ensureAssetChecksums(release, names, fetchImpl = fetch) {
	const needed = new Set(names)
	const assets = await Promise.all(
		(release.assets ?? []).map(async (asset) => {
			if (!needed.has(asset.name) || sha256Digest(asset.digest)) return asset
			return {
				...asset,
				digest: `sha256:${await hashDownload(asset.browser_download_url, fetchImpl)}`,
			}
		}),
	)
	return { ...release, assets }
}

function githubHeaders() {
	const headers = {
		Accept: 'application/vnd.github+json',
		'User-Agent': 'rahrow-update-engines',
		'X-GitHub-Api-Version': '2022-11-28',
	}
	const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
	if (token) headers.Authorization = `Bearer ${token}`
	return headers
}

async function readJson(relativePath) {
	return JSON.parse(await readFile(join(repositoryRoot, relativePath), 'utf8'))
}

async function writeJson(relativePath, value) {
	const next = `${JSON.stringify(value, null, '\t')}\n`
	const current = await readFile(join(repositoryRoot, relativePath), 'utf8')
	if (current === next) return false
	await writeFile(join(repositoryRoot, relativePath), next)
	return true
}

async function githubJson(url) {
	const response = await fetch(url, { headers: githubHeaders() })
	const body = await response.json()
	if (!response.ok) {
		throw new Error(
			`${url} failed (${response.status}): ${body.message ?? response.statusText}`,
		)
	}
	return body
}

async function planEngine(engineId) {
	const source = officialEngines[engineId]
	const releaseUrl = `https://api.github.com/repos/${source.release.owner}/${source.release.repo}/releases?per_page=100`
	const release = selectOfficialRelease(await githubJson(releaseUrl))
	const current = await readJson(`engines/${engineId}/runtime.json`)
	const version = versionFromTag(release.tag_name)
	const names = current.artifacts.map(
		(artifact) => artifactSpec(engineId, version, artifact.platform).archiveName,
	)
	const manifest = nextRuntimeManifest(
		current,
		await ensureAssetChecksums(release, names),
	)
	const tag = release.tag_name
	const commit = await githubJson(
		`https://api.github.com/repos/${source.source.owner}/${source.source.repo}/commits/${encodeURIComponent(tag)}`,
	)
	if (typeof commit.sha !== 'string') {
		throw new Error(`${engineId} tag ${tag} did not resolve to a commit`)
	}
	return {
		engineId,
		manifest,
		pin: { version: manifest.version, revision: commit.sha },
	}
}

function planFor(plans, engineId) {
	const plan = plans.find((candidate) => candidate.engineId === engineId)
	if (!plan) throw new Error(`Missing release plan for ${engineId}`)
	return plan
}

async function main() {
	const plans = await Promise.all(
		Object.keys(officialEngines).map((engineId) => planEngine(engineId)),
	)
	const pins = nextNativePins(
		await readJson('apps/mobile/native-runtime-pins.json'),
		{
			xray: planFor(plans, 'xray').pin,
			'sing-box': planFor(plans, 'sing-box').pin,
		},
	)

	for (const plan of plans) {
		const changed = await writeJson(
			`engines/${plan.engineId}/runtime.json`,
			plan.manifest,
		)
		console.log(
			`${plan.engineId} ${plan.pin.version}${changed ? '' : ' (unchanged)'}`,
		)
	}
	const pinsChanged = await writeJson(
		'apps/mobile/native-runtime-pins.json',
		pins,
	)
	console.log(`mobile source pins${pinsChanged ? '' : ' (unchanged)'}`)
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	main().catch((error) => {
		console.error(error instanceof Error ? error.message : error)
		process.exitCode = 1
	})
}
