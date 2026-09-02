package foundation.falsefoundation.rahrow

import android.app.Activity
import android.content.Intent
import android.os.Bundle

class QrScanActivity : Activity() {
	private lateinit var preview: QrCameraPreviewView

	override fun onCreate(savedInstanceState: Bundle?) {
		super.onCreate(savedInstanceState)
		preview = QrCameraPreviewView(this)
		setContentView(preview)
		preview.requestDecode { value ->
			setResult(RESULT_OK, Intent().putExtra(EXTRA_VALUE, value))
			finish()
		}
	}

	override fun onResume() {
		super.onResume()
		preview.start()
	}

	override fun onPause() {
		preview.stop()
		super.onPause()
	}

	companion object {
		const val EXTRA_VALUE = "value"
	}
}
