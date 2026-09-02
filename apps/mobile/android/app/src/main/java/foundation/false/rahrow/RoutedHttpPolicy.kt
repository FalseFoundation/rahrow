package foundation.falsefoundation.rahrow

import java.net.InetSocketAddress
import java.net.Proxy
import java.net.URI

object RoutedHttpPolicy {
	const val MAX_RESPONSE_BYTES = 1024 * 1024
	const val MAX_TIMEOUT_MILLIS = 10_000
	private val endpoints = setOf(
		"https://www.cloudflare.com/cdn-cgi/trace",
		"https://api64.ipify.org?format=json",
		"https://speed.cloudflare.com/__down?bytes=0",
		"https://speed.cloudflare.com/__down?bytes=1048576",
	)

	fun validateEndpoint(value: String): String {
		require(value in endpoints) { "Routed HTTP endpoint is not allowlisted" }
		return value
	}

	fun createProxy(value: String): Proxy {
		val uri = runCatching { URI(value) }
			.getOrElse { throw IllegalArgumentException("Invalid SOCKS URL", it) }
		require(uri.scheme == "socks5") { "Routed HTTP requires SOCKS5" }
		require(uri.rawUserInfo == null) { "SOCKS credentials are not allowed" }
		require(uri.host == "127.0.0.1" || uri.host == "localhost" || uri.host == "::1") {
			"Routed HTTP requires a loopback SOCKS host"
		}
		require(uri.port in 1..65535) { "Invalid SOCKS port" }
		require(uri.rawPath.isNullOrEmpty() && uri.rawQuery == null && uri.rawFragment == null) {
			"SOCKS URL must not contain a path, query, or fragment"
		}

		return Proxy(Proxy.Type.SOCKS, InetSocketAddress.createUnresolved(uri.host, uri.port))
	}

	fun validateLimits(timeoutMillis: Int, maxBytes: Int) {
		require(timeoutMillis in 1..MAX_TIMEOUT_MILLIS) { "Invalid routed HTTP timeout" }
		require(maxBytes in 1..MAX_RESPONSE_BYTES) { "Invalid routed HTTP response limit" }
	}

	fun isByteCountMode(value: String?): Boolean {
		require(value == null || value == "text" || value == "byte-count") {
			"Invalid routed HTTP response mode"
		}
		return value == "byte-count"
	}
}
