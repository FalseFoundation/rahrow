import Capacitor
import Foundation
import Network
import NetworkExtension
import Darwin

@objc(RahRowVpnPlugin)
public final class RahRowVpnPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RahRowVpnPlugin"
    public let jsName = "RahRowVpn"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "networkIdentity", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "connect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "disconnect", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "diagnostics", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "probe", returnType: CAPPluginReturnPromise)
    ]

	@objc func networkIdentity(_ call: CAPPluginCall) {
		let monitor = NWPathMonitor()
		let queue = DispatchQueue(label: "foundation.false.rahrow.network-identity")
		monitor.pathUpdateHandler = { path in
			monitor.cancel()
			call.resolve([
				"localAddresses": Self.selectNetworkAddresses(
					Self.interfaceAddresses(),
					activeKinds: Self.activeInterfaceKinds(path)
				)
			])
		}
		monitor.start(queue: queue)
	}

    @objc func connect(_ call: CAPPluginCall) {
        #if targetEnvironment(simulator)
        call.reject(
            "iOS Simulator cannot run RahRow Network Extension packet tunnels; use a provisioned physical device",
            "unsupported_capability"
        )
        return
        #endif

        guard let profileId = call.getString("profileId"), !profileId.isEmpty else {
            call.reject("Mobile VPN connect requires a profile id", "invalid_profile")
            return
        }
        guard let engineId = call.getString("engineId"), let providerId = providerBundleIdentifier(engineId) else {
            call.reject("Unsupported VPN engine", "invalid_config")
            return
        }
        guard let providerBundle = embeddedProviderBundle(providerId) else {
            call.reject(missingEntitlementDetail(providerId), "missing-vpn-entitlement")
            return
        }
        guard providerRuntimeReady(providerBundle) else {
            call.reject(
                "The pinned native \(engineId) runtime is not bundled in this development preview",
                "unsupported_capability"
            )
            return
        }
        guard let engineConfig = call.getObject("engineConfig"),
              let configData = try? JSONSerialization.data(withJSONObject: engineConfig),
              configData.count <= 1_048_576,
              let configJson = String(data: configData, encoding: .utf8) else {
            call.reject("Mobile VPN connect requires valid engine JSON", "invalid_config")
            return
        }

        loadManager(providerBundleIdentifier: providerId) { result in
            switch result {
            case .failure(let error):
                call.reject(error.localizedDescription, "missing-vpn-entitlement", error)
            case .success(let manager):
                let tunnelProtocol = NETunnelProviderProtocol()
                tunnelProtocol.providerBundleIdentifier = providerId
                tunnelProtocol.serverAddress = "RahRow · \(engineId)"
                tunnelProtocol.providerConfiguration = [
                    "profileId": profileId,
                    "engineId": engineId,
                    "engineConfig": configJson
                ]
                manager.protocolConfiguration = tunnelProtocol
                manager.localizedDescription = "RahRow"
                manager.isEnabled = true
                manager.saveToPreferences { error in
                    if let error {
                        call.reject(error.localizedDescription, "missing-vpn-entitlement", error)
                        return
                    }
                    manager.loadFromPreferences { error in
                        if let error {
                            call.reject(error.localizedDescription, "missing-vpn-entitlement", error)
                            return
                        }
                        do {
                            try manager.connection.startVPNTunnel()
                            self.awaitTunnelStarted(manager.connection, call: call)
                        } catch {
                            call.reject(error.localizedDescription, "unsupported_capability", error)
                        }
                    }
                }
            }
        }
    }

    @objc func disconnect(_ call: CAPPluginCall) {
        loadManager { result in
			switch result {
			case .failure(let error):
				call.reject(error.localizedDescription, "engine_stop_failed", error)
			case .success(let manager):
				manager.connection.stopVPNTunnel()
				self.awaitTunnelStopped(manager.connection, call: call)
			}
        }
    }

    @objc func status(_ call: CAPPluginCall) {
        loadManager { result in
            switch result {
            case .failure(let error):
                call.resolve(["connected": false, "state": "error", "error": error.localizedDescription])
            case .success(let manager):
                call.resolve([
                    "connected": manager.connection.status == .connected,
                    "state": self.stateName(manager.connection.status),
                    "profileId": (manager.protocolConfiguration as? NETunnelProviderProtocol)?
                        .providerConfiguration?["profileId"] as? String ?? NSNull()
                ])
            }
        }
    }

    @objc func diagnostics(_ call: CAPPluginCall) {
        #if targetEnvironment(simulator)
        call.resolve([
            "platform": "ios",
            "nativeReady": false,
            "readiness": "unsupported-capability",
			"activeConnectionInBackground": false,
			"periodicSmartConnectInBackground": "opportunistic",
			"tunBackends": [
				"engine-native": false,
				"hev-socks5-tunnel": false
			],
            "detail": "iOS Simulator cannot exercise Network Extension packet tunnels; the device targets remain buildable"
        ])
        return
        #endif

        let providers = ["xray", "sing-box"].compactMap(providerBundleIdentifier)
        let missing = providers.filter { embeddedProviderBundle($0) == nil }
        let missingRuntimes = providers.filter {
            guard let providerBundle = embeddedProviderBundle($0) else { return true }
            return !providerRuntimeReady(providerBundle)
        }
        let isReady = missing.isEmpty && missingRuntimes.isEmpty
        call.resolve([
            "platform": "ios",
            "nativeReady": isReady,
            "readiness": isReady ? "ready" : (missing.isEmpty ? "unsupported-capability" : "missing-vpn-entitlement"),
			"activeConnectionInBackground": isReady,
			"periodicSmartConnectInBackground": "opportunistic",
			"tunBackends": [
				"engine-native": isReady,
				"hev-socks5-tunnel": false
			],
            "detail": isReady
                ? "Xray and sing-box packet-tunnel providers and pinned runtimes are embedded"
                : (!missing.isEmpty
                    ? "Signed Network Extension providers are not embedded: \(missing.joined(separator: ", "))"
                    : "Pinned native runtimes are not embedded for: \(missingRuntimes.joined(separator: ", "))")
        ])
    }

    @objc func probe(_ call: CAPPluginCall) {
        guard let host = call.getString("host"), let rawPort = call.getInt("port"),
              (1...65_535).contains(rawPort),
              let port = NWEndpoint.Port(rawValue: UInt16(rawPort)) else {
            call.reject("Probe requires host and port", "invalid_config")
            return
        }
        let started = DispatchTime.now()
        let connection = NWConnection(host: NWEndpoint.Host(host), port: port, using: .tcp)
		let queue = DispatchQueue(label: "foundation.false.rahrow.probe")
		var completed = false
		func finish(_ result: [String: Any]) {
			guard !completed else { return }
			completed = true
			call.resolve(result)
			connection.cancel()
		}
        connection.stateUpdateHandler = { state in
            switch state {
            case .ready:
                let elapsed = DispatchTime.now().uptimeNanoseconds - started.uptimeNanoseconds
				finish(["reachable": true, "latencyMs": Double(elapsed) / 1_000_000])
            case .failed(let error):
				finish(["reachable": false, "error": error.localizedDescription])
            default:
                break
            }
        }
		queue.asyncAfter(deadline: .now() + 5) {
			finish(["reachable": false, "error": "Probe timed out"])
		}
		connection.start(queue: queue)
    }

	private func loadManager(
		providerBundleIdentifier: String? = nil,
		completion: @escaping (Result<NETunnelProviderManager, Error>) -> Void
	) {
        NETunnelProviderManager.loadAllFromPreferences { managers, error in
            if let error {
                completion(.failure(error))
                return
            }
			let matching = managers?.first {
				guard let providerBundleIdentifier else {
					return $0.localizedDescription == "RahRow"
				}
				return ($0.protocolConfiguration as? NETunnelProviderProtocol)?
					.providerBundleIdentifier == providerBundleIdentifier
			}
			completion(.success(matching ?? NETunnelProviderManager()))
        }
    }

	private func awaitTunnelStopped(
		_ connection: NEVPNConnection,
		call: CAPPluginCall,
		attemptsRemaining: Int = 100
	) {
		switch connection.status {
		case .disconnected, .invalid:
			call.resolve()
			return
		case .connecting, .connected, .reasserting, .disconnecting:
			break
		@unknown default:
			call.reject("VPN provider returned an unknown stop state", "engine_stop_failed")
			return
		}

		guard attemptsRemaining > 0 else {
			call.reject("VPN provider stop timed out", "engine_stop_failed")
			return
		}
		DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
			self.awaitTunnelStopped(
				connection,
				call: call,
				attemptsRemaining: attemptsRemaining - 1
			)
		}
	}

	private func awaitTunnelStarted(
		_ connection: NEVPNConnection,
		call: CAPPluginCall,
		attemptsRemaining: Int = 200
	) {
		switch connection.status {
		case .connected:
			call.resolve()
			return
		case .invalid:
			call.reject("VPN provider is invalid", "engine_start_failed")
			return
		case .connecting, .reasserting, .disconnected, .disconnecting:
			break
		@unknown default:
			call.reject("VPN provider returned an unknown start state", "engine_start_failed")
			return
		}

		guard attemptsRemaining > 0 else {
			call.reject("VPN provider start timed out", "engine_start_failed")
			return
		}
		DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
			self.awaitTunnelStarted(
				connection,
				call: call,
				attemptsRemaining: attemptsRemaining - 1
			)
		}
	}

    private func providerBundleIdentifier(_ engineId: String) -> String? {
        let base = Bundle.main.bundleIdentifier ?? "foundation.false.rahrow"
        switch engineId {
        case "xray": return "\(base).PacketTunnel.Xray"
        case "sing-box": return "\(base).PacketTunnel.SingBox"
        default: return nil
        }
    }

    private func embeddedProviderBundle(_ identifier: String) -> Bundle? {
        guard let plugins = Bundle.main.builtInPlugInsURL,
              let urls = try? FileManager.default.contentsOfDirectory(at: plugins, includingPropertiesForKeys: nil) else {
            return nil
        }
        return urls.compactMap(Bundle.init(url:)).first { $0.bundleIdentifier == identifier }
    }

    private func missingEntitlementDetail(_ providerId: String) -> String {
        "Signed iOS Network Extension provider is unavailable: \(providerId)"
    }

    private func providerRuntimeReady(_ bundle: Bundle) -> Bool {
        if let value = bundle.object(forInfoDictionaryKey: "RahRowBundledRuntimeReady") as? Bool {
            return value
        }
        return (bundle.object(forInfoDictionaryKey: "RahRowBundledRuntimeReady") as? String)?
            .caseInsensitiveCompare("YES") == .orderedSame
    }

    private func stateName(_ status: NEVPNStatus) -> String {
        switch status {
        case .connecting, .reasserting: return "connecting"
        case .connected: return "connected"
        case .disconnecting: return "disconnecting"
        case .disconnected, .invalid: return "disconnected"
        @unknown default: return "error"
        }
    }

	private enum PhysicalInterfaceKind: Hashable {
		case wifiOrEthernet
		case cellular
	}

	private struct InterfaceAddress {
		let name: String
		let kind: PhysicalInterfaceKind
		let address: String
	}

	private static func activeInterfaceKinds(_ path: Network.NWPath) -> Set<PhysicalInterfaceKind> {
		var kinds = Set<PhysicalInterfaceKind>()
		if path.usesInterfaceType(.wifi) || path.usesInterfaceType(.wiredEthernet) {
			kinds.insert(.wifiOrEthernet)
		}
		if path.usesInterfaceType(.cellular) {
			kinds.insert(.cellular)
		}
		return kinds
	}

	private static func selectNetworkAddresses(
		_ candidates: [InterfaceAddress],
		activeKinds: Set<PhysicalInterfaceKind>
	) -> [String] {
		let usable = candidates.filter {
			(activeKinds.isEmpty || activeKinds.contains($0.kind)) && isUsableAddress($0.address)
		}
		let interfaceNames = Set(usable.map(\.name))
		guard interfaceNames.count == 1 else { return [] }
		return Array(Set(usable.map(\.address))).sorted()
	}

	private static func interfaceAddresses() -> [InterfaceAddress] {
		var first: UnsafeMutablePointer<ifaddrs>?
		guard getifaddrs(&first) == 0, let first else { return [] }
		defer { freeifaddrs(first) }

		var result: [InterfaceAddress] = []
		var cursor: UnsafeMutablePointer<ifaddrs>? = first
		while let interface = cursor?.pointee {
			defer { cursor = interface.ifa_next }
			guard let socketAddress = interface.ifa_addr else { continue }
			let flags = Int32(interface.ifa_flags)
			guard flags & IFF_UP != 0, flags & IFF_RUNNING != 0, flags & IFF_LOOPBACK == 0 else {
				continue
			}
			let name = String(cString: interface.ifa_name)
			let kind: PhysicalInterfaceKind
			if name.range(of: #"^en[0-9]+$"#, options: .regularExpression) != nil {
				kind = .wifiOrEthernet
			} else if name.range(of: #"^pdp_ip[0-9]+$"#, options: .regularExpression) != nil {
				kind = .cellular
			} else {
				continue
			}
			guard socketAddress.pointee.sa_family == UInt8(AF_INET) ||
				socketAddress.pointee.sa_family == UInt8(AF_INET6) else { continue }
			var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
			guard getnameinfo(
				socketAddress,
				socklen_t(socketAddress.pointee.sa_len),
				&host,
				socklen_t(host.count),
				nil,
				0,
				NI_NUMERICHOST
			) == 0 else { continue }
			result.append(InterfaceAddress(name: name, kind: kind, address: String(cString: host)))
		}
		return result
	}

	private static func isUsableAddress(_ address: String) -> Bool {
		let normalized = address.lowercased().split(separator: "%", maxSplits: 1).first.map(String.init) ?? address
		if normalized.contains(":") {
			guard normalized != "::", normalized != "::1", !normalized.hasPrefix("ff") else { return false }
			let first = UInt16(normalized.split(separator: ":", maxSplits: 1).first ?? "", radix: 16) ?? 0
			return first & 0xffc0 != 0xfe80
		}

		let octets = normalized.split(separator: ".").compactMap { UInt8($0) }
		guard octets.count == 4 else { return false }
		return normalized != "0.0.0.0" && normalized != "255.255.255.255" &&
			octets[0] != 127 && !(octets[0] == 169 && octets[1] == 254) &&
			!(224...239).contains(octets[0])
	}
}
