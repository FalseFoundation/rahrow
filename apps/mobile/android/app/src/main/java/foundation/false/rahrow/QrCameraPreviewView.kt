package foundation.falsefoundation.rahrow

import android.annotation.SuppressLint
import android.content.Context
import android.graphics.ImageFormat
import android.hardware.camera2.CameraCaptureSession
import android.hardware.camera2.CameraCharacteristics
import android.hardware.camera2.CameraDevice
import android.hardware.camera2.CameraManager
import android.hardware.camera2.CaptureRequest
import android.hardware.camera2.params.StreamConfigurationMap
import android.media.Image
import android.media.ImageReader
import android.os.Handler
import android.os.HandlerThread
import android.util.Size
import android.view.SurfaceHolder
import android.view.SurfaceView
import android.widget.FrameLayout

class QrCameraPreviewView(context: Context) : FrameLayout(context), SurfaceHolder.Callback {
	private val surface = SurfaceView(context)
	private var camera: CameraDevice? = null
	private var reader: ImageReader? = null
	private var session: CameraCaptureSession? = null
	private var background: HandlerThread? = null
	private var handler: Handler? = null
	private var decodeResult: ((String) -> Unit)? = null
	private var cameraReady: (() -> Unit)? = null
	private var cameraError: ((String) -> Unit)? = null
	private var surfaceReady = false

	init {
		addView(surface, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
		surface.holder.addCallback(this)
	}

	fun start(onReady: (() -> Unit)? = null, onError: ((String) -> Unit)? = null) {
		if (onReady != null) cameraReady = onReady
		if (onError != null) cameraError = onError
		if (session != null) {
			cameraReady?.let { callback ->
				cameraReady = null
				post(callback)
			}
			return
		}
		if (surfaceReady && camera == null) openCamera(surface.holder)
	}

	fun stop() {
		closeCamera()
	}

	fun requestDecode(onResult: (String) -> Unit) {
		decodeResult = onResult
	}

	override fun surfaceCreated(holder: SurfaceHolder) {
		surfaceReady = true
		start()
	}

	override fun surfaceChanged(holder: SurfaceHolder, format: Int, width: Int, height: Int) = Unit

	override fun surfaceDestroyed(holder: SurfaceHolder) {
		surfaceReady = false
		closeCamera()
	}

	@SuppressLint("MissingPermission")
	private fun openCamera(holder: SurfaceHolder) {
		val manager = context.getSystemService(CameraManager::class.java)
		val cameraId = manager.cameraIdList.firstOrNull { id ->
			manager.getCameraCharacteristics(id).get(CameraCharacteristics.LENS_FACING) ==
				CameraCharacteristics.LENS_FACING_BACK
		} ?: manager.cameraIdList.firstOrNull() ?: return
		startBackground()
		val imageSize = chooseDecodeSize(
			manager.getCameraCharacteristics(cameraId)
				.get(CameraCharacteristics.SCALER_STREAM_CONFIGURATION_MAP),
		) ?: return failCamera("The camera does not expose a supported QR capture size")
		holder.setFixedSize(imageSize.width, imageSize.height)
		val imageReader = ImageReader.newInstance(
			imageSize.width,
			imageSize.height,
			ImageFormat.YUV_420_888,
			2,
		)
		reader = imageReader
		imageReader.setOnImageAvailableListener({ incoming ->
			incoming.acquireLatestImage()?.use { image -> decode(image) }
		}, handler)
		manager.openCamera(
			cameraId,
			object : CameraDevice.StateCallback() {
				override fun onOpened(device: CameraDevice) {
					camera = device
					device.createCaptureSession(
						listOf(holder.surface, imageReader.surface),
						object : CameraCaptureSession.StateCallback() {
							override fun onConfigured(captureSession: CameraCaptureSession) {
								session = captureSession
								val request = device.createCaptureRequest(CameraDevice.TEMPLATE_PREVIEW).apply {
									addTarget(holder.surface)
									addTarget(imageReader.surface)
									set(CaptureRequest.CONTROL_AF_MODE, CaptureRequest.CONTROL_AF_MODE_CONTINUOUS_PICTURE)
								}
								captureSession.setRepeatingRequest(request.build(), null, handler)
								cameraReady?.let { callback ->
									cameraReady = null
									post(callback)
								}
							}

							override fun onConfigureFailed(captureSession: CameraCaptureSession) =
								failCamera("The camera could not configure a QR capture session")
						},
						handler,
					)
				}

				override fun onDisconnected(device: CameraDevice) =
					failCamera("The camera disconnected during QR scanning")
				override fun onError(device: CameraDevice, error: Int) =
					failCamera("The camera failed during QR scanning")
			},
			handler,
		)
	}

	private fun chooseDecodeSize(configuration: StreamConfigurationMap?): Size? {
		val sizes = configuration?.getOutputSizes(ImageFormat.YUV_420_888).orEmpty()
		return sizes
			.filter { it.width <= 1280 && it.height <= 1280 }
			.maxByOrNull { it.width.toLong() * it.height }
			?: sizes.minByOrNull { it.width.toLong() * it.height }
	}

	private fun failCamera(message: String) {
		val callback = cameraError
		cameraError = null
		cameraReady = null
		closeCamera()
		post { callback?.invoke(message) }
	}

	private fun decode(image: Image) {
		val callback = decodeResult ?: return
		val y = image.planes[0]
		val width = image.width
		val height = image.height
		val packed = QrFrameDecoder.packLuminancePlane(
			buffer = y.buffer,
			width = width,
			height = height,
			rowStride = y.rowStride,
			pixelStride = y.pixelStride,
		) ?: return
		val text = QrFrameDecoder.decode(packed, width, height) ?: return
		if (decodeResult === callback) {
			decodeResult = null
			post { callback(text) }
		}
	}

	private fun startBackground() {
		if (background != null) return
		val thread = HandlerThread("rahrow-qr").also { it.start() }
		background = thread
		handler = Handler(thread.looper)
	}

	private fun closeCamera() {
		session?.close()
		session = null
		camera?.close()
		camera = null
		reader?.close()
		reader = null
		background?.quitSafely()
		background = null
		handler = null
	}
}
