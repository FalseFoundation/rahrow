package foundation.falsefoundation.rahrow

import android.content.Context
import android.net.VpnService
import android.os.Build
import android.util.Log
import io.nekohasekai.libbox.CommandServer
import io.nekohasekai.libbox.CommandServerHandler
import io.nekohasekai.libbox.Libbox
import io.nekohasekai.libbox.OverrideOptions
import io.nekohasekai.libbox.SetupOptions
import io.nekohasekai.libbox.SystemProxyStatus
import java.io.Closeable
import java.io.File
import java.io.IOException
import java.util.Locale
import java.util.zip.ZipFile

data class NativeEngineAvailability(val available: Boolean, val detail: String)

interface NativeEngineProvider : Closeable {
	fun start(engineConfig: String)
	fun stop()
	override fun close() = stop()

	companion object {
		fun availability(context: Context, engineId: String): NativeEngineAvailability = when (engineId) {
			"sing-box" -> {
				val runtime = runCatching { Libbox.touch() }
				if (runtime.isSuccess) {
					NativeEngineAvailability(true, "Bundled sing-box Android VPN provider is ready")
				} else {
					NativeEngineAvailability(
						false,
						"Pinned libbox.aar runtime could not load libbox.so: ${runtime.exceptionOrNull()?.message}",
					)
				}
			}
			"xray" -> {
				if (hasNativeLibrary(context, "libgojni.so")) {
					NativeEngineAvailability(true, "Bundled Xray Android VPN provider is ready")
				} else {
					NativeEngineAvailability(
						false,
						"Pinned libXray.aar runtime is missing libgojni.so for this Android ABI",
					)
				}
			}
			else -> NativeEngineAvailability(false, "Unsupported VPN engine: $engineId")
		}

		fun create(service: VpnService, engineId: String): NativeEngineProvider = when (engineId) {
			"sing-box" -> SingBoxNativeEngineProvider(service)
			"xray" -> XrayNativeEngineProvider(service)
			else -> throw IOException("Unsupported VPN engine: $engineId")
		}

		private fun hasNativeLibrary(context: Context, libraryName: String): Boolean {
			if (File(context.applicationInfo.nativeLibraryDir, libraryName).isFile) return true
			val apkPaths = listOfNotNull(
				context.applicationInfo.sourceDir,
				*context.applicationInfo.splitSourceDirs.orEmpty(),
			)
			return apkPaths.any { apkPath ->
				runCatching {
					ZipFile(apkPath).use { apk ->
						Build.SUPPORTED_ABIS.any { abi ->
							apk.getEntry("lib/$abi/$libraryName") != null
						}
					}
				}.getOrDefault(false)
			}
		}
	}
}

private class SingBoxNativeEngineProvider(private val service: VpnService) : NativeEngineProvider {
	private val platform = SingBoxPlatformInterface(service)
	private var commandServer: CommandServer? = null

	override fun start(engineConfig: String) {
		try {
			setupLibbox(service)
			Libbox.checkConfig(engineConfig)
			val server = CommandServer(object : CommandServerHandler {
				override fun connectSSHAgent() = -1
				override fun triggerNativeCrash() = Unit
				override fun getSystemProxyStatus() = SystemProxyStatus().apply {
					available = false
					enabled = false
				}

				override fun setSystemProxyEnabled(enabled: Boolean) = Unit
				override fun serviceReload() = Unit
				override fun serviceStop() = platform.closeTun()
				override fun writeDebugMessage(message: String?) {
					if (!message.isNullOrBlank()) Log.d(TAG, message)
				}
			}, platform)
			commandServer = server
			server.start()
			server.startOrReloadService(engineConfig, OverrideOptions())
		} catch (error: Throwable) {
			error.rethrowIfFatal()
			stop()
			throw IOException(nativeVpnFailureMessage(error, "sing-box failed to start"), error)
		}
	}

	override fun stop() {
		val server = commandServer
		commandServer = null
		val failure = runNativeVpnCleanup(
			{ server?.closeService() },
			platform::closeTun,
			{ server?.close() },
		)
		if (failure != null) Log.w(TAG, "Failed to close sing-box service", failure)
	}

	companion object {
		private const val TAG = "RahRowSingBox"
		private val setupLock = Any()
		@Volatile private var isSetup = false

		private fun setupLibbox(context: Context) {
			if (isSetup) return
			synchronized(setupLock) {
				if (isSetup) return
				val working = File(context.filesDir, "sing-box").apply { mkdirs() }
				Libbox.setup(SetupOptions().apply {
					basePath = context.filesDir.absolutePath
					workingPath = working.absolutePath
					tempPath = context.cacheDir.absolutePath
					fixAndroidStack = true
					logMaxLines = 1_000
					debug = true
				})
				Libbox.setLocale(Locale.getDefault().toLanguageTag())
				isSetup = true
			}
		}
	}
}
