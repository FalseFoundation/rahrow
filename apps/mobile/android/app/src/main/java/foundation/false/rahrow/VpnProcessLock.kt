package foundation.falsefoundation.rahrow

import android.content.Context
import java.io.Closeable
import java.io.RandomAccessFile
import java.nio.channels.FileLock

class VpnProcessLock private constructor(
	private val file: RandomAccessFile,
	private val lock: FileLock,
) : Closeable {
	override fun close() {
		lock.release()
		file.close()
	}

	companion object {
		fun acquire(context: Context): VpnProcessLock? {
			val file = RandomAccessFile(context.filesDir.resolve("rahrow-vpn.lock"), "rw")
			val lock = try {
				file.channel.tryLock()
			} catch (_: Exception) {
				null
			}
			if (lock == null) {
				file.close()
				return null
			}
			return VpnProcessLock(file, lock)
		}
	}
}
