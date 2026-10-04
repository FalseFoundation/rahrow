package foundation.falsefoundation.rahrow

import android.Manifest
import android.app.Activity
import android.app.ActivityManager
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.provider.Settings
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
		if (tunBackendId == "hev-socks5-tunnel" && !HevSocks5Tunnel.isBundled(context)) {
			call.reject("HEV requires its bundled Android runtime", "missing-native-plugin")
			return
		}
		if (tunBackendId == "hev-socks5-tunnel" && engineId !in setOf("sing-box", "xray")) {
			call.reject("HEV requires a socket-protection adapter for this engine", "missing-native-plugin")
			return
		}
		val current = VpnStatusStore(context).read()
		if (
			(current.state == "connecting" || current.state == "connected" || current.state == "disconnecting") &&
			isVpnProcessRunning(current.engineId)
		) {
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
		// Happ/v2rayNG order: system VPN consent first, then optional notification access.
		continueVpnPreparation(call)
	}

	@PermissionCallback
	private fun notificationPermissionHandled(call: PluginCall) {
		// Tunnel start does not require notification access. Continue either way so the
		// OS can still show its required task-manager disclosure for the FGS.
		startTunnel(call)
	}

	private fun continueVpnPreparation(call: PluginCall) {
		val prepare = VpnService.prepare(activity ?: context)
		if (prepare != null) {
			startActivityForResult(call, prepare, "vpnPrepared")
			return
		}
		maybeRequestNotificationsThenStart(call)
	}

	@ActivityCallback
	private fun vpnPrepared(call: PluginCall, result: androidx.activity.result.ActivityResult) {
		if (result.resultCode != Activity.RESULT_OK) {
			pendingStartIntent = null
			call.reject(
				"Android did not allow RahRow to start a VPN. If another VPN app has Always-on VPN enabled, turn that off in system settings.",
				"unsupported_capability",
			)
			return
		}
		maybeRequestNotificationsThenStart(call)
	}

	private fun maybeRequestNotificationsThenStart(call: PluginCall) {
		if (
			Build.VERSION.SDK_INT >= 33 &&
			getPermissionState("notifications") != com.getcapacitor.PermissionState.GRANTED
		) {
			requestPermissionForAlias("notifications", call, "notificationPermissionHandled")
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
			val message = "Native VPN provider stop target is unavailable"
			statusStore.write(nativeVpnStopFailure(current, message))
			call.reject(message, "engine_stop_failed")
			return
		}
		awaitTunnelStopped(call, statusStore)
	}

	@PluginMethod
	fun status(call: PluginCall) {
		val statusStore = VpnStatusStore(context)
		val persisted = statusStore.read()
		val status = if (
			(persisted.state == "connected" || persisted.state == "disconnecting") &&
			!isVpnProcessRunning(persisted.engineId)
		) {
			nativeVpnStopFailure(
				persisted,
				"Native VPN provider process ended before tunnel teardown was acknowledged",
			).also(statusStore::write)
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
		val ready = xray.available || singBox.available
		val hevBundled = runCatching { HevSocks5Tunnel.isBundled(context) }.getOrDefault(false)
		val detail = when {
			xray.available && singBox.available -> "${xray.detail}; ${singBox.detail}"
			xray.available -> xray.detail
			singBox.available -> singBox.detail
			else -> listOf(xray.detail, singBox.detail).joinToString("; ")
		}
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
	fun openVpnSettings(call: PluginCall) {
		try {
			val intent = Intent(Settings.ACTION_VPN_SETTINGS)
			if (activity == null) intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
			(activity ?: context).startActivity(intent)
			call.resolve()
		} catch (error: Exception) {
			call.reject(error.message ?: "VPN settings are unavailable", "unsupported_capability", error)
		}
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
		val engineConfig = intent.getStringExtra(RahRowVpnService.EXTRA_ENGINE_CONFIG)
		val socksPort = intent.getIntExtra(RahRowVpnService.EXTRA_SOCKS_PORT, 10_808)
		if (
			!profileId.isNullOrBlank() &&
			!engineId.isNullOrBlank() &&
			!engineConfig.isNullOrBlank()
		) {
			runCatching {
				LastVpnSessionStore(context).write(
					LastVpnSession(
						profileId = profileId,
						engineId = engineId,
						engineConfig = engineConfig,
						tunBackendId = tunBackendId ?: "engine-native",
						socksPort = socksPort,
					),
				)
			}
		}
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
			// Cold libXray load + SOCKS bind can exceed 10s on emulators.
			repeat(600) {
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
			val current = statusStore.read()
			val message = "Native VPN provider stop timed out"
			statusStore.write(nativeVpnStopFailure(current, message))
			call.reject(message, "engine_stop_failed")
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
