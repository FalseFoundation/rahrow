import { describe, expect, it } from 'vitest'

import {
	PROFILE_FORM_CAPABILITIES,
	PROFILE_FORM_MATRIX,
	profileFormCapability,
} from './profile-form-capability-matrix.ts'

describe('profile form capability matrix', () => {
	it('checks in every protocol, transport, security, engine, and platform cell', () => {
		expect(PROFILE_FORM_CAPABILITIES).toHaveLength(7)
		expect(PROFILE_FORM_MATRIX).toHaveLength(7 * 6 * 3 * 2 * 3)
		expect(new Set(PROFILE_FORM_MATRIX.map((cell) => cell.fixture))).toEqual(
			new Set(PROFILE_FORM_CAPABILITIES.map((capability) => capability.fixture)),
		)
		expect(
			PROFILE_FORM_MATRIX.every(
				(cell) =>
					cell.requiredFields.length > 0 &&
					cell.validation.length > 0 &&
					cell.importExportFidelity.length > 0 &&
					cell.engineMapping.length > 0,
			),
		).toBe(true)
	})

	it('marks engine and canonical combinations truthfully', () => {
		expect(profileFormCapability('ssh').engines).toEqual(['sing-box'])
		expect(
			PROFILE_FORM_MATRIX.find(
				(cell) =>
					cell.protocol === 'ssh' &&
					cell.transport === 'ws' &&
					cell.security === 'tls' &&
					cell.engine === 'xray',
			)?.status,
		).toBe('unsupported')
		expect(
			PROFILE_FORM_MATRIX.find(
				(cell) =>
					cell.protocol === 'vless' &&
					cell.transport === 'ws' &&
					cell.security === 'reality' &&
					cell.engine === 'sing-box',
			)?.status,
		).toBe('supported')
	})
})
