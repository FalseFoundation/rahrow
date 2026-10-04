package foundation.falsefoundation.rahrow

import java.io.File
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder

class LastVpnSessionStoreTest {
	@get:Rule
	val temporaryFolder = TemporaryFolder()

	@Test
	fun persistsAndReloadsTheLastConnectPayload() {
		val store = LastVpnSessionStore(File(temporaryFolder.root, "session.properties"))
		assertNull(store.read())

		store.write(
			LastVpnSession(
				profileId = "profile-1",
				engineId = "sing-box",
				engineConfig = """{"inbounds":[{"type":"tun"}]}""",
				tunBackendId = "engine-native",
				socksPort = 20808,
			),
		)

		val restored = store.read()
		assertEquals("profile-1", restored?.profileId)
		assertEquals("sing-box", restored?.engineId)
		assertEquals("""{"inbounds":[{"type":"tun"}]}""", restored?.engineConfig)
		assertEquals("engine-native", restored?.tunBackendId)
		assertEquals(20808, restored?.socksPort)
	}
}
