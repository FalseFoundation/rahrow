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
import java.net.InetSocketAddress
import java.net.Socket

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
		try {
			if (tunBackendId == "hev-socks5-tunnel" && engineId != "sing-box") {
				throw IllegalArgumentException("HEV currently requires the sing-box socket-protection adapter")
			}
			val nativeProvider = NativeEngineProvider.create(this, engineId)
			provider = nativeProvider
			nativeProvider.start(engineConfig)
			if (tunBackendId == "hev-socks5-tunnel") {
				awaitLoopbackSocks(socksPort)
				hevTunnel = HevSocks5Tunnel(this, socksPort).also { it.start() }
			}
			statusStore.write(NativeVpnStatus("connected", profileId, engineId, tunBackendId))
		} catch (error: Exception) {
			stopTunnel("error", profileId, error.message ?: "Native VPN provider failed")
			stopSelf()
			return START_NOT_STICKY
		}
		return START_REDELIVER_INTENT
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
		var teardownError = error
		try {
			try {
				hevTunnel?.close()
			} finally {
				hevTunnel = null
				provider?.close()
			}
		} catch (closeError: Exception) {
			if (teardownError == null) teardownError = closeError.message ?: "Native VPN provider failed to stop"
		} finally {
			provider = null
			processLock?.close()
			processLock = null
			ServiceCompat.stopForeground(this, STOP_FOREGROUND_REMOVE)
		}
		statusStore.write(NativeVpnStatus(if (teardownError == null) state else "error", profileId, engineId, error = teardownError))
	}

	private fun awaitLoopbackSocks(port: Int) {
		repeat(40) {
			val ready = runCatching {
				Socket().use { socket ->
					socket.connect(InetSocketAddress("127.0.0.1", port), 100)
				}
			}.isSuccess
			if (ready) return
			SystemClock.sleep(50)
		}
		throw IOException("sing-box did not open its local SOCKS listener")
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
