package foundation.falsefoundation.rahrow

import java.net.Inet4Address
import java.net.Inet6Address
import java.net.InetAddress
import java.net.URL

internal object SubscriptionFetchPolicy {
	const val MAX_RESPONSE_BYTES = 8 * 1024 * 1024
	const val MAX_HEADER_CHARS = 4096
	const val MAX_AUTHORIZATION_CHARS = 8192

	fun validateUrlShape(value: String): URL {
		val url = runCatching { URL(value.trim()) }.getOrNull()
			?: throw IllegalArgumentException("Invalid subscription URL")
		if (url.protocol != "https") {
			throw IllegalArgumentException("Subscription URLs must use HTTPS")
		}
		if (url.userInfo != null) {
			throw IllegalArgumentException("Subscription URL credentials are not allowed")
		}
		if (url.ref != null) {
			throw IllegalArgumentException("Subscription URLs must not contain fragments")
		}
		if (url.host.isNullOrBlank()) {
			throw IllegalArgumentException("Subscription URL requires a public host")
		}
		return url
	}

	fun validatePublicEndpoint(url: URL) {
		val addresses = InetAddress.getAllByName(url.host)
		if (addresses.isEmpty() || addresses.any(::isNonPublicAddress)) {
			throw IllegalArgumentException("Subscription URLs must target a public host")
		}
	}

	fun validateAuthorization(value: String?) {
		if (value == null) return
		if (
			value.isBlank() ||
			value.length > MAX_AUTHORIZATION_CHARS ||
			value.any { it == '\r' || it == '\n' }
		) {
			throw IllegalArgumentException("Subscription credential is invalid")
		}
	}

	fun allowlistedHeader(value: String?): String? {
		return value?.takeIf { it.length <= MAX_HEADER_CHARS }
	}

	private fun isNonPublicAddress(address: InetAddress): Boolean {
		if (
			address.isAnyLocalAddress ||
			address.isLoopbackAddress ||
			address.isLinkLocalAddress ||
			address.isSiteLocalAddress ||
			address.isMulticastAddress
		) return true

		val bytes = address.address
		return when (address) {
			is Inet4Address -> {
				val first = bytes[0].toInt() and 0xff
				val second = bytes[1].toInt() and 0xff
				first == 0 ||
					(first == 100 && second in 64..127) ||
					(first == 169 && second == 254) ||
					first >= 224
			}
			is Inet6Address -> (bytes[0].toInt() and 0xfe) == 0xfc
			else -> true
		}
	}
}
