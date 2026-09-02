package foundation.falsefoundation.rahrow

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Test

class SubscriptionFetchPolicyTest {
	@Test
	fun `accepts only credential-free fragment-free HTTPS URLs`() {
		assertEquals(
			"https://example.com/subscription?token=secret",
			SubscriptionFetchPolicy
				.validateUrlShape("https://example.com/subscription?token=secret")
				.toString(),
		)
		assertThrows(IllegalArgumentException::class.java) {
			SubscriptionFetchPolicy.validateUrlShape("http://example.com/subscription")
		}
		assertThrows(IllegalArgumentException::class.java) {
			SubscriptionFetchPolicy.validateUrlShape("https://user:secret@example.com/subscription")
		}
		assertThrows(IllegalArgumentException::class.java) {
			SubscriptionFetchPolicy.validateUrlShape("https://example.com/subscription#secret")
		}
	}

	@Test
	fun `rejects header injection and drops oversized response headers`() {
		assertThrows(IllegalArgumentException::class.java) {
			SubscriptionFetchPolicy.validateAuthorization("Bearer secret\nInjected: value")
		}
		assertNull(
			SubscriptionFetchPolicy.allowlistedHeader(
				"a".repeat(SubscriptionFetchPolicy.MAX_HEADER_CHARS + 1),
			),
		)
	}
}
