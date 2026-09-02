import {
	type SmartConnectCurrentConnection,
	SmartConnectOrchestrator,
} from '@rahrow/core/connection/smart-connect.ts'
import {
	SmartConnectScheduleRunner,
	type SmartConnectScheduleRunnerOptions,
} from '@rahrow/core/connection/smart-connect-schedule-runner.ts'
import type {
	ProfileStore,
	SettingsStore,
} from '@rahrow/core/storage/json-store.ts'

import type { ConnectionPort } from '../app/runtime.tsx'

export interface CreateSmartConnectRuntimeOptions {
	readonly profileStore: ProfileStore
	readonly settingsStore: SettingsStore
	readonly connection: ConnectionPort
	readonly now?: () => string
	readonly schedule?: SmartConnectScheduleRunnerOptions
}

export interface SmartConnectRuntime {
	readonly orchestrator: Pick<
		SmartConnectOrchestrator,
		'cancel' | 'status' | 'start' | 'stop' | 'run' | 'runIfDue'
	>
	readonly schedule: SmartConnectScheduleRunner
	subscribe(listener: SmartConnectCompletionListener): () => void
}

export type SmartConnectCompletion = Awaited<
	ReturnType<SmartConnectOrchestrator['runIfDue']>
>

export type SmartConnectCompletionListener = (
	result: SmartConnectCompletion,
) => void

export function createSmartConnectRuntime(
	options: CreateSmartConnectRuntimeOptions,
): SmartConnectRuntime {
	const now = options.now ?? (() => new Date().toISOString())
	const listeners = new Set<SmartConnectCompletionListener>()
	const orchestrator = new SmartConnectOrchestrator({
		profileStore: options.profileStore,
		settingsStore: options.settingsStore,
		connection: {
			async readCurrent() {
				const status = await options.connection.status()
				if (!status.profileId) return undefined
				const profile =
					status.profile ?? (await options.profileStore.get(status.profileId))
				if (!profile) return undefined
				return {
					profile,
					state: smartConnectConnectionState(status.state),
					...(status.mode && status.engineId
						? {
								runtime: {
									mode: status.mode,
									engineId: status.engineId,
									localPort: status.localPort,
								},
							}
						: {}),
				}
			},
			async validate(input) {
				await options.connection.canConnect?.(input.profile, {
					mode: input.mode,
					engineId: input.engineId,
					localPort: input.localPort,
				})
			},
			async connect(input) {
				await options.connection.connect(input.profile, {
					mode: input.mode ?? 'vpn',
					engineId: input.engineId,
					localPort: input.localPort,
				})
			},
			disconnect: () => options.connection.disconnect(),
		},
		async probe(profile) {
			const result = await options.connection.test(profile)
			return {
				profileId: profile.id,
				reachable: result.reachable,
				latencyMs: result.latencyMs,
				checkedAt: now(),
				error: result.error,
			}
		},
		now,
	})
	const publish = (result: SmartConnectCompletion) => {
		for (const listener of listeners) {
			try {
				listener(result)
			} catch {
				// A surface listener cannot break Smart Connect scheduling.
			}
		}
	}
	const observableOrchestrator: SmartConnectRuntime['orchestrator'] = {
		cancel: (reason) => orchestrator.cancel(reason),
		status: () => orchestrator.status(),
		start: () => orchestrator.start(),
		stop: () => orchestrator.stop(),
		async run(runOptions) {
			const result = await orchestrator.run(runOptions)
			publish(result)
			return result
		},
		async runIfDue(runOptions) {
			const result = await orchestrator.runIfDue(runOptions)
			publish(result)
			return result
		},
	}

	return {
		orchestrator: observableOrchestrator,
		schedule: new SmartConnectScheduleRunner(
			observableOrchestrator,
			options.schedule,
		),
		subscribe(listener) {
			listeners.add(listener)
			return () => listeners.delete(listener)
		},
	}
}

function smartConnectConnectionState(
	state: string,
): SmartConnectCurrentConnection['state'] {
	switch (state) {
		case 'disconnected':
		case 'connecting':
		case 'connected':
		case 'disconnecting':
		case 'error':
			return state
		default:
			return 'error'
	}
}
