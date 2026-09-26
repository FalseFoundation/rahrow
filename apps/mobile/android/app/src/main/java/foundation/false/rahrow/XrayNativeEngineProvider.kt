package foundation.falsefoundation.rahrow

import android.content.Context
import android.net.VpnService
import android.os.Build
import android.os.ParcelFileDescriptor
import dalvik.system.InMemoryDexClassLoader
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.lang.reflect.InvocationHandler
import java.lang.reflect.Proxy
import java.nio.ByteBuffer

/**
 * Runs libXray inside an isolated ClassLoader.
 *
 * libbox and libXray both ship gomobile `go.Seq`. The app dex keeps libbox's Seq
 * (loads `box`). Xray's classes — including a Seq that loads `gojni` — live in a
 * bundled dex asset so the `:vpn_xray` process can initialize the correct JNI
 * runtime without inheriting libbox's Seq or writing a dex to disk.
 *
 * On Android, the Happ/v2rayNG path is preferred: SOCKS inbound + VpnService.protect
 * via DialerController, with HEV owning the TUN. Native Xray TUN still tries netlink
 * route sockets that SELinux denies to untrusted apps.
 */
internal class XrayNativeEngineProvider(private val service: VpnService) : NativeEngineProvider {
	private var tun: ParcelFileDescriptor? = null
	private var startAttempted = false

	override fun start(engineConfig: String) {
		check(tun == null && !startAttempted) { "Xray VPN provider is already running" }
		val runtime = LibXrayRuntime.get(service)

		val config = expandGeoipPrivateRules(JSONObject(engineConfig))
		val inbound = config.optJSONArray("inbounds")?.optJSONObject(0)
			?: throw IOException("Xray Android VPN requires an inbound")
		when (inbound.optString("protocol")) {
			"socks", "http", "dokodemo-door" -> {
				// Register protect after the SOCKS listener is up so protect hooks
				// cannot interfere with bind/accept on the local inbound.
				startSocks(runtime, config)
				runtime.registerProtect(service)
			}
			"tun" -> {
				runtime.registerProtect(service)
				startTun(runtime, config, inbound)
			}
			else -> throw IOException("Unsupported Xray inbound: ${inbound.optString("protocol")}")
		}
	}

	private fun startSocks(runtime: LibXrayRuntime, config: JSONObject) {
		startAttempted = true
		try {
			runtime.invoke(
				method = "runXrayFromJson",
				payload = JSONObject().put("configJSON", config.toString()),
			)
		} catch (error: Exception) {
			startAttempted = false
			throw IOException(error.message ?: "Xray failed to start", error)
		}
	}

	private fun startTun(runtime: LibXrayRuntime, config: JSONObject, inbound: JSONObject) {
		val tunSettings = inbound.optJSONObject("settings")
			?: throw IOException("Xray Android VPN TUN settings are missing")
		// Android's VpnService owns routes, DNS, and the underlying-network bypass.
		// Leaving desktop-oriented TUN fields causes Xray to call netlink (EPERM).
		tunSettings.remove("autoSystemRoutingTable")
		tunSettings.remove("autoOutboundsInterface")
		tunSettings.remove("gateway")
		tunSettings.remove("dns")
		tunSettings.remove("name")
		tunSettings.remove("desc")
		if (!tunSettings.has("mtu")) tunSettings.put("mtu", 1500)

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
			runtime.invoke(
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
				LibXrayRuntime.get(service).invoke("stopXray")
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
}

/**
 * Rewrite a desktop/VPN TUN config into a loopback SOCKS inbound for the HEV path.
 */
internal fun xrayConfigForHevBackend(engineConfig: String, socksPort: Int): String {
	val config = expandGeoipPrivateRules(JSONObject(engineConfig))
	val socks = JSONObject()
		.put("tag", "socks-in")
		.put("protocol", "socks")
		.put("listen", "127.0.0.1")
		.put("port", socksPort)
		.put("settings", JSONObject().put("udp", true))
		.put(
			"sniffing",
			JSONObject()
				.put("enabled", true)
				.put("destOverride", JSONArray().put("http").put("tls").put("quic")),
		)
	config.put("inbounds", JSONArray().put(socks))
	config.remove("env")
	return config.toString()
}

/**
 * Mobile APKs do not yet ship geoip.dat next to libXray (which defaults to
 * `/system/bin/geoip.dat`). Expand `geoip:private` to explicit CIDRs so routing
 * parses without geodata files. Same ranges Xray's private list covers.
 */
internal fun expandGeoipPrivateRules(config: JSONObject): JSONObject {
	val rules = config.optJSONObject("routing")?.optJSONArray("rules") ?: return config
	for (index in 0 until rules.length()) {
		val rule = rules.optJSONObject(index) ?: continue
		val ips = rule.optJSONArray("ip") ?: continue
		val expanded = JSONArray()
		var changed = false
		for (ipIndex in 0 until ips.length()) {
			val value = ips.optString(ipIndex)
			if (value == "geoip:private") {
				changed = true
				for (cidr in PRIVATE_NETWORK_CIDRS) expanded.put(cidr)
			} else {
				expanded.put(value)
			}
		}
		if (changed) rule.put("ip", expanded)
	}
	return config
}

private val PRIVATE_NETWORK_CIDRS = arrayOf(
	"0.0.0.0/8",
	"10.0.0.0/8",
	"100.64.0.0/10",
	"127.0.0.0/8",
	"169.254.0.0/16",
	"172.16.0.0/12",
	"192.0.0.0/24",
	"192.0.2.0/24",
	"192.168.0.0/16",
	"198.18.0.0/15",
	"198.51.100.0/24",
	"203.0.113.0/24",
	"224.0.0.0/4",
	"240.0.0.0/4",
	"::1/128",
	"fc00::/7",
	"fe80::/10",
	"ff00::/8",
)

private class LibXrayRuntime private constructor(
	private val loader: ClassLoader,
	private val libXrayClass: Class<*>,
	private val invokeMethod: java.lang.reflect.Method,
) {
	fun registerProtect(service: VpnService) {
		val dialerClass = Class.forName(DIALER_CLASS, true, loader)
		val handler = InvocationHandler { _, method, args ->
			when (method.name) {
				"protectFd" -> {
					val fd = (args?.getOrNull(0) as? Number)?.toInt()
						?: return@InvocationHandler false
					service.protect(fd)
				}
				"toString" -> "RahRowXrayDialerController"
				"hashCode" -> System.identityHashCode(this)
				"equals" -> args?.getOrNull(0) === this
				else -> null
			}
		}
		val controller = Proxy.newProxyInstance(loader, arrayOf(dialerClass), handler)
		// Outbound sockets must bypass the VPN route (Happ/v2rayNG). Do not register a
		// listener controller — protecting the local SOCKS listen fd can break accept().
		libXrayClass.getMethod("registerDialerController", dialerClass).invoke(null, controller)
	}

	fun invoke(method: String, payload: JSONObject = JSONObject()): JSONObject {
		val request = JSONObject()
			.put("apiVersion", 1)
			.put("method", method)
			.put("payload", payload)
		val response = JSONObject(invokeMethod.invoke(null, request.toString()) as String)
		if (!response.optBoolean("success")) {
			throw IOException(response.optString("error", "libXray $method failed"))
		}
		return response
	}

	companion object {
		private const val ASSET_DEX = "rahrow-libxray.dex"
		private const val LIBXRAY_CLASS = "libXray.LibXray"
		private const val DIALER_CLASS = "libXray.DialerController"

		@Volatile private var instance: LibXrayRuntime? = null

		fun get(context: Context): LibXrayRuntime {
			instance?.let { return it }
			return synchronized(this) {
				instance ?: load(context).also { instance = it }
			}
		}

		private fun load(context: Context): LibXrayRuntime {
			val dexBytes = context.assets.open(ASSET_DEX).use { it.readBytes() }
			val nativeLibraryDir = context.applicationInfo.nativeLibraryDir
			val loader = InMemoryDexClassLoader(
				arrayOf(ByteBuffer.wrap(dexBytes)),
				nativeLibraryDir,
				context.classLoader.parent,
			)
			val libXray = Class.forName(LIBXRAY_CLASS, true, loader)
			val invoke = libXray.getMethod("invoke", String::class.java)
			return LibXrayRuntime(loader, libXray, invoke)
		}
	}
}
