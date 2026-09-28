package foundation.falsefoundation.rahrow

internal fun runNativeVpnStart(
	start: () -> Unit,
	onFailure: (Throwable) -> Unit,
): Boolean = try {
	start()
	true
} catch (error: Throwable) {
	error.rethrowIfFatal()
	onFailure(error)
	false
}

internal fun runNativeVpnCleanup(vararg operations: () -> Unit): Throwable? {
	var firstFailure: Throwable? = null
	for (operation in operations) {
		try {
			operation()
		} catch (error: Throwable) {
			error.rethrowIfFatal()
			if (firstFailure == null) firstFailure = error
		}
	}
	return firstFailure
}

internal fun nativeVpnFailureMessage(error: Throwable, fallback: String): String =
	error.message?.takeIf(String::isNotBlank) ?: fallback

internal fun nativeVpnStopFailure(
	current: NativeVpnStatus,
	message: String,
): NativeVpnStatus = NativeVpnStatus(
	state = "error",
	profileId = current.profileId,
	engineId = current.engineId,
	tunBackendId = current.tunBackendId,
	error = message,
)

internal fun Throwable.rethrowIfFatal() {
	if (this is VirtualMachineError || this is ThreadDeath) throw this
}
