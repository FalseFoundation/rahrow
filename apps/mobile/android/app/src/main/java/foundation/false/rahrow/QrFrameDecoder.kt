package foundation.falsefoundation.rahrow

import com.google.zxing.BinaryBitmap
import com.google.zxing.BarcodeFormat
import com.google.zxing.DecodeHintType
import com.google.zxing.MultiFormatReader
import com.google.zxing.PlanarYUVLuminanceSource
import com.google.zxing.common.HybridBinarizer
import java.nio.ByteBuffer

object QrFrameDecoder {
	private val hints = mapOf(
		DecodeHintType.POSSIBLE_FORMATS to listOf(BarcodeFormat.QR_CODE),
		DecodeHintType.TRY_HARDER to true,
		DecodeHintType.ALSO_INVERTED to true,
		DecodeHintType.CHARACTER_SET to Charsets.UTF_8.name(),
	)

	fun decode(luminance: ByteArray, width: Int, height: Int): String? {
		if (width <= 0 || height <= 0 || luminance.size < width * height) return null
		val source = PlanarYUVLuminanceSource(
			luminance,
			width,
			height,
			0,
			0,
			width,
			height,
			false,
		)
		return runCatching {
			MultiFormatReader()
				.decode(BinaryBitmap(HybridBinarizer(source)), hints)
				.text
				.trim()
				.takeIf(String::isNotEmpty)
		}.getOrNull()
	}

	fun packLuminancePlane(
		buffer: ByteBuffer,
		width: Int,
		height: Int,
		rowStride: Int,
		pixelStride: Int,
	): ByteArray? {
		if (width <= 0 || height <= 0 || rowStride <= 0 || pixelStride <= 0) return null
		val source = buffer.duplicate()
		val initialOffset = source.position()
		val packed = ByteArray(width * height)
		for (row in 0 until height) {
			for (column in 0 until width) {
				val sourceIndex = initialOffset + row * rowStride + column * pixelStride
				if (sourceIndex >= source.limit()) return null
				packed[row * width + column] = source.get(sourceIndex)
			}
		}
		return packed
	}
}
