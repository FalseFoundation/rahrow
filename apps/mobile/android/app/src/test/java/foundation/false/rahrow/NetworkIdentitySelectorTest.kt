package foundation.falsefoundation.rahrow

import java.net.InetAddress
import org.junit.Assert.assertEquals
import org.junit.Test

class NetworkIdentitySelectorTest {
	@Test
	fun selectsUsableAddressesFromOnePhysicalInterface() {
		assertEquals(
			listOf("192.168.1.20", "fd00:0:0:0:0:0:0:20"),
			NetworkIdentitySelector.select(listOf(
				candidate("wlan0", "192.168.1.20"),
				candidate("wlan0", "fd00::20"),
				candidate("tun0", "10.0.0.2"),
				candidate("lo", "127.0.0.1"),
			)),
		)
	}

	@Test
	fun omitsAddressesWhenPhysicalInterfaceSelectionIsAmbiguous() {
		assertEquals(
			emptyList<String>(),
			NetworkIdentitySelector.select(listOf(
				candidate("wlan0", "192.168.1.20"),
				candidate("rmnet_data0", "10.20.30.40"),
			)),
		)
	}

	private fun candidate(name: String, address: String) =
		NetworkAddressCandidate(name, InetAddress.getByName(address))
}
