package foundation.falsefoundation.rahrow

import android.annotation.SuppressLint
import android.net.ConnectivityManager
import android.net.DnsResolver
import android.net.IpPrefix
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.VpnService
import android.os.Build
import android.os.CancellationSignal
import android.os.ParcelFileDescriptor
import android.os.Process
import android.system.OsConstants
import android.util.Base64
import android.util.Log
import io.nekohasekai.libbox.ConnectionOwner
import io.nekohasekai.libbox.ExchangeContext
import io.nekohasekai.libbox.Func
import io.nekohasekai.libbox.InterfaceUpdateListener
import io.nekohasekai.libbox.Libbox
import io.nekohasekai.libbox.LocalDNSTransport
import io.nekohasekai.libbox.NetworkInterfaceIterator
import io.nekohasekai.libbox.Notification
import io.nekohasekai.libbox.PlatformInterface
import io.nekohasekai.libbox.StringIterator
import io.nekohasekai.libbox.TunOptions
import io.nekohasekai.libbox.WIFIState
import java.net.Inet4Address
import java.net.Inet6Address
import java.net.InetAddress
import java.net.InetSocketAddress
import java.net.InterfaceAddress
import java.net.NetworkInterface
import java.security.KeyStore
import java.util.Collections
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import io.nekohasekai.libbox.NetworkInterface as LibboxNetworkInterface

internal class SingBoxPlatformInterface(private val service: VpnService) : PlatformInterface {
	private val connectivity = service.getSystemService(ConnectivityManager::class.java)
	private val callbacks = ConcurrentHashMap<InterfaceUpdateListener, ConnectivityManager.NetworkCallback>()
	@Volatile private var tun: ParcelFileDescriptor? = null

	override fun usePlatformAutoDetectInterfaceControl() = true
	override fun autoDetectInterfaceControl(fd: Int) {
		if (!service.protect(fd)) error("Android refused to protect sing-box socket $fd")
	}

	override fun useProcFS() = Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
	override fun underNetworkExtension() = false
	override fun includeAllNetworks() = false
	override fun clearDNSCache() = Unit
	override fun localDNSTransport(): LocalDNSTransport = AndroidLocalDns(connectivity)
	override fun readWIFIState(): WIFIState? = null
	override fun sendNotification(notification: Notification) = Unit

	override fun openTun(options: TunOptions): Int {
		if (VpnService.prepare(service) != null) error("Android VPN permission is missing")
		closeTun()
		val builder = service.Builder()
			.setSession("RahRow · sing-box")
			.setMtu(options.mtu)
			.setBlocking(true)
		if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) builder.setMetered(false)

		addAddresses(builder, options.inet4Address)
		addAddresses(builder, options.inet6Address)
		if (options.autoRoute) {
			options.dnsServerAddress.value.takeIf { it.isNotBlank() }?.let(builder::addDnsServer)
			if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
				addRoutes(builder, options.inet4RouteAddress)
				addRoutes(builder, options.inet6RouteAddress)
				excludeRoutes(builder, options.inet4RouteExcludeAddress)
				excludeRoutes(builder, options.inet6RouteExcludeAddress)
			} else {
				addRoutes(builder, options.inet4RouteRange)
				addRoutes(builder, options.inet6RouteRange)
			}
			val includePackage = options.includePackage
			while (includePackage.hasNext()) {
				runCatching { builder.addAllowedApplication(includePackage.next()) }
					.onFailure { Log.w(TAG, "Ignoring unavailable allowed application", it) }
			}
			val excludePackage = options.excludePackage
			while (excludePackage.hasNext()) {
				runCatching { builder.addDisallowedApplication(excludePackage.next()) }
					.onFailure { Log.w(TAG, "Ignoring unavailable excluded application", it) }
			}
		}

		val established = builder.establish()
			?: error("Android could not establish the sing-box VPN interface")
		tun = established
		return established.fd
	}

	fun closeTun() {
		tun?.close()
		tun = null
	}

	@SuppressLint("NewApi")
	override fun findConnectionOwner(
		ipProtocol: Int,
		sourceAddress: String,
		sourcePort: Int,
		destinationAddress: String,
		destinationPort: Int,
	): ConnectionOwner {
		if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) error("Connection owner lookup requires Android 10")
		val uid = connectivity.getConnectionOwnerUid(
			ipProtocol,
			InetSocketAddress(sourceAddress, sourcePort),
			InetSocketAddress(destinationAddress, destinationPort),
		)
		if (uid == Process.INVALID_UID) error("Android connection owner was not found")
		val packages = service.packageManager.getPackagesForUid(uid).orEmpty()
		return ConnectionOwner().apply {
			userId = uid
			userName = packages.firstOrNull().orEmpty()
			setAndroidPackageNames(StringArray(packages.iterator()))
		}
	}

	@SuppressLint("MissingPermission")
	override fun getInterfaces(): NetworkInterfaceIterator {
		val javaInterfaces = Collections.list(NetworkInterface.getNetworkInterfaces())
		val result = connectivity.allNetworks.mapNotNull { network ->
			val properties = connectivity.getLinkProperties(network) ?: return@mapNotNull null
			val capabilities = connectivity.getNetworkCapabilities(network) ?: return@mapNotNull null
			val name = properties.interfaceName ?: return@mapNotNull null
			val javaInterface = javaInterfaces.firstOrNull { it.name == name } ?: return@mapNotNull null
			LibboxNetworkInterface().apply {
				this.name = name
				index = javaInterface.index
				mtu = runCatching { javaInterface.mtu }.getOrDefault(0)
				addresses = StringArray(javaInterface.interfaceAddresses.map { it.toPrefix() }.iterator())
				dnsServer = StringArray(properties.dnsServers.mapNotNull { it.hostAddress }.iterator())
				type = when {
					capabilities.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> Libbox.InterfaceTypeWIFI
					capabilities.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> Libbox.InterfaceTypeCellular
					capabilities.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET) -> Libbox.InterfaceTypeEthernet
					else -> Libbox.InterfaceTypeOther
				}
				flags = if (capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) {
					OsConstants.IFF_UP or OsConstants.IFF_RUNNING
				} else 0
				metered = !capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED)
			}
		}
		return InterfaceArray(result.iterator())
	}

	@SuppressLint("MissingPermission")
	override fun startDefaultInterfaceMonitor(listener: InterfaceUpdateListener) {
		val callback = object : ConnectivityManager.NetworkCallback() {
			override fun onAvailable(network: Network) = updateDefaultInterface(listener, network)
			override fun onLost(network: Network) {
				listener.updateDefaultInterface("", -1, false, false)
			}
		}
		callbacks.put(listener, callback)?.let { runCatching { connectivity.unregisterNetworkCallback(it) } }
		connectivity.registerNetworkCallback(
			NetworkRequest.Builder()
				.addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
				.addCapability(NetworkCapabilities.NET_CAPABILITY_NOT_VPN)
				.build(),
			callback,
		)
		connectivity.activeNetwork?.let { updateDefaultInterface(listener, it) }
	}

	override fun closeDefaultInterfaceMonitor(listener: InterfaceUpdateListener) {
		callbacks.remove(listener)?.let { runCatching { connectivity.unregisterNetworkCallback(it) } }
	}

	private fun updateDefaultInterface(listener: InterfaceUpdateListener, network: Network) {
		val name = connectivity.getLinkProperties(network)?.interfaceName ?: return
		val index = runCatching { NetworkInterface.getByName(name)?.index ?: -1 }.getOrDefault(-1)
		listener.updateDefaultInterface(name, index, false, false)
	}

	override fun systemCertificates(): StringIterator {
		val keyStore = KeyStore.getInstance("AndroidCAStore").apply { load(null) }
		val certificates = Collections.list(keyStore.aliases()).mapNotNull { alias ->
			keyStore.getCertificate(alias)?.encoded?.let { encoded ->
				"-----BEGIN CERTIFICATE-----\n${Base64.encodeToString(encoded, Base64.NO_WRAP)}\n-----END CERTIFICATE-----"
			}
		}
		return StringArray(certificates.iterator())
	}

	private fun addAddresses(builder: VpnService.Builder, iterator: io.nekohasekai.libbox.RoutePrefixIterator) {
		while (iterator.hasNext()) iterator.next().let { builder.addAddress(it.address(), it.prefix()) }
	}

	private fun addRoutes(builder: VpnService.Builder, iterator: io.nekohasekai.libbox.RoutePrefixIterator) {
		while (iterator.hasNext()) iterator.next().let { builder.addRoute(it.address(), it.prefix()) }
	}

	private fun excludeRoutes(builder: VpnService.Builder, iterator: io.nekohasekai.libbox.RoutePrefixIterator) {
		while (iterator.hasNext()) iterator.next().let {
			builder.excludeRoute(IpPrefix(InetAddress.getByName(it.address()), it.prefix()))
		}
	}

	private fun InterfaceAddress.toPrefix(): String = if (address is Inet6Address) {
		"${Inet6Address.getByAddress(address.address).hostAddress}/$networkPrefixLength"
	} else {
		"${address.hostAddress}/$networkPrefixLength"
	}

	private class InterfaceArray(private val iterator: Iterator<LibboxNetworkInterface>) : NetworkInterfaceIterator {
		override fun hasNext() = iterator.hasNext()
		override fun next() = iterator.next()
	}

	private class StringArray(private val iterator: Iterator<String>) : StringIterator {
		override fun len() = 0
		override fun hasNext() = iterator.hasNext()
		override fun next() = iterator.next()
	}

	companion object {
		private const val TAG = "RahRowSingBox"
	}
}

/**
 * sing-box 1.13 resolves the proxy hostname through the `local` DNS server.
 * On Android that server calls this transport. Queries use the physical
 * network so they do not re-enter the VPN that is still waiting on that name.
 */
private class AndroidLocalDns(
	private val connectivity: ConnectivityManager,
) : LocalDNSTransport {
	private val executor = Executors.newSingleThreadExecutor()

	override fun raw() = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q

	override fun exchange(ctx: ExchangeContext, message: ByteArray) {
		if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
			ctx.errnoCode(OsConstants.ENOSYS)
			return
		}
		exchangeOnUnderlyingNetwork(ctx, message)
	}

	override fun lookup(ctx: ExchangeContext, network: String, domain: String) {
		val host = domain.trim().trimEnd('.')
		try {
			val addresses = InetAddress.getAllByName(host).mapNotNull { address ->
				val ip = address.hostAddress ?: return@mapNotNull null
				when (network) {
					"ip4" -> if (address is Inet4Address) ip else null
					"ip6" -> if (address is Inet6Address) ip else null
					else -> ip
				}
			}
			if (addresses.isEmpty()) ctx.errorCode(NXDOMAIN) else ctx.success(addresses.joinToString("\n"))
		} catch (error: Exception) {
			ctx.errnoCode(OsConstants.EIO)
		}
	}

	@SuppressLint("NewApi")
	private fun exchangeOnUnderlyingNetwork(ctx: ExchangeContext, message: ByteArray) {
		val latch = CountDownLatch(1)
		val signal = CancellationSignal()
		ctx.onCancel(object : Func {
			override fun invoke() {
				signal.cancel()
			}
		})
		DnsResolver.getInstance().rawQuery(
			underlyingNetwork(),
			message,
			DnsResolver.FLAG_EMPTY,
			executor,
			signal,
			object : DnsResolver.Callback<ByteArray> {
				override fun onAnswer(answer: ByteArray, rcode: Int) {
					ctx.rawSuccess(answer)
					latch.countDown()
				}

				override fun onError(error: DnsResolver.DnsException) {
					ctx.errnoCode(OsConstants.EIO)
					latch.countDown()
				}
			},
		)
		if (!latch.await(DNS_TIMEOUT_SECONDS, TimeUnit.SECONDS)) {
			signal.cancel()
			ctx.errnoCode(OsConstants.ETIMEDOUT)
		}
	}

	@Suppress("DEPRECATION")
	private fun underlyingNetwork(): Network? {
		return connectivity.allNetworks.firstOrNull { network ->
			val capabilities = connectivity.getNetworkCapabilities(network) ?: return@firstOrNull false
			capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
				capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_VPN)
		}
	}

	private companion object {
		const val NXDOMAIN = 3
		const val DNS_TIMEOUT_SECONDS = 5L
	}
}
