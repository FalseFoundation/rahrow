package foundation.falsefoundation.rahrow

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Intent
import android.content.pm.ServiceInfo
import android.net.VpnService
import android.os.Build
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import java.io.IOException

abstract class RahRowVpnService : VpnService() {
	protected abstract val engineId: String
	private lateinit var statusStore: VpnStatusStore
	private var provider: NativeEngineProvider? = null
	private var hevTunnel: HevSocks5Tunnel? = null
	private var processLock: VpnProcessLock? = null

	override fun onCreate() {
		super.onCreate()
		statusStore = VpnStatusStore(this)
	}

	override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
		if (intent?.action == ACTION_STOP) {
			stopTunnel("disconnected")
			stopSelf()
			return START_NOT_STICKY
		}
		val profileId = intent?.getStringExtra(EXTRA_PROFILE_ID)
		val engineConfig = intent?.getStringExtra(EXTRA_ENGINE_CONFIG)
		val tunBackendId = intent?.getStringExtra(EXTRA_TUN_BACKEND_ID) ?: "engine-native"
		val socksPort = intent?.getIntExtra(EXTRA_SOCKS_PORT, 10_808) ?: 10_808
		if (profileId.isNullOrBlank() || engineConfig.isNullOrBlank()) {
			statusStore.write(NativeVpnStatus("error", error = "VPN start payload is unavailable"))
			stopSelf()
			return START_NOT_STICKY
		}
		if (provider != null || processLock != null) {
			statusStore.write(NativeVpnStatus("error", profileId, engineId, error = "A VPN engine is already running"))
			stopSelf(startId)
			return START_NOT_STICKY
		}
		processLock = VpnProcessLock.acquire(this)
		if (processLock == null) {
			statusStore.write(NativeVpnStatus("error", profileId, engineId, error = "Another VPN engine owns the tunnel"))
			stopSelf(startId)
			return START_NOT_STICKY
		}

		startForegroundNotification()
		statusStore.write(NativeVpnStatus("connecting", profileId, engineId, tunBackendId))
		val started = runNativeVpnStart(start = {
			if (tunBackendId == "hev-socks5-tunnel" && engineId !in setOf("sing-box", "xray")) {
				throw IllegalArgumentException("HEV requires a socket-protection adapter for this engine")
			}
			if (tunBackendId == "hev-socks5-tunnel" && !HevSocks5Tunnel.isBundled(this)) {
				throw IllegalArgumentException("Pinned HEV Android runtime is not bundled for this ABI")
			}
			val configForEngine =
				if (tunBackendId == "hev-socks5-tunnel" && engineId == "xray") {
					xrayConfigForHevBackend(engineConfig, socksPort)
				} else {
					engineConfig
				}
			val nativeProvider = NativeEngineProvider.create(this, engineId)
			provider = nativeProvider
			nativeProvider.start(configForEngine)
			if (tunBackendId == "hev-socks5-tunnel") {
				// Give the engine a beat to bind. Java Socket probes to the local
				// SOCKS port are unreliable inside VpnService processes on Android
				// (kernel shows LISTEN while Socket.connect still fails), so start
				// HEV after a short settle rather than a TCP probe.
				SystemClock.sleep(400)
				hevTunnel = HevSocks5Tunnel(this, socksPort).also { it.start() }
			}
			statusStore.write(NativeVpnStatus("connected", profileId, engineId, tunBackendId))
		}, onFailure = { error ->
			stopTunnel("error", profileId, nativeVpnFailureMessage(error, "Native VPN provider failed"))
			stopSelf()
		})
		return if (started) START_REDELIVER_INTENT else START_NOT_STICKY
	}

	override fun onDestroy() {
		val current = statusStore.read()
		stopTunnel(
			state = if (current.state == "error") "error" else "disconnected",
			profileId = current.profileId,
			error = current.error,
		)
		super.onDestroy()
	}

	override fun onRevoke() {
		stopTunnel("error", error = "VPN permission was revoked")
		stopSelf()
		super.onRevoke()
	}

	private fun stopTunnel(state: String, profileId: String? = null, error: String? = null) {
		val currentHevTunnel = hevTunnel.also { hevTunnel = null }
		val currentProvider = provider.also { provider = null }
		val currentProcessLock = processLock.also { processLock = null }
		val closeError = runNativeVpnCleanup(
			{ currentHevTunnel?.close() },
			{ currentProvider?.close() },
			{ currentProcessLock?.close() },
			{ ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE) },
		)
		val teardownError = error ?: closeError?.let {
			nativeVpnFailureMessage(it, "Native VPN provider failed to stop")
		}
		statusStore.write(NativeVpnStatus(if (teardownError == null) state else "error", profileId, engineId, error = teardownError))
	}

	private fun startForegroundNotification() {
		val manager = getSystemService(NotificationManager::class.java)
		if (Build.VERSION.SDK_INT >= 26) {
			manager.createNotificationChannel(NotificationChannel(CHANNEL_ID, "RahRow VPN", NotificationManager.IMPORTANCE_LOW))
		}
		val notification = NotificationCompat.Builder(this, CHANNEL_ID)
			.setContentTitle("RahRow")
			.setContentText("$engineId VPN is active")
			.setSmallIcon(android.R.drawable.ic_lock_lock)
			.setOngoing(true)
			.build()
		if (Build.VERSION.SDK_INT >= 34) {
			startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SYSTEM_EXEMPTED)
		} else {
			startForeground(NOTIFICATION_ID, notification)
		}
	}

	companion object {
		const val ACTION_STOP = "foundation.false.rahrow.STOP_VPN"
		const val EXTRA_PROFILE_ID = "profileId"
		const val EXTRA_ENGINE_ID = "engineId"
		const val EXTRA_ENGINE_CONFIG = "engineConfig"
		const val EXTRA_TUN_BACKEND_ID = "tunBackendId"
		const val EXTRA_SOCKS_PORT = "socksPort"
		private const val CHANNEL_ID = "rahrow-vpn"
		private const val NOTIFICATION_ID = 7
	}
}

class XrayVpnService : RahRowVpnService() {
	override val engineId = "xray"
}

class SingBoxVpnService : RahRowVpnService() {
	override val engineId = "sing-box"
}
