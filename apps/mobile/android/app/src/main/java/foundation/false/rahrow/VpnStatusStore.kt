package foundation.falsefoundation.rahrow

import android.content.Context
import java.io.File
import java.util.Properties

data class NativeVpnStatus(
	val state: String,
	val profileId: String? = null,
	val engineId: String? = null,
	val tunBackendId: String? = null,
	val error: String? = null,
) {
	val connected: Boolean get() = state == "connected"
}

class VpnStatusStore(context: Context) {
	private val statusFile = File(context.filesDir, "rahrow-vpn-status.properties")

	fun read(): NativeVpnStatus {
		val values = Properties()
		try {
			statusFile.inputStream().use(values::load)
		} catch (_: Exception) {
			return NativeVpnStatus("disconnected")
		}
		return NativeVpnStatus(
			state = values.getProperty("state", "disconnected"),
			profileId = values.getProperty("profileId"),
			engineId = values.getProperty("engineId"),
			tunBackendId = values.getProperty("tunBackendId"),
			error = values.getProperty("error"),
		)
	}

	fun write(status: NativeVpnStatus) {
		val values = Properties().apply {
			setProperty("state", status.state)
			status.profileId?.let { setProperty("profileId", it) }
			status.engineId?.let { setProperty("engineId", it) }
			status.tunBackendId?.let { setProperty("tunBackendId", it) }
			status.error?.let { setProperty("error", it) }
		}
		val temporary = File(statusFile.parentFile, "${statusFile.name}.tmp-${android.os.Process.myPid()}")
		temporary.outputStream().use { values.store(it, null) }
		if (!temporary.renameTo(statusFile)) {
			temporary.delete()
			throw IllegalStateException("Unable to persist VPN status")
		}
	}
}
