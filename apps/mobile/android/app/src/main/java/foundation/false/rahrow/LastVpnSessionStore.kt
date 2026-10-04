package foundation.falsefoundation.rahrow

import android.content.Context
import java.io.File
import java.util.Properties

data class LastVpnSession(
	val profileId: String,
	val engineId: String,
	val engineConfig: String,
	val tunBackendId: String,
	val socksPort: Int,
)

/** Last successful Connect payload so the QS tile / shortcuts can reconnect. */
class LastVpnSessionStore(private val sessionFile: File) {
	constructor(context: Context) : this(File(context.filesDir, "rahrow-last-vpn-session.properties"))

	fun read(): LastVpnSession? {
		val values = Properties()
		try {
			sessionFile.inputStream().use(values::load)
		} catch (_: Exception) {
			return null
		}
		val profileId = values.getProperty("profileId").orEmpty()
		val engineId = values.getProperty("engineId").orEmpty()
		val engineConfig = values.getProperty("engineConfig").orEmpty()
		val tunBackendId = values.getProperty("tunBackendId") ?: "engine-native"
		val socksPort = values.getProperty("socksPort")?.toIntOrNull() ?: 10_808
		if (profileId.isBlank() || engineId.isBlank() || engineConfig.isBlank()) return null
		return LastVpnSession(profileId, engineId, engineConfig, tunBackendId, socksPort)
	}

	fun write(session: LastVpnSession) {
		val values = Properties().apply {
			setProperty("profileId", session.profileId)
			setProperty("engineId", session.engineId)
			setProperty("engineConfig", session.engineConfig)
			setProperty("tunBackendId", session.tunBackendId)
			setProperty("socksPort", session.socksPort.toString())
		}
		val temporary =
			File(sessionFile.parentFile, "${sessionFile.name}.tmp-${android.os.Process.myPid()}")
		temporary.outputStream().use { values.store(it, null) }
		if (!temporary.renameTo(sessionFile)) {
			temporary.delete()
			throw IllegalStateException("Unable to persist last VPN session")
		}
	}
}
