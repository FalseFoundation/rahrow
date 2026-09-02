package foundation.falsefoundation.rahrow

import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import java.net.InetAddress

internal data class NetworkAddressCandidate(
	val interfaceName: String,
	val address: InetAddress,
)

internal object NetworkIdentitySelector {
	private val excludedPrefixes = listOf(
		"lo", "tun", "tap", "utun", "wg", "ipsec", "ppp", "tailscale", "zt",
		"docker", "veth", "virbr", "bridge", "br-",
	)

	fun select(candidates: List<NetworkAddressCandidate>): List<String> {
		val byInterface = candidates
			.filter { isPhysicalInterface(it.interfaceName) && isUsable(it.address) }
			.groupBy { it.interfaceName }
		if (byInterface.size != 1) return emptyList()

		return byInterface.values.single()
			.mapNotNull { it.address.hostAddress?.substringBefore('%') }
			.distinct()
			.sorted()
	}

	private fun isPhysicalInterface(name: String): Boolean {
		val normalized = name.lowercase()
		return excludedPrefixes.none { normalized.startsWith(it) }
	}

	private fun isUsable(address: InetAddress): Boolean =
		!address.isAnyLocalAddress &&
			!address.isLoopbackAddress &&
			!address.isLinkLocalAddress &&
			!address.isMulticastAddress
}

internal object AndroidNetworkIdentity {
	fun snapshot(context: Context): List<String> {
		val connectivity = context.getSystemService(ConnectivityManager::class.java)
		val activeNetwork = connectivity.activeNetwork
		val activeCapabilities = activeNetwork?.let(connectivity::getNetworkCapabilities)
		val networks = if (activeNetwork != null && activeCapabilities?.isPhysical() == true) {
			listOf(activeNetwork)
		} else {
			connectivity.allNetworks.filter { network ->
				connectivity.getNetworkCapabilities(network)?.let { capabilities ->
					capabilities.isPhysical() &&
						capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) &&
						capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_VPN)
				} == true
			}
		}

		return NetworkIdentitySelector.select(networks.flatMap { network ->
			connectivity.getLinkProperties(network)?.let { links ->
				val interfaceName = links.interfaceName ?: return@let emptyList()
				links.linkAddresses.map { NetworkAddressCandidate(interfaceName, it.address) }
			} ?: emptyList()
		})
	}

	private fun NetworkCapabilities.isPhysical(): Boolean =
		hasTransport(NetworkCapabilities.TRANSPORT_WIFI) ||
			hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) ||
			hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
}
