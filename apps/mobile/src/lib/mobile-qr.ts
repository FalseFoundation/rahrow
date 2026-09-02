import { Capacitor, registerPlugin } from '@capacitor/core'
import { RahrowError } from '@rahrow/core/errors.ts'
import type { QrDecoder } from '@rahrow/core/platform/capabilities.ts'
import type { QrCameraPreviewPort } from '@rahrow/features/import/QrCameraPreview.tsx'

export interface RahRowQrPlugin extends QrCameraPreviewPort {
	scan(): Promise<{ readonly value: string }>
}

export class CapacitorQrDecoder implements QrDecoder {
	constructor(private readonly plugin: RahRowQrPlugin) {}

	async decode(_input?: unknown): Promise<string> {
		const result = await this.plugin.scan()
		const value = result.value.trim()

		if (!value) {
			throw new RahrowError('invalid_config', 'QR scan did not return text')
		}

		return value
	}
}

export const nativeRahRowQr = registerPlugin<RahRowQrPlugin>('RahRowQr')

export function createMobileQrDecoder(
	platform: string = Capacitor.getPlatform(),
	plugin: RahRowQrPlugin = nativeRahRowQr,
): QrDecoder | undefined {
	if (platform !== 'android' && platform !== 'ios') {
		return undefined
	}

	return new CapacitorQrDecoder(plugin)
}
