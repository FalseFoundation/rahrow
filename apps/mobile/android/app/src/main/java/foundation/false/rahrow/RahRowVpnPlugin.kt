package foundation.falsefoundation.rahrow

import android.Manifest
import android.app.Activity
import android.app.ActivityManager
import android.content.Intent
import android.net.VpnService
import android.os.Build
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback
import java.net.InetSocketAddress
import java.net.Socket
import kotlin.concurrent.thread
import org.json.JSONArray

@CapacitorPlugin(
	name = "RahRowVpn",
	permissions = [Permission(strings = [Manifest.permission.POST_NOTIFICATIONS], alias = "notifications")],
)
class RahRowVpnPlugin : Plugin() {
	private var pendingStartIntent: Intent? = null

	@PluginMethod
	fun networkIdentity(call: PluginCall) {
		call.resolve(
			JSObject().put(
				"localAddresses",
				JSONArray(AndroidNetworkIdentity.snapshot(context)),
			),
		)
	}

	@PluginMethod
	fun connect(call: PluginCall) {
		val profileId = call.getString("profileId").orEmpty()
		val engineId = call.getString("engineId") ?: "xray"
		val engineConfig = call.getObject("engineConfig")
		val tunBackendId = call.getString("tunBackendId") ?: "engine-native"
		val socksPort = call.getInt("socksPort") ?: 10_808
		if (profileId.isBlank()) {
			call.reject("Mobile VPN connect requires a profile id", "invalid_profile")
			return
		}
		if (engineConfig == null) {
			call.reject("Mobile VPN connect requires engine JSON from TypeScript", "invalid_config")
			return
		}
		if (tunBackendId !in setOf("engine-native", "hev-socks5-tunnel")) {
			call.reject("Unsupported TUN backend", "invalid_config")
			return
		}
		if (tunBackendId == "hev-socks5-tunnel" && (engineId != "sing-box" || !HevSocks5Tunnel.isBundled(context))) {
			call.reject("HEV requires its bundled Android runtime and the sing-box socket-protection adapter", "missing-native-plugin")
			return
		}
		val current = VpnStatusStore(context).read()
		if (current.state == "connecting" || current.state == "connected") {
			call.reject("A VPN provider is already active", "connection_conflict")
			return
		}
		val availability = NativeEngineProvider.availability(context, engineId)
		if (!availability.available) {
			call.reject(availability.detail, "missing-native-plugin")
			return
		}
		pendingStartIntent = serviceIntent(engineId)
			.putExtra(RahRowVpnService.EXTRA_PROFILE_ID, profileId)
			.putExtra(RahRowVpnService.EXTRA_ENGINE_ID, engineId)
			.putExtra(RahRowVpnService.EXTRA_ENGINE_CONFIG, engineConfig.toString())
			.putExtra(RahRowVpnService.EXTRA_TUN_BACKEND_ID, tunBackendId)
			.putExtra(RahRowVpnService.EXTRA_SOCKS_PORT, socksPort)
		if (
			Build.VERSION.SDK_INT >= 33 &&
			getPermissionState("notifications") != com.getcapacitor.PermissionState.GRANTED
		) {
			requestPermissionForAlias("notifications", call, "notificationPermissionHandled")
			return
		}
		continueVpnPreparation(call)
	}

	@PermissionCallback
	private fun notificationPermissionHandled(call: PluginCall) {
		// Android permits a VPN foreground service to start after notification
		// access is denied. Continue while the OS keeps its required task-manager
		// disclosure; the user can grant notification access later in Settings.
		continueVpnPreparation(call)
	}

	private fun continueVpnPreparation(call: PluginCall) {
		val prepare = VpnService.prepare(context)
		if (prepare != null) {
			startActivityForResult(call, prepare, "vpnPrepared")
			return
		}
		startTunnel(call)
	}

	@ActivityCallback
	private fun vpnPrepared(call: PluginCall, result: androidx.activity.result.ActivityResult) {
		if (result.resultCode != Activity.RESULT_OK) {
			pendingStartIntent = null
			call.reject("VPN permission was denied", "unsupported_capability")
			return
		}
		startTunnel(call)
	}

	@PluginMethod
	fun disconnect(call: PluginCall) {
		val statusStore = VpnStatusStore(context)
		val current = statusStore.read()
		if (current.state != "connecting" && current.state != "connected" && current.state != "disconnecting") {
			statusStore.write(NativeVpnStatus("disconnected"))
			call.resolve()
			return
		}

		statusStore.write(NativeVpnStatus("disconnecting", current.profileId, current.engineId, current.tunBackendId))
		val stopRequested = stopTunnelService(current.engineId)
		if (!stopRequested) {
			statusStore.write(NativeVpnStatus("disconnected"))
			call.resolve()
			return
		}
		awaitTunnelStopped(call, statusStore)
	}

	@PluginMethod
	fun status(call: PluginCall) {
		val statusStore = VpnStatusStore(context)
		val persisted = statusStore.read()
		val status = if (persisted.connected && !isVpnProcessRunning(persisted.engineId)) {
			NativeVpnStatus("disconnected").also(statusStore::write)
		} else {
			persisted
		}
		call.resolve(JSObject()
			.put("connected", status.connected)
			.put("state", status.state)
			.put("profileId", status.profileId)
			.put("engineId", status.engineId)
			.put("tunBackendId", status.tunBackendId)
			.put("error", status.error))
	}

	@PluginMethod
	fun diagnostics(call: PluginCall) {
		val xray = NativeEngineProvider.availability(context, "xray")
		val singBox = NativeEngineProvider.availability(context, "sing-box")
		val ready = singBox.available
		val hevBundled = HevSocks5Tunnel.isBundled(context)
		val detail = if (ready) "${singBox.detail}; ${xray.detail}" else singBox.detail
		call.resolve(JSObject()
			.put("platform", "android")
			.put("nativeReady", ready)
			.put("readiness", if (ready) "ready" else "missing-native-plugin")
			.put("activeConnectionInBackground", ready)
			.put("periodicSmartConnectInBackground", "opportunistic")
			.put("tunBackends", JSObject()
				.put("engine-native", ready)
				.put("hev-socks5-tunnel", hevBundled))
			.put("detail", detail))
	}

	@PluginMethod
	fun probe(call: PluginCall) {
		val host = call.getString("host").orEmpty()
		val port = call.getInt("port") ?: 0
		if (host.isBlank() || port <= 0) {
			call.reject("Probe requires host and port", "invalid_config")
			return
		}
		thread(name = "rahrow-probe", isDaemon = true) {
			val started = System.nanoTime()
			try {
				Socket().use { it.connect(InetSocketAddress(host, port), 5_000) }
				call.resolve(JSObject().put("reachable", true).put("latencyMs", (System.nanoTime() - started) / 1_000_000.0))
			} catch (error: Exception) {
				call.resolve(JSObject().put("reachable", false).put("error", error.message ?: "probe failed"))
			}
		}
	}

	private fun startTunnel(call: PluginCall) {
		val intent = pendingStartIntent
		pendingStartIntent = null
		if (intent == null) {
			call.reject("VPN start payload expired", "invalid_config")
			return
		}
		val statusStore = VpnStatusStore(context)
		val profileId = intent.getStringExtra(RahRowVpnService.EXTRA_PROFILE_ID)
		val engineId = intent.getStringExtra(RahRowVpnService.EXTRA_ENGINE_ID)
		val tunBackendId = intent.getStringExtra(RahRowVpnService.EXTRA_TUN_BACKEND_ID)
		statusStore.write(NativeVpnStatus("connecting", profileId, engineId, tunBackendId))
		try {
			if (Build.VERSION.SDK_INT >= 26) context.startForegroundService(intent) else context.startService(intent)
		} catch (error: Exception) {
			statusStore.write(NativeVpnStatus("error", profileId, error = error.message ?: "Native VPN provider failed to start"))
			call.reject(error.message ?: "Native VPN provider failed to start", "engine_start_failed", error)
			return
		}
		awaitTunnelStarted(call, statusStore)
	}

	private fun awaitTunnelStarted(call: PluginCall, statusStore: VpnStatusStore) {
		thread(name = "rahrow-vpn-start", isDaemon = true) {
			repeat(200) {
				val status = statusStore.read()
				if (status.state == "connected") {
					call.resolve()
					return@thread
				}
				if (status.state == "error") {
					call.reject(status.error ?: "Native VPN provider failed to start", "engine_start_failed")
					return@thread
				}
				Thread.sleep(50)
			}
			val status = statusStore.read()
			stopTunnelService(status.engineId)
			call.reject("Native VPN provider start timed out", "engine_start_failed")
		}
	}

	private fun awaitTunnelStopped(call: PluginCall, statusStore: VpnStatusStore) {
		thread(name = "rahrow-vpn-stop", isDaemon = true) {
			repeat(100) {
				val status = statusStore.read()
				if (status.state == "disconnected") {
					call.resolve()
					return@thread
				}
				if (status.state == "error") {
					call.reject(status.error ?: "Native VPN provider failed to stop", "engine_stop_failed")
					return@thread
				}
				Thread.sleep(50)
			}
			call.reject("Native VPN provider stop timed out", "engine_stop_failed")
		}
	}

	private fun serviceIntent(engineId: String): Intent = when (engineId) {
		"xray" -> Intent(context, XrayVpnService::class.java)
		"sing-box" -> Intent(context, SingBoxVpnService::class.java)
		else -> throw IllegalArgumentException("Unsupported VPN engine: $engineId")
	}

	private fun stopTunnelService(engineId: String?): Boolean {
		val services = when (engineId) {
			"xray" -> arrayOf(XrayVpnService::class.java)
			"sing-box" -> arrayOf(SingBoxVpnService::class.java)
			else -> arrayOf(XrayVpnService::class.java, SingBoxVpnService::class.java)
		}
		var requested = false
		for (service in services) {
			val intent = Intent(context, service).setAction(RahRowVpnService.ACTION_STOP)
			requested = try {
				context.startService(intent) != null || requested
			} catch (_: Exception) {
				context.stopService(Intent(context, service)) || requested
			}
		}
		return requested
	}

	private fun isVpnProcessRunning(engineId: String?): Boolean {
		val suffix = when (engineId) {
			"xray" -> ":vpn_xray"
			"sing-box" -> ":vpn_sing_box"
			else -> return false
		}
		val manager = context.getSystemService(ActivityManager::class.java)
		return manager.runningAppProcesses.orEmpty().any {
			it.processName == "${context.packageName}$suffix"
		}
	}
}
