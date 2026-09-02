package foundation.falsefoundation.rahrow

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.nio.ByteBuffer
import java.nio.charset.CodingErrorAction
import java.nio.charset.StandardCharsets
import javax.net.ssl.HttpsURLConnection

@CapacitorPlugin(name = "RahRowNetwork")
class RahRowNetworkPlugin : Plugin() {
	@PluginMethod
	fun request(call: PluginCall) {
		bridge.execute {
			runCatching { executeRequest(call) }
				.onSuccess(call::resolve)
				.onFailure { error ->
					call.reject(
						error.message ?: "Native routed HTTP request failed",
						"routed_http_failed",
						error as? Exception ?: Exception(error),
					)
				}
		}
	}

	private fun executeRequest(call: PluginCall): JSObject {
		val endpoint = RoutedHttpPolicy.validateEndpoint(
			call.getString("url") ?: throw IllegalArgumentException("URL is required"),
		)
		val proxy = RoutedHttpPolicy.createProxy(
			call.getString("proxyUrl") ?: throw IllegalArgumentException("Proxy URL is required"),
		)
		val timeoutMillis = call.getInt("timeoutMs") ?: 8_000
		val maxBytes = call.getInt("maxBytes") ?: RoutedHttpPolicy.MAX_RESPONSE_BYTES
		val byteCountMode = RoutedHttpPolicy.isByteCountMode(call.getString("responseMode"))
		RoutedHttpPolicy.validateLimits(timeoutMillis, maxBytes)

		val connection = URL(endpoint).openConnection(proxy) as? HttpsURLConnection
			?: throw IllegalArgumentException("Routed HTTP requires HTTPS")
		try {
			connection.instanceFollowRedirects = false
			connection.connectTimeout = timeoutMillis
			connection.readTimeout = timeoutMillis
			connection.useCaches = false
			connection.defaultUseCaches = false
			connection.requestMethod = "GET"
			connection.setRequestProperty("Accept", "text/plain, application/json")
			connection.setRequestProperty("Cache-Control", "no-cache")
			connection.setRequestProperty("Pragma", "no-cache")
			connection.setRequestProperty("User-Agent", "RahRow/0.0.0")

			val status = connection.responseCode
			if (status in 300..399) throw IllegalStateException("Redirects are not allowed")
			val declaredLength = connection.contentLengthLong
			if (declaredLength > maxBytes) {
				throw IllegalStateException("Routed HTTP response is too large")
			}

			val response = readBody(connection, status, maxBytes, byteCountMode)
			return JSObject()
				.put("status", status)
				.put("body", response.first)
				.put("bytesRead", response.second)
		} finally {
			connection.disconnect()
		}
	}

	private fun readBody(
		connection: HttpURLConnection,
		status: Int,
		maxBytes: Int,
		byteCountMode: Boolean,
	): Pair<String, Int> {
		val stream = if (status in 200..299) connection.inputStream else connection.errorStream
			?: return Pair("", 0)
		val output = ByteArrayOutputStream()
		var bytesRead = 0
		stream.use { input ->
			val buffer = ByteArray(1024)
			while (true) {
				val count = input.read(buffer)
				if (count < 0) break
				bytesRead += count
				if (bytesRead > maxBytes) {
					throw IllegalStateException("Routed HTTP response is too large")
				}
				if (!byteCountMode) output.write(buffer, 0, count)
			}
		}
		if (byteCountMode) return Pair("", bytesRead)
		return try {
			Pair(StandardCharsets.UTF_8.newDecoder()
				.onMalformedInput(CodingErrorAction.REPORT)
				.onUnmappableCharacter(CodingErrorAction.REPORT)
				.decode(ByteBuffer.wrap(output.toByteArray()))
				.toString(), bytesRead)
		} catch (error: Exception) {
			throw IllegalStateException("Routed HTTP response is not valid UTF-8", error)
		}
	}
}
