package foundation.falsefoundation.rahrow

import android.net.VpnService
import android.content.Context
import android.os.Build
import android.os.ParcelFileDescriptor
import java.io.Closeable
import java.io.File
import java.io.IOException
import java.util.zip.ZipFile

internal class HevSocks5Tunnel(
	private val service: VpnService,
	private val socksPort: Int,
) : Closeable {
	private var descriptor: ParcelFileDescriptor? = null
	private var started = false

	fun start() {
		check(!started) { "HEV SOCKS5 tunnel is already running" }
		require(socksPort in 1..65_535) { "HEV requires a valid loopback SOCKS port" }
		if (!isBundled(service)) throw IOException("Pinned HEV Android runtime is not bundled for this ABI")

		val tunnel = service.Builder()
			.setSession("RahRow · HEV")
			.setMtu(1_500)
			.setBlocking(true)
			.addAddress("198.18.0.1", 32)
			.addAddress("fc00::1", 128)
			.addRoute("0.0.0.0", 0)
			.addRoute("::", 0)
			.addDnsServer("1.1.1.1")
			.addDnsServer("2606:4700:4700::1111")
			.apply { if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) setMetered(false) }
			.establish()
			?: throw IOException("Android could not establish the HEV VPN interface")

		val config = File(service.noBackupFilesDir, "hev-socks5-tunnel.yml")
		config.writeText(configuration(socksPort), Charsets.UTF_8)
		config.setReadable(false, false)
		config.setReadable(true, true)
		config.setWritable(false, false)
		config.setWritable(true, true)

		try {
			if (!HevSocks5TunnelNative.TProxyStartService(config.absolutePath, tunnel.fd)) {
				throw IOException("HEV SOCKS5 tunnel rejected the VPN interface")
			}
			descriptor = tunnel
			started = true
		} catch (error: Throwable) {
			tunnel.close()
			throw IOException(error.message ?: "HEV SOCKS5 tunnel failed to start", error)
		}
	}

	override fun close() {
		val stopped = !started || runCatching {
			HevSocks5TunnelNative.TProxyStopService()
		}.getOrDefault(false)
		try {
			descriptor?.close()
		} finally {
			started = false
			descriptor = null
		}
		if (!stopped) throw IOException("HEV SOCKS5 tunnel failed to stop")
	}

	companion object {
		fun isBundled(context: Context): Boolean {
			if (!runtimeLoaded) return false
			if (File(context.applicationInfo.nativeLibraryDir, "libhev-socks5-tunnel.so").isFile) return true
			return listOfNotNull(context.applicationInfo.sourceDir, *context.applicationInfo.splitSourceDirs.orEmpty())
				.any { path ->
					runCatching {
						ZipFile(path).use { apk ->
							Build.SUPPORTED_ABIS.any { apk.getEntry("lib/$it/libhev-socks5-tunnel.so") != null }
						}
					}.getOrDefault(false)
				}
		}

		private fun configuration(port: Int) = """
			tunnel:
			  name: tun0
			  mtu: 1500
			  ipv4: 198.18.0.1
			  ipv6: 'fc00::1'
			  icmp: reply
			socks5:
			  address: 127.0.0.1
			  port: $port
			  udp: udp
			misc:
			  task-stack-size: 24576
			  tcp-buffer-size: 4096
			  max-session-count: 1200
			  log-file: stderr
			  log-level: warn
		""".trimIndent()

		private val runtimeLoaded = runCatching {
			System.loadLibrary("hev-socks5-tunnel")
		}.isSuccess
	}
}

internal object HevSocks5TunnelNative {
	external fun TProxyStartService(configPath: String, fd: Int): Boolean
	external fun TProxyStopService(): Boolean
	external fun TProxyIsRunning(): Boolean
}
