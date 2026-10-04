package foundation.falsefoundation.rahrow

import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.Build

/** Shared start/stop helpers for the app UI, Quick Settings tile, and shortcuts. */
object RahRowVpnControl {
	const val ACTION_CONNECT = "foundation.false.rahrow.CONNECT"
	const val ACTION_DISCONNECT = "foundation.false.rahrow.DISCONNECT"
	const val ACTION_TOGGLE = "foundation.false.rahrow.TOGGLE"

	fun isConnected(context: Context): Boolean {
		val status = VpnStatusStore(context).read()
		return status.state == "connected" || status.state == "connecting"
	}

	fun disconnect(context: Context): Boolean {
		val statusStore = VpnStatusStore(context)
		val current = statusStore.read()
		if (
			current.state != "connecting" &&
			current.state != "connected" &&
			current.state != "disconnecting"
		) {
			statusStore.write(NativeVpnStatus("disconnected"))
			return true
		}
		statusStore.write(
			NativeVpnStatus(
				"disconnecting",
				current.profileId,
				current.engineId,
				current.tunBackendId,
			),
		)
		return stopTunnelService(context, current.engineId)
	}

	/**
	 * Starts the last saved session when VPN permission is already granted.
	 * Returns an Intent that must be started when the OS still needs consent.
	 */
	fun connectLastSessionOrPrepare(context: Context): Intent? {
		val session = LastVpnSessionStore(context).read() ?: return openApp(context)
		val prepare = VpnService.prepare(context)
		if (prepare != null) {
			prepare.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
			return prepare
		}
		val intent = serviceIntent(context, session.engineId)
			.putExtra(RahRowVpnService.EXTRA_PROFILE_ID, session.profileId)
			.putExtra(RahRowVpnService.EXTRA_ENGINE_ID, session.engineId)
			.putExtra(RahRowVpnService.EXTRA_ENGINE_CONFIG, session.engineConfig)
			.putExtra(RahRowVpnService.EXTRA_TUN_BACKEND_ID, session.tunBackendId)
			.putExtra(RahRowVpnService.EXTRA_SOCKS_PORT, session.socksPort)
		VpnStatusStore(context).write(
			NativeVpnStatus(
				"connecting",
				session.profileId,
				session.engineId,
				session.tunBackendId,
			),
		)
		if (Build.VERSION.SDK_INT >= 26) {
			context.startForegroundService(intent)
		} else {
			context.startService(intent)
		}
		return null
	}

	fun openApp(context: Context): Intent =
		Intent(context, MainActivity::class.java)
			.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)

	private fun serviceIntent(context: Context, engineId: String): Intent =
		when (engineId) {
			"xray" -> Intent(context, XrayVpnService::class.java)
			"sing-box" -> Intent(context, SingBoxVpnService::class.java)
			else -> Intent(context, SingBoxVpnService::class.java)
		}

	private fun stopTunnelService(context: Context, engineId: String?): Boolean {
		val services =
			when (engineId) {
				"xray" -> arrayOf(XrayVpnService::class.java)
				"sing-box" -> arrayOf(SingBoxVpnService::class.java)
				else -> arrayOf(XrayVpnService::class.java, SingBoxVpnService::class.java)
			}
		var requested = false
		for (service in services) {
			val intent = Intent(context, service).setAction(RahRowVpnService.ACTION_STOP)
			requested =
				try {
					context.startService(intent) != null || requested
				} catch (_: Exception) {
					context.stopService(Intent(context, service)) || requested
				}
		}
		return requested
	}
}
