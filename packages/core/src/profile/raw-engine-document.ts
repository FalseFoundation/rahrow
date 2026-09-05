import type { EngineId } from '../runtime/proxy-engine.ts'
import type { StringDocumentStore } from '../storage/json-store.ts'
import type { ConnectionProfile } from './connection-profile.ts'

export type ConversionFidelity = 'lossless' | 'normalized' | 'lossy'

export interface ConversionWarning {
	readonly code: string
	readonly message: string
	readonly path?: string
}

export interface ConversionResult<T> {
	readonly value: T
	readonly fidelity: ConversionFidelity
	readonly warnings: readonly ConversionWarning[]
	readonly unrepresentedFields: readonly string[]
}

export interface RawOutboundCandidate {
	readonly id: string
	readonly index: number
	readonly protocol: string
	readonly label: string
}

export interface RawProfileIdentity {
	readonly id: string
	readonly name?: string
	readonly tags?: readonly string[]
	readonly subscriptionId?: string
}

export interface RawEngineDocumentAdapter {
	readonly engineId: EngineId
	readonly engineVersion: string
	validate(rawDocument: string): unknown | Promise<unknown>
	listExtractableOutbounds(document: unknown): readonly RawOutboundCandidate[]
	extractOutbound(
		document: unknown,
		candidateId: string,
		identity: RawProfileIdentity,
	): ConversionResult<ConnectionProfile>
}

const validatedRawEngineDocument: unique symbol = Symbol(
	'validatedRawEngineDocument',
)

export interface StagedRawEngineDocument {
	readonly engineId: EngineId
	readonly engineVersion: string
	readonly original: string
	readonly document: unknown
	readonly candidates: readonly RawOutboundCandidate[]
	readonly [validatedRawEngineDocument]: true
}

export async function stageRawEngineDocument(
	rawDocument: string,
	adapter: RawEngineDocumentAdapter,
): Promise<StagedRawEngineDocument> {
	if (!rawDocument.trim()) {
		throw new Error('Raw engine document is empty')
	}

	const document = await adapter.validate(rawDocument)
	const candidates = adapter.listExtractableOutbounds(document)

	return {
		engineId: adapter.engineId,
		engineVersion: adapter.engineVersion,
		original: rawDocument,
		document,
		candidates,
		[validatedRawEngineDocument]: true,
	}
}

export async function commitRawEngineDocument(
	staged: StagedRawEngineDocument,
	store: StringDocumentStore,
	confirmed: boolean,
): Promise<void> {
	if (!confirmed) {
		throw new Error('Raw engine document replacement requires confirmation')
	}
	if (!store.writeAtomic) {
		throw new Error('Raw engine documents require atomic replacement support')
	}

	await store.writeAtomic(staged.original)
}

export function extractStagedOutbound(
	staged: StagedRawEngineDocument,
	adapter: RawEngineDocumentAdapter,
	candidateId: string,
	identity: RawProfileIdentity,
): ConversionResult<ConnectionProfile> {
	if (
		adapter.engineId !== staged.engineId ||
		adapter.engineVersion !== staged.engineVersion
	) {
		throw new Error(
			'Raw document adapter does not match the staged engine version',
		)
	}

	if (!staged.candidates.some((candidate) => candidate.id === candidateId)) {
		throw new Error('Select one supported outbound before extraction')
	}

	return adapter.extractOutbound(staged.document, candidateId, identity)
}
