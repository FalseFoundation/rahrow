package foundation.falsefoundation.rahrow

import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import libXray.LibXray
import org.json.JSONObject
import java.io.IOException

internal class XrayNativeEngineProvider(private val service: VpnService) : NativeEngineProvider {
	private var tun: ParcelFileDescriptor? = null
	private var startAttempted = false

	override fun start(engineConfig: String) {
		check(tun == null) { "Xray VPN provider is already running" }
		val config = JSONObject(engineConfig)
		val inbound = config.optJSONArray("inbounds")?.optJSONObject(0)
		if (inbound?.optString("protocol") != "tun") {
			throw IOException("Xray Android VPN requires a TUN inbound")
		}
		val tunSettings = inbound.optJSONObject("settings")
			?: throw IOException("Xray Android VPN TUN settings are missing")
		// Android's VpnService owns routes and the underlying-network bypass.
		tunSettings.remove("autoSystemRoutingTable")
		tunSettings.remove("autoOutboundsInterface")

		val descriptor = service.Builder()
			.setSession("RahRow · Xray")
			.setMtu(1500)
			.setBlocking(true)
			.addAddress("172.19.0.1", 30)
			.addAddress("fdfe:dcba:9876::1", 126)
			.addRoute("0.0.0.0", 0)
			.addRoute("::", 0)
			.addDnsServer("1.1.1.1")
			.addDnsServer("2606:4700:4700::1111")
			.addDisallowedApplication(service.packageName)
			.apply {
				if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) setMetered(false)
			}
			.establish()
			?: throw IOException("Android could not establish the Xray VPN interface")

		tun = descriptor
		try {
			val env = config.optJSONObject("env") ?: JSONObject()
			env.put("xray.tun.fd", descriptor.fd.toString())
			config.put("env", env)
			startAttempted = true
			invoke(
				method = "runXrayFromJson",
				payload = JSONObject().put("configJSON", config.toString()),
			)
		} catch (error: Exception) {
			runCatching { stop() }
			throw IOException(error.message ?: "Xray failed to start", error)
		}
	}

	override fun stop() {
		var failure: Exception? = null
		if (startAttempted) {
			try {
				invoke("stopXray")
			} catch (error: Exception) {
				failure = error
			}
		}
		startAttempted = false
		try {
			tun?.close()
		} catch (error: Exception) {
			if (failure == null) failure = error
		} finally {
			tun = null
		}
		failure?.let { throw IOException(it.message ?: "Xray failed to stop", it) }
	}

	private fun invoke(method: String, payload: JSONObject = JSONObject()): JSONObject {
		val request = JSONObject()
			.put("apiVersion", 1)
			.put("method", method)
			.put("payload", payload)
		val response = JSONObject(LibXray.invoke(request.toString()))
		if (!response.optBoolean("success")) {
			throw IOException(response.optString("error", "libXray $method failed"))
		}
		return response
	}
}
