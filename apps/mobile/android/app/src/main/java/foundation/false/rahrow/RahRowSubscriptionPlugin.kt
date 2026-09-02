package foundation.falsefoundation.rahrow

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.nio.ByteBuffer
import java.nio.charset.CodingErrorAction
import java.nio.charset.StandardCharsets
import javax.net.ssl.HttpsURLConnection

@CapacitorPlugin(name = "RahRowSubscription")
class RahRowSubscriptionPlugin : Plugin() {
	@PluginMethod
	fun fetch(call: PluginCall) {
		bridge.execute {
			runCatching { executeRequest(call) }
				.onSuccess(call::resolve)
				.onFailure { error ->
					val exception = error as? Exception ?: Exception(error)
					call.reject(
						error.message ?: "Native subscription request failed",
						"subscription_fetch_failed",
						exception,
					)
				}
		}
	}

	private fun executeRequest(call: PluginCall): JSObject {
		val input = call.getString("url")
			?: throw IllegalArgumentException("Subscription URL is required")
		val authorization = call.getString("authorization")
		val url = SubscriptionFetchPolicy.validateUrlShape(input)
		SubscriptionFetchPolicy.validateAuthorization(authorization)
		SubscriptionFetchPolicy.validatePublicEndpoint(url)

		val connection = url.openConnection() as? HttpsURLConnection
			?: throw IllegalArgumentException("Subscription URLs must use HTTPS")
		try {
			connection.instanceFollowRedirects = false
			connection.connectTimeout = REQUEST_TIMEOUT_MILLIS
			connection.readTimeout = REQUEST_TIMEOUT_MILLIS
			connection.useCaches = false
			connection.requestMethod = "GET"
			connection.setRequestProperty("User-Agent", "RahRow/0.0.0")
			if (authorization != null) {
				connection.setRequestProperty("Authorization", authorization)
			}

			val status = connection.responseCode
			if (status in 300..399) {
				throw IllegalStateException("Subscription redirects are not allowed")
			}
			if (status !in 200..299) {
				throw IllegalStateException("Subscription request returned HTTP $status")
			}
			val declaredLength = connection.contentLengthLong
			if (declaredLength > SubscriptionFetchPolicy.MAX_RESPONSE_BYTES) {
				throw IllegalStateException("Subscription response is too large")
			}

			val result = JSObject()
			result.put("body", readBody(connection))
			putHeader(result, "subscriptionUserinfo", connection, "Subscription-Userinfo")
			putHeader(result, "profileUpdateInterval", connection, "Profile-Update-Interval")
			putHeader(result, "supportUrl", connection, "Support-Url")
			putHeader(result, "profileWebPageUrl", connection, "Profile-Web-Page-Url")
			return result
		} finally {
			connection.disconnect()
		}
	}

	private fun readBody(connection: HttpURLConnection): String {
		val output = ByteArrayOutputStream()
		connection.inputStream.use { input ->
			val buffer = ByteArray(8192)
			while (true) {
				val count = input.read(buffer)
				if (count < 0) break
				if (output.size() + count > SubscriptionFetchPolicy.MAX_RESPONSE_BYTES) {
					throw IllegalStateException("Subscription response is too large")
				}
				output.write(buffer, 0, count)
			}
		}

		return try {
			StandardCharsets.UTF_8
				.newDecoder()
				.onMalformedInput(CodingErrorAction.REPORT)
				.onUnmappableCharacter(CodingErrorAction.REPORT)
				.decode(ByteBuffer.wrap(output.toByteArray()))
				.toString()
		} catch (error: Exception) {
			throw IllegalStateException("Subscription response is not valid UTF-8", error)
		}
	}

	private fun putHeader(
		result: JSObject,
		outputName: String,
		connection: HttpURLConnection,
		headerName: String,
	) {
		SubscriptionFetchPolicy.allowlistedHeader(connection.getHeaderField(headerName))
			?.let { result.put(outputName, it) }
	}

	private companion object {
		const val REQUEST_TIMEOUT_MILLIS = 30_000
	}
}
