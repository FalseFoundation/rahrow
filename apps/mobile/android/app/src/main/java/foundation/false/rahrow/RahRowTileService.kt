package foundation.falsefoundation.rahrow

import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import androidx.annotation.RequiresApi

@RequiresApi(24)
class RahRowTileService : TileService() {
	override fun onStartListening() {
		super.onStartListening()
		refreshTile()
	}

	override fun onClick() {
		super.onClick()
		if (RahRowVpnControl.isConnected(this)) {
			RahRowVpnControl.disconnect(this)
			refreshTile()
			return
		}
		val pending = RahRowVpnControl.connectLastSessionOrPrepare(this)
		if (pending != null) {
			collapseAndStart(pending)
		}
		refreshTile()
	}

	private fun collapseAndStart(intent: Intent) {
		intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
		if (Build.VERSION.SDK_INT >= 34) {
			val pendingIntent =
				PendingIntent.getActivity(
					this,
					0,
					intent,
					PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
				)
			startActivityAndCollapse(pendingIntent)
			return
		}
		@Suppress("DEPRECATION")
		startActivityAndCollapse(intent)
	}

	private fun refreshTile() {
		val tile = qsTile ?: return
		val connected = RahRowVpnControl.isConnected(this)
		val session = LastVpnSessionStore(this).read()
		tile.state = if (connected) Tile.STATE_ACTIVE else Tile.STATE_INACTIVE
		tile.label = getString(R.string.tile_label)
		if (Build.VERSION.SDK_INT >= 29) {
			tile.subtitle =
				when {
					connected -> getString(R.string.tile_connected)
					session == null -> getString(R.string.tile_open_app)
					else -> getString(R.string.tile_connect)
				}
		}
		tile.updateTile()
	}
}
