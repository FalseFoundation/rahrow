import { describe, expect, it } from 'vitest'

import {
	assertSubscriptionResponseSize,
	MAX_SUBSCRIPTION_BYTES,
	parseSecureSubscriptionUrl,
	readBoundedSubscriptionResponse,
	redactSubscriptionUrl,
	validateSubscriptionAuthorization,
} from './subscription-fetch-policy.ts'

describe('subscription fetch policy', () => {
	it('accepts public HTTPS URLs and rejects plaintext, credentials, and local targets', () => {
		expect(
			parseSecureSubscriptionUrl('https://sub.example.com/list?token=secret')
				.hostname,
		).toBe('sub.example.com')

		for (const value of [
			'http://sub.example.com/list',
			'https://user:secret@sub.example.com/list',
			'https://localhost/list',
			'https://127.0.0.1/list',
			'https://10.0.0.1/list',
			'https://169.254.169.254/latest/meta-data',
			'https://[::1]/list',
		]) {
			expect(() => parseSecureSubscriptionUrl(value)).toThrow()
		}
	})

	it('redacts query credentials and accepts large bounded response bodies', () => {
		expect(
			redactSubscriptionUrl(
				'https://sub.example.com/list?token=secret&client=rahrow',
			),
		).toBe(
			'https://sub.example.com/[redacted]?token=%5Bredacted%5D&client=%5Bredacted%5D',
		)
		expect(() => assertSubscriptionResponseSize(1_056_130)).not.toThrow()
		expect(() =>
			assertSubscriptionResponseSize(MAX_SUBSCRIPTION_BYTES + 1),
		).toThrow('too large')
	})

	it('cancels a streaming response as soon as it exceeds the byte limit', async () => {
		let canceled = false
		const chunk = new Uint8Array(MAX_SUBSCRIPTION_BYTES / 2 + 1)
		const response = new Response(
			new ReadableStream({
				start(controller) {
					controller.enqueue(chunk)
					controller.enqueue(chunk)
				},
				cancel() {
					canceled = true
				},
			}),
		)

		await expect(readBoundedSubscriptionResponse(response)).rejects.toThrow(
			'too large',
		)
		expect(canceled).toBe(true)
	})

	it('accepts bounded credentials and rejects header injection', () => {
		expect(validateSubscriptionAuthorization('Bearer token')).toBe('Bearer token')
		expect(() => validateSubscriptionAuthorization('')).toThrow('invalid')
		expect(() =>
			validateSubscriptionAuthorization('Bearer token\nInjected: value'),
		).toThrow('invalid')
		expect(() => validateSubscriptionAuthorization('é'.repeat(4_097))).toThrow(
			'invalid',
		)
	})
})
