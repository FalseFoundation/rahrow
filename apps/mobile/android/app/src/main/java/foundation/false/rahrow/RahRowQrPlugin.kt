package foundation.falsefoundation.rahrow

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.content.pm.PackageManager
import android.view.ViewGroup
import android.widget.FrameLayout
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

@CapacitorPlugin(name = "RahRowQr", permissions = [Permission(strings = [Manifest.permission.CAMERA], alias = "camera")])
class RahRowQrPlugin : Plugin() {
	private var preview: QrCameraPreviewView? = null
	private var pendingScan: PluginCall? = null
	private var pendingPreviewPermission: PluginCall? = null

	@PluginMethod
	fun startPreview(call: PluginCall) {
		if (getPermissionState("camera") != com.getcapacitor.PermissionState.GRANTED) {
			pendingPreviewPermission?.reject("QR preview request was superseded", "invalid_config")
			pendingPreviewPermission = call
			requestPermissionForAlias("camera", call, "previewCameraGranted")
			return
		}
		showPreview(call)
	}

	@PermissionCallback
	private fun previewCameraGranted(call: PluginCall) {
		if (pendingPreviewPermission !== call) {
			call.reject("QR preview request was stopped", "invalid_config")
			return
		}
		pendingPreviewPermission = null
		if (getPermissionState("camera") != com.getcapacitor.PermissionState.GRANTED) {
			call.reject("Camera permission is required to preview QR codes", "unsupported_capability")
			return
		}
		showPreview(call)
	}

	@PluginMethod
	fun stopPreview(call: PluginCall) {
		activity.runOnUiThread {
			removePreview()
			call.resolve()
		}
	}

	@PluginMethod
	fun scan(call: PluginCall) {
		if (getPermissionState("camera") != com.getcapacitor.PermissionState.GRANTED) {
			requestPermissionForAlias("camera", call, "cameraGranted")
			return
		}
		openScanner(call)
	}

	@PermissionCallback
	private fun cameraGranted(call: PluginCall) {
		if (getPermissionState("camera") != com.getcapacitor.PermissionState.GRANTED) {
			call.reject("Camera permission is required to scan QR codes", "unsupported_capability")
			return
		}
		openScanner(call)
	}

	@ActivityCallback
	private fun scanFinished(call: PluginCall, result: androidx.activity.result.ActivityResult) {
		if (result.resultCode != Activity.RESULT_OK) {
			call.reject("QR scan was cancelled", "invalid_config")
			return
		}
		val value = result.data?.getStringExtra(QrScanActivity.EXTRA_VALUE).orEmpty()
		if (value.isBlank()) {
			call.reject("QR scan did not return text", "invalid_config")
			return
		}
		val payload = JSObject()
		payload.put("value", value)
		call.resolve(payload)
	}

	private fun openScanner(call: PluginCall) {
		if (!context.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)) {
			call.reject("A camera capable of scanning QR codes is unavailable", "unsupported_capability")
			return
		}
		val activePreview = preview
		if (activePreview != null) {
			if (pendingScan != null) {
				call.reject("A QR scan is already pending", "invalid_config")
				return
			}
			pendingScan = call
			activePreview.requestDecode { value -> resolvePreviewScan(value) }
			return
		}
		val intent = Intent(context, QrScanActivity::class.java)
		startActivityForResult(call, intent, "scanFinished")
	}

	private fun showPreview(call: PluginCall) {
		if (!context.packageManager.hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)) {
			call.reject("A camera capable of scanning QR codes is unavailable", "unsupported_capability")
			return
		}
		val pixelRatio = call.getDouble("pixelRatio") ?: 1.0
		val width = ((call.getDouble("width") ?: 0.0) * pixelRatio).toInt()
		val height = ((call.getDouble("height") ?: 0.0) * pixelRatio).toInt()
		if (width <= 0 || height <= 0) {
			call.reject("QR preview requires a visible camera rectangle", "invalid_config")
			return
		}
		val left = ((call.getDouble("x") ?: 0.0) * pixelRatio).toInt()
		val top = ((call.getDouble("y") ?: 0.0) * pixelRatio).toInt()
		activity.runOnUiThread {
			var resolved = false
			val root = activity.findViewById<ViewGroup>(android.R.id.content)
			val cameraPreview = preview ?: QrCameraPreviewView(context).also { created ->
				created.setBackgroundColor(Color.BLACK)
				root.addView(created)
				preview = created
			}
			cameraPreview.layoutParams = FrameLayout.LayoutParams(width, height).apply {
				leftMargin = left
				topMargin = top
			}
			cameraPreview.start(
				onReady = {
					resolved = true
					call.resolve()
				},
				onError = { message ->
					if (resolved) {
						pendingScan?.reject(message, "unsupported_capability")
						pendingScan = null
						removePreview()
					} else {
						call.reject(message, "unsupported_capability")
						removePreview()
					}
				},
			)
		}
	}

	private fun resolvePreviewScan(value: String) {
		val call = pendingScan ?: return
		pendingScan = null
		val payload = JSObject()
		payload.put("value", value)
		call.resolve(payload)
	}

	private fun removePreview() {
		pendingPreviewPermission?.reject("QR preview request was stopped", "invalid_config")
		pendingPreviewPermission = null
		pendingScan?.reject("QR preview stopped", "invalid_config")
		pendingScan = null
		preview?.stop()
		(preview?.parent as? ViewGroup)?.removeView(preview)
		preview = null
	}

	override fun handleOnPause() {
		activity.runOnUiThread { preview?.stop() }
	}

	override fun handleOnResume() {
		activity.runOnUiThread { preview?.start() }
	}
}
