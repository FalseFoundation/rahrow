package foundation.falsefoundation.rahrow

import java.net.InetSocketAddress
import java.net.Proxy
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class RoutedHttpPolicyTest {
	@Test
	fun acceptsCredentialFreeLoopbackSocksOnly() {
		val proxy = RoutedHttpPolicy.createProxy("socks5://127.0.0.1:10808")
		assertEquals(Proxy.Type.SOCKS, proxy.type())
		assertEquals(10808, (proxy.address() as InetSocketAddress).port)

		for (invalid in listOf(
			"socks5://user:secret@127.0.0.1:10808",
			"socks5://192.168.1.2:10808",
			"http://127.0.0.1:10808",
			"socks5://127.0.0.1:0",
			"socks5://127.0.0.1:10808/path",
		)) {
			assertThrows(IllegalArgumentException::class.java) {
				RoutedHttpPolicy.createProxy(invalid)
			}
		}
	}

	@Test
	fun acceptsOnlyTheBoundedObservationAndReadinessEndpoints() {
		assertEquals(
			"https://speed.cloudflare.com/__down?bytes=0",
			RoutedHttpPolicy.validateEndpoint("https://speed.cloudflare.com/__down?bytes=0"),
		)
		assertEquals(
			"https://speed.cloudflare.com/__down?bytes=1048576",
			RoutedHttpPolicy.validateEndpoint("https://speed.cloudflare.com/__down?bytes=1048576"),
		)
		RoutedHttpPolicy.validateLimits(10_000, 1_048_576)
		assertThrows(IllegalArgumentException::class.java) {
			RoutedHttpPolicy.validateEndpoint("https://attacker.invalid/")
		}
		assertThrows(IllegalArgumentException::class.java) {
			RoutedHttpPolicy.validateLimits(10_001, 4_096)
		}
	}
}
