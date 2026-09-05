import { describe, expect, it } from 'vitest'
import { SingBoxConfigBuilder } from '../sing-box/sing-box-engine.ts'
import { XrayConfigBuilder } from '../xray/xray-engine.ts'
import {
	SingBoxRawDocumentAdapter,
	XrayRawDocumentAdapter,
} from './raw-engine-document.ts'

describe('raw engine document adapters', () => {
	it('extracts one explicitly selected Xray outbound and enumerates every discarded path', () => {
		const adapter = new XrayRawDocumentAdapter('26.7.28')
		const document = adapter.validate(
			JSON.stringify({
				dns: { servers: ['1.1.1.1'] },
				routing: { rules: [{ type: 'field', outboundTag: 'proxy' }] },
				inbounds: [{ protocol: 'socks', port: 1080 }],
				policy: { levels: { 0: { statsUserUplink: true } } },
				stats: {},
				observatory: { subjectSelector: ['proxy'] },
				outbounds: [
					{
						tag: 'primary',
						protocol: 'vless',
						sendThrough: '192.0.2.1',
						settings: {
							vnext: [
								{
									address: 'vpn.example.com',
									port: 443,
									users: [
										{
											id: '11111111-1111-4111-8111-111111111111',
											encryption: 'none',
											level: 8,
										},
									],
								},
							],
						},
					},
					{
						tag: 'backup',
						protocol: 'freedom',
						settings: { domainStrategy: 'UseIP' },
					},
				],
			}),
		)
		const [candidate] = adapter.listExtractableOutbounds(document)

		expect(candidate).toMatchObject({ id: 'outbound:0', protocol: 'vless' })
		const result = adapter.extractOutbound(document, candidate?.id ?? '', {
			id: 'profile-1',
			tags: ['imported'],
			subscriptionId: 'subscription-1',
		})

		expect(result.value).toMatchObject({
			id: 'profile-1',
			protocol: 'vless',
			endpoint: { host: 'vpn.example.com', port: 443 },
			authentication: { id: '11111111-1111-4111-8111-111111111111' },
			metadata: {
				name: 'primary',
				source: 'file',
				tags: ['imported'],
				subscriptionId: 'subscription-1',
			},
		})
		expect(result.fidelity).toBe('lossy')
		expect(result.unrepresentedFields).toEqual(
			expect.arrayContaining([
				'$.dns.servers[0]',
				'$.routing.rules[0].type',
				'$.inbounds[0].protocol',
				'$.policy.levels.0.statsUserUplink',
				'$.stats',
				'$.observatory.subjectSelector[0]',
				'$.outbounds[0].sendThrough',
				'$.outbounds[0].settings.vnext[0].users[0].level',
				'$.outbounds[1].settings.domainStrategy',
			]),
		)
		expect(
			JSON.stringify([result.warnings, result.unrepresentedFields]),
		).not.toContain('11111111-1111-4111-8111-111111111111')
		expect(
			new XrayConfigBuilder().build({ profile: result.value, mode: 'proxy' })
				.outbounds[0]?.protocol,
		).toBe('vless')
	})

	it('extracts a supported sing-box outbound without treating engine-only fields as canonical', () => {
		const adapter = new SingBoxRawDocumentAdapter('1.13.19')
		const document = adapter.validate(
			JSON.stringify({
				log: { level: 'warn' },
				outbounds: [
					{
						type: 'hysteria2',
						tag: 'edge',
						server: 'edge.example.com',
						server_port: 8443,
						password: 'do-not-report',
						udp_fragment: true,
						tls: { enabled: true, server_name: 'edge.example.com' },
					},
				],
			}),
		)
		const [candidate] = adapter.listExtractableOutbounds(document)
		const result = adapter.extractOutbound(document, candidate?.id ?? '', {
			id: 'profile-2',
		})

		expect(result.value).toMatchObject({
			protocol: 'hysteria2',
			endpoint: { host: 'edge.example.com', port: 8443 },
			authentication: { password: 'do-not-report' },
			security: { type: 'tls', serverName: 'edge.example.com' },
		})
		expect(result.unrepresentedFields).toContain('$.outbounds[0].udp_fragment')
		expect(result.warnings.join(' ')).not.toContain('do-not-report')
		expect(
			new SingBoxConfigBuilder().build({ profile: result.value, mode: 'proxy' })
				.outbounds[0]?.type,
		).toBe('hysteria2')
	})

	it('rejects invalid documents and unsupported outbound selections without echoing secrets', () => {
		const adapter = new XrayRawDocumentAdapter('26.7.28')

		expect(() => adapter.validate('{"password":"secret"}')).toThrow(
			'outbounds array',
		)
		expect(() => adapter.validate('{"password":"secret"}')).not.toThrow('secret')
		const document = adapter.validate(
			'{"outbounds":[{"tag":"direct","protocol":"freedom"}]}',
		)
		expect(adapter.listExtractableOutbounds(document)).toEqual([])
	})
})
