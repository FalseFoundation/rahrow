import type {
	Settings,
	SettingsStore,
	StringDocumentStore,
} from '../storage/json-store.ts'

export type ResetScope = 'tunnel-configuration' | 'settings' | 'app-data'

export type ResetStep =
	| 'read-current-data'
	| 'native-cleanup'
	| 'reset-tunnel-settings'
	| 'reset-settings'
	| 'clear-profiles'
	| 'clear-subscriptions'
	| 'clear-additional-data'
	| 'clear-transient-state'
	| 'clear-credentials'

export interface ResetCollectionStore<Value> {
	list(): Promise<readonly Value[]>
	replaceAll(values: readonly Value[]): Promise<void>
}

export interface SecureCredentialReset {
	clear(): Promise<void>
}

export interface AdditionalAppDataReset {
	snapshot(): Promise<unknown>
	clear(): Promise<void>
	restore(snapshot: unknown): Promise<void>
}

export function createStringDocumentReset(
	store: StringDocumentStore,
): AdditionalAppDataReset {
	const writeAtomic = async (value: string) => {
		if (!store.writeAtomic) {
			throw new Error('App-data reset requires atomic document replacement')
		}
		await store.writeAtomic(value)
	}
	return {
		snapshot: () => store.read(),
		clear: () => writeAtomic(''),
		restore: (snapshot) =>
			writeAtomic(typeof snapshot === 'string' ? snapshot : ''),
	}
}

export interface ResetDependencies<Profile, Subscription> {
	readonly settings: SettingsStore
	readonly profiles: ResetCollectionStore<Profile>
	readonly subscriptions: ResetCollectionStore<Subscription>
	readonly disconnectAndCleanup: () => Promise<void>
	readonly credentials?: SecureCredentialReset
	readonly additionalAppData?: readonly AdditionalAppDataReset[]
	readonly clearTransientState?: () => void | Promise<void>
	readonly defaults?: {
		readonly settings?: Settings
		readonly tunnel?: Pick<
			Settings,
			'connectionMode' | 'localPort' | 'routingMode'
		>
	}
}

export type ResetOutcome =
	| {
			readonly status: 'completed'
			readonly scope: ResetScope
			readonly completed: readonly ResetStep[]
	  }
	| {
			readonly status: 'failed' | 'partial'
			readonly scope: ResetScope
			readonly completed: readonly ResetStep[]
			readonly failedStep: ResetStep
			readonly error: string
			readonly recovery: string
			readonly rolledBack: boolean
	  }

interface ResetSnapshot<Profile, Subscription> {
	readonly settings: Settings
	readonly profiles: readonly Profile[]
	readonly subscriptions: readonly Subscription[]
	readonly additionalAppData: readonly unknown[]
}

const defaultSettings: Settings = { connectionMode: 'vpn' }
const defaultTunnelSettings: Pick<Settings, 'connectionMode'> = {
	connectionMode: 'vpn',
}

export class ResetOrchestrator<Profile, Subscription> {
	readonly #dependencies: ResetDependencies<Profile, Subscription>
	#queue: Promise<void> = Promise.resolve()

	constructor(dependencies: ResetDependencies<Profile, Subscription>) {
		this.#dependencies = dependencies
	}

	reset(scope: ResetScope): Promise<ResetOutcome> {
		const operation = this.#queue.then(() => this.#run(scope))
		this.#queue = operation.then(
			() => undefined,
			() => undefined,
		)
		return operation
	}

	async #run(scope: ResetScope): Promise<ResetOutcome> {
		const completed: ResetStep[] = []
		let failedStep: ResetStep = 'read-current-data'
		let snapshot: ResetSnapshot<Profile, Subscription>

		try {
			snapshot = await this.#snapshot(scope)
			completed.push('read-current-data')
		} catch (error) {
			return failure(scope, completed, failedStep, error, false)
		}

		try {
			if (scope === 'tunnel-configuration' || scope === 'app-data') {
				failedStep = 'native-cleanup'
				await this.#dependencies.disconnectAndCleanup()
				completed.push(failedStep)
			}

			if (scope === 'tunnel-configuration') {
				failedStep = 'reset-tunnel-settings'
				await this.#dependencies.settings.write(
					resetTunnelSettings(
						snapshot.settings,
						this.#dependencies.defaults?.tunnel ?? defaultTunnelSettings,
					),
				)
				completed.push(failedStep)
				return { status: 'completed', scope, completed }
			}

			failedStep = 'reset-settings'
			await this.#dependencies.settings.write(
				this.#dependencies.defaults?.settings ?? defaultSettings,
			)
			completed.push(failedStep)

			if (scope === 'app-data') {
				failedStep = 'clear-profiles'
				await this.#dependencies.profiles.replaceAll([])
				completed.push(failedStep)

				failedStep = 'clear-subscriptions'
				await this.#dependencies.subscriptions.replaceAll([])
				completed.push(failedStep)

				if (this.#dependencies.additionalAppData?.length) {
					failedStep = 'clear-additional-data'
					for (const data of this.#dependencies.additionalAppData) {
						await data.clear()
					}
					completed.push(failedStep)
				}
			}

			if (this.#dependencies.clearTransientState) {
				failedStep = 'clear-transient-state'
				await this.#dependencies.clearTransientState()
				completed.push(failedStep)
			}

			if (scope === 'app-data' && this.#dependencies.credentials) {
				failedStep = 'clear-credentials'
				await this.#dependencies.credentials.clear()
				completed.push(failedStep)
			}

			return { status: 'completed', scope, completed }
		} catch (error) {
			const mayHaveMutatedStores =
				failedStep !== 'read-current-data' && failedStep !== 'native-cleanup'
			const rolledBack = mayHaveMutatedStores
				? await this.#rollback(snapshot)
				: false
			return failure(scope, completed, failedStep, error, rolledBack)
		}
	}

	async #snapshot(
		scope: ResetScope,
	): Promise<ResetSnapshot<Profile, Subscription>> {
		const [settings, profiles, subscriptions, additionalAppData] =
			await Promise.all([
				this.#dependencies.settings.read(),
				this.#dependencies.profiles.list(),
				this.#dependencies.subscriptions.list(),
				Promise.all(
					(scope === 'app-data'
						? (this.#dependencies.additionalAppData ?? [])
						: []
					).map((data) => data.snapshot()),
				),
			])
		return { settings, profiles, subscriptions, additionalAppData }
	}

	async #rollback(snapshot: ResetSnapshot<Profile, Subscription>) {
		const results = await Promise.allSettled([
			this.#dependencies.settings.write(snapshot.settings),
			this.#dependencies.profiles.replaceAll(snapshot.profiles),
			this.#dependencies.subscriptions.replaceAll(snapshot.subscriptions),
			...(this.#dependencies.additionalAppData ?? [])
				.slice(0, snapshot.additionalAppData.length)
				.map((data, index) => data.restore(snapshot.additionalAppData[index])),
		])
		return results.every((result) => result.status === 'fulfilled')
	}
}

function resetTunnelSettings(
	settings: Settings,
	defaults: Pick<Settings, 'connectionMode' | 'localPort' | 'routingMode'>,
): Settings {
	const {
		connectionMode: _connectionMode,
		localPort: _localPort,
		routingMode: _routingMode,
		...retained
	} = settings
	return { ...retained, ...defaults }
}

function failure(
	scope: ResetScope,
	completed: readonly ResetStep[],
	failedStep: ResetStep,
	error: unknown,
	rolledBack: boolean,
): ResetOutcome {
	const partial =
		failedStep === 'clear-credentials' ||
		failedStep === 'clear-transient-state' ||
		failedStep === 'native-cleanup' ||
		(completed.some((step) => step !== 'read-current-data') && !rolledBack)
	return {
		status: partial ? 'partial' : 'failed',
		scope,
		completed,
		failedStep,
		error: error instanceof Error ? error.message : String(error),
		recovery:
			failedStep === 'clear-credentials'
				? 'Some secure credentials may remain. Retry the app-data reset after secure storage is available.'
				: rolledBack
					? 'Saved data was restored. Retry the reset after resolving the reported failure.'
					: 'Cleanup may be incomplete. Reopen RahRow, verify the connection is stopped, and retry the reset.',
		rolledBack,
	}
}
