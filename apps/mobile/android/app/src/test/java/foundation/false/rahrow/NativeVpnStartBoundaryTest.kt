package foundation.falsefoundation.rahrow

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertThrows
import org.junit.Assert.assertTrue
import org.junit.Test

class NativeVpnStartBoundaryTest {
	@Test
	fun containsNativeLinkageFailuresAndReportsThem() {
		var reported: Throwable? = null

		val started = runNativeVpnStart(
			start = { throw UnsatisfiedLinkError("missing libbox symbol") },
			onFailure = { reported = it },
		)

		assertFalse(started)
		assertTrue(reported is UnsatisfiedLinkError)
		assertEquals("missing libbox symbol", reported?.message)
	}

	@Test
	fun returnsTrueWithoutReportingWhenStartupSucceeds() {
		var reported = false

		val started = runNativeVpnStart(
			start = {},
			onFailure = { reported = true },
		)

		assertTrue(started)
		assertFalse(reported)
	}

	@Test
	fun doesNotAttemptToContainVirtualMachineFailure() {
		class TestVirtualMachineError : VirtualMachineError()

		assertThrows(TestVirtualMachineError::class.java) {
			runNativeVpnStart(
				start = { throw TestVirtualMachineError() },
				onFailure = {},
			)
		}
	}

	@Test
	fun cleanupContinuesAfterANativeFailure() {
		val completed = mutableListOf<String>()

		val failure = runNativeVpnCleanup(
			{ throw UnsatisfiedLinkError("close failed") },
			{ completed += "provider" },
			{ completed += "lock" },
		)

		assertTrue(failure is UnsatisfiedLinkError)
		assertEquals(listOf("provider", "lock"), completed)
	}

	@Test
	fun stopFailurePreservesTheActiveTunnelIdentity() {
		val current = NativeVpnStatus(
			state = "disconnecting",
			profileId = "profile-1",
			engineId = "sing-box",
			tunBackendId = "hev-socks5-tunnel",
		)

		val failed = nativeVpnStopFailure(current, "Native VPN provider stop timed out")

		assertEquals("error", failed.state)
		assertEquals("profile-1", failed.profileId)
		assertEquals("sing-box", failed.engineId)
		assertEquals("hev-socks5-tunnel", failed.tunBackendId)
		assertEquals("Native VPN provider stop timed out", failed.error)
	}
}
