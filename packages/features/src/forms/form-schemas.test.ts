import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { describe, expect, it } from 'vitest'

import { connectionImportFormSchema } from '../import/connection-import-form.ts'
import {
	standardProfileDefaultValues,
	standardProfileFormSchema,
} from '../import/manual-profile-model.ts'
import {
	connectionProfileEditorFormSchema,
	toConnectionProfileEditorValues,
} from '../profiles/connection-profile-editor-model.ts'
import {
	secureProtocolDefaultValues,
	secureProtocolFormSchema,
} from '../profiles/secure-protocol-profile-model.ts'
import {
	shadowsocksProfileDefaultValues,
	shadowsocksProfileFormSchema,
} from '../profiles/shadowsocks-profile-model.ts'
import { subscriptionDraftFormSchema } from '../subscriptions/subscription-actions-model.ts'

const vlessProfile: ConnectionProfile = {
	id: 'profile-1',
	protocol: 'vless',
	endpoint: { host: 'example.com', port: 443 },
	transport: { type: 'tcp' },
	security: { type: 'tls' },
	authentication: { id: '4af5c4d7-906f-4f54-8fb7-bc80e62f4168' },
}

describe('form schemas', () => {
	it('validates every TanStack form value shape', () => {
		expect(
			connectionImportFormSchema.safeParse({ url: 'vless://example' }).success,
		).toBe(true)
		expect(
			subscriptionDraftFormSchema.safeParse({
				url: 'https://example.com/sub.txt',
				name: 'Example',
			}).success,
		).toBe(true)

		const standard = standardProfileDefaultValues('vless')
		expect(
			standardProfileFormSchema.safeParse({
				...standard,
				host: 'example.com',
				credential: '4af5c4d7-906f-4f54-8fb7-bc80e62f4168',
			}).success,
		).toBe(true)

		const secure = secureProtocolDefaultValues(undefined, 'ssh')
		expect(
			secureProtocolFormSchema.safeParse({
				...secure,
				host: 'example.com',
				username: 'rahrow',
				password: 'secret',
				hostKey: 'SHA256:key',
			}).success,
		).toBe(true)

		const shadowsocks = shadowsocksProfileDefaultValues()
		expect(
			shadowsocksProfileFormSchema.safeParse({
				...shadowsocks,
				host: 'example.com',
				password: 'secret',
			}).success,
		).toBe(true)

		expect(
			connectionProfileEditorFormSchema(vlessProfile).safeParse(
				toConnectionProfileEditorValues(vlessProfile),
			).success,
		).toBe(true)
	})

	it('rejects invalid and protocol-inapplicable drafts', () => {
		expect(
			connectionImportFormSchema.safeParse({ url: 'not a URL' }).success,
		).toBe(false)
		expect(
			subscriptionDraftFormSchema.safeParse({
				url: 'http://example.com/sub.txt',
				name: '',
			}).success,
		).toBe(false)
		expect(
			standardProfileFormSchema.safeParse(standardProfileDefaultValues('trojan'))
				.success,
		).toBe(false)
		expect(
			secureProtocolFormSchema.safeParse(
				secureProtocolDefaultValues(undefined, 'ssh'),
			).success,
		).toBe(false)
		expect(
			shadowsocksProfileFormSchema.safeParse(shadowsocksProfileDefaultValues())
				.success,
		).toBe(false)
		expect(
			connectionProfileEditorFormSchema(vlessProfile).safeParse({
				...toConnectionProfileEditorValues(vlessProfile),
				authenticationId: '',
			}).success,
		).toBe(false)
	})
})
