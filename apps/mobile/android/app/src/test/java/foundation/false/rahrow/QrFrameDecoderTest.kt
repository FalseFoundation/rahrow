package foundation.falsefoundation.rahrow

import com.google.zxing.BarcodeFormat
import com.google.zxing.qrcode.QRCodeWriter
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.nio.ByteBuffer

class QrFrameDecoderTest {
	@Test
	fun decodesKnownConnectionPayloadFromCameraLuminance() {
		val expected = "vless://11111111-1111-1111-1111-111111111111@example.com:443"
		val matrix = QRCodeWriter().encode(expected, BarcodeFormat.QR_CODE, 320, 320)
		val luminance = ByteArray(matrix.width * matrix.height) { index ->
			val x = index % matrix.width
			val y = index / matrix.width
			if (matrix[x, y]) 0.toByte() else 0xff.toByte()
		}

		assertEquals(expected, QrFrameDecoder.decode(luminance, matrix.width, matrix.height))
	}

	@Test
	fun ignoresFramesWithoutQrData() {
		assertNull(QrFrameDecoder.decode(ByteArray(320 * 240) { 0x7f }, 320, 240))
	}

	@Test
	fun packsPaddedInterleavedCameraPlanesWithoutReadingPadding() {
		val bytes = byteArrayOf(
			99, 1, 90, 2, 90, 3, 90, 77,
			77, 4, 90, 5, 90, 6, 90, 77,
		)
		val buffer = ByteBuffer.wrap(bytes).apply { position(1) }

		assertEquals(
			listOf<Byte>(1, 2, 3, 4, 5, 6),
			QrFrameDecoder.packLuminancePlane(
				buffer = buffer,
				width = 3,
				height = 2,
				rowStride = 8,
				pixelStride = 2,
			)?.toList(),
		)
	}
}
