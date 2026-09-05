import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import {
	type ConversionResult,
	commitRawEngineDocument,
	extractStagedOutbound,
	type RawEngineDocumentAdapter,
	type RawProfileIdentity,
	type StagedRawEngineDocument,
	stageRawEngineDocument,
} from '@rahrow/core/profile/raw-engine-document.ts'
import type { StringDocumentStore } from '@rahrow/core/storage/json-store.ts'
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from '@rahrow/ui/components/ui/alert.tsx'
import { Button } from '@rahrow/ui/components/ui/button.tsx'
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from '@rahrow/ui/components/ui/field.tsx'
import {
	NativeSelect,
	NativeSelectOption,
} from '@rahrow/ui/components/ui/native-select.tsx'
import { Spinner } from '@rahrow/ui/components/ui/spinner.tsx'
import { Textarea } from '@rahrow/ui/components/ui/textarea.tsx'
import { useState } from 'react'

import { useAppTranslation } from '../app/app-i18n.tsx'
import styles from './RawEngineDocumentWorkspace.module.css'

export interface RawEngineDocumentWorkspaceProps {
	readonly adapters: readonly RawEngineDocumentAdapter[]
	readonly createIdentity: () => RawProfileIdentity
	readonly storeFor: (
		engineId: RawEngineDocumentAdapter['engineId'],
	) => StringDocumentStore
	readonly onExtract: (profile: ConnectionProfile) => void | Promise<void>
	readonly onCommitted?: (
		staged: StagedRawEngineDocument,
	) => void | Promise<void>
}

/**
 * A raw engine configuration workflow. This is intentionally separate from the
 * canonical profile editor and never labels a complete engine document as a profile.
 */
export function RawEngineDocumentWorkspace({
	adapters,
	createIdentity,
	storeFor,
	onExtract,
	onCommitted,
}: RawEngineDocumentWorkspaceProps) {
	const { t } = useAppTranslation()
	const [engineId, setEngineId] = useState(adapters[0]?.engineId ?? 'xray')
	const [rawDocument, setRawDocument] = useState('')
	const [staged, setStaged] = useState<StagedRawEngineDocument | null>(null)
	const [candidateId, setCandidateId] = useState('')
	const [conversion, setConversion] =
		useState<ConversionResult<ConnectionProfile> | null>(null)
	const [replacementArmed, setReplacementArmed] = useState(false)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState('')
	const adapter = adapters.find((item) => item.engineId === engineId)

	function resetStage() {
		setStaged(null)
		setCandidateId('')
		setConversion(null)
		setReplacementArmed(false)
		setError('')
	}

	async function validateDocument() {
		if (!adapter) return
		setBusy(true)
		setError('')
		try {
			const next = await stageRawEngineDocument(rawDocument, adapter)
			setStaged(next)
			setCandidateId(next.candidates[0]?.id ?? '')
			setConversion(null)
			setReplacementArmed(false)
		} catch {
			setStaged(null)
			setCandidateId('')
			setError(t('profiles.rawEngine.errors.validation'))
		} finally {
			setBusy(false)
		}
	}

	async function extractSelected() {
		if (!adapter || !staged || !candidateId) return
		setError('')
		try {
			const next =
				conversion ??
				extractStagedOutbound(staged, adapter, candidateId, createIdentity())
			if (!conversion && next.fidelity === 'lossy') {
				setConversion(next)
				return
			}
			await onExtract(next.value)
			setConversion(null)
		} catch {
			setError(t('profiles.rawEngine.errors.extraction'))
		}
	}

	async function replaceRawDocument() {
		if (!staged) return
		if (!replacementArmed) {
			setReplacementArmed(true)
			return
		}
		setBusy(true)
		setError('')
		try {
			await commitRawEngineDocument(staged, storeFor(staged.engineId), true)
			await onCommitted?.(staged)
			setReplacementArmed(false)
		} catch {
			setError(t('profiles.rawEngine.errors.replacement'))
		} finally {
			setBusy(false)
		}
	}

	return (
		<section
			className={styles.workspace}
			aria-labelledby='raw-engine-workspace-title'
		>
			<header className={styles.header}>
				<h2 id='raw-engine-workspace-title'>{t('profiles.rawEngine.title')}</h2>
				<p>{t('profiles.rawEngine.description')}</p>
			</header>

			<FieldGroup>
				<Field>
					<FieldLabel htmlFor='raw-engine-id'>
						{t('profiles.rawEngine.engineLabel')}
					</FieldLabel>
					<NativeSelect
						id='raw-engine-id'
						value={engineId}
						onChange={(event) => {
							setEngineId(event.target.value as typeof engineId)
							resetStage()
						}}
					>
						{adapters.map((item) => (
							<NativeSelectOption key={item.engineId} value={item.engineId}>
								{item.engineId} {item.engineVersion}
							</NativeSelectOption>
						))}
					</NativeSelect>
				</Field>

				<Field data-invalid={Boolean(error)}>
					<FieldLabel htmlFor='raw-engine-document'>
						{t('profiles.rawEngine.documentLabel')}
					</FieldLabel>
					<Textarea
						id='raw-engine-document'
						technical
						className={styles.editor}
						aria-invalid={Boolean(error)}
						aria-describedby='raw-engine-description'
						data-private='true'
						spellCheck={false}
						value={rawDocument}
						onChange={(event) => {
							setRawDocument(event.target.value)
							resetStage()
						}}
					/>
					<FieldDescription id='raw-engine-description'>
						{t('profiles.rawEngine.secretDescription')}
					</FieldDescription>
					{error ? <FieldError role='alert'>{error}</FieldError> : null}
				</Field>
			</FieldGroup>

			<div className={styles.actions}>
				<Button
					type='button'
					disabled={!adapter || busy}
					onClick={validateDocument}
				>
					{busy ? <Spinner data-icon='inline-start' /> : null}
					{t('profiles.rawEngine.validate')}
				</Button>
				{staged ? (
					<Button
						type='button'
						variant={replacementArmed ? 'destructive' : 'outline'}
						disabled={busy}
						onClick={replaceRawDocument}
					>
						{replacementArmed
							? t('profiles.rawEngine.replace')
							: t('profiles.rawEngine.reviewReplacement')}
					</Button>
				) : null}
			</div>

			{staged ? (
				<section
					className={styles.result}
					aria-labelledby='raw-engine-extraction-title'
				>
					<h3 id='raw-engine-extraction-title'>
						{t('profiles.rawEngine.extractTitle')}
					</h3>
					{staged.candidates.length > 0 ? (
						<FieldGroup>
							<Field>
								<FieldLabel htmlFor='raw-engine-outbound'>
									{t('profiles.rawEngine.outboundLabel')}
								</FieldLabel>
								<NativeSelect
									id='raw-engine-outbound'
									value={candidateId}
									onChange={(event) => {
										setCandidateId(event.target.value)
										setConversion(null)
									}}
								>
									{staged.candidates.map((candidate) => (
										<NativeSelectOption key={candidate.id} value={candidate.id}>
											{candidate.label} · {candidate.protocol}
										</NativeSelectOption>
									))}
								</NativeSelect>
							</Field>
							<Button type='button' variant='secondary' onClick={extractSelected}>
								{conversion?.fidelity === 'lossy'
									? t('profiles.rawEngine.confirmLossy')
									: t('profiles.rawEngine.extract')}
							</Button>
						</FieldGroup>
					) : (
						<Alert>
							<AlertTitle>{t('profiles.rawEngine.noOutboundTitle')}</AlertTitle>
							<AlertDescription>
								{t('profiles.rawEngine.noOutboundDescription')}
							</AlertDescription>
						</Alert>
					)}
				</section>
			) : null}

			{conversion?.fidelity === 'lossy' ? (
				<Alert variant='destructive'>
					<AlertTitle>{t('profiles.rawEngine.lossyTitle')}</AlertTitle>
					<AlertDescription>
						<ul className={styles.lossList}>
							{conversion.unrepresentedFields.map((path) => (
								<li key={path}>{path}</li>
							))}
						</ul>
					</AlertDescription>
				</Alert>
			) : null}
		</section>
	)
}
