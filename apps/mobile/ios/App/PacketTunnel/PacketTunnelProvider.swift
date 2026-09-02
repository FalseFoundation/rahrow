import Foundation
import NetworkExtension

private enum PacketTunnelError: Int, LocalizedError {
    case simulatorUnsupported = 1
    case invalidConfiguration
    case wrongEngine
    case runtimeUnavailable
    case alreadyRunning
    case unsafeNetworkSettings
    case networkSettingsTimedOut

    var errorDescription: String? {
        switch self {
        case .simulatorUnsupported:
            return "RahRow packet tunnels require a physical iOS device and Network Extension provisioning"
        case .invalidConfiguration:
            return "RahRow received an invalid packet-tunnel configuration"
        case .wrongEngine:
            return "The packet-tunnel provider does not match the selected engine"
        case .runtimeUnavailable:
            return "The pinned native engine runtime is not bundled in this development preview"
        case .alreadyRunning:
            return "The RahRow packet tunnel is already starting or running"
        case .unsafeNetworkSettings:
            return "The bundled runtime did not provide leak-safe default routes and DNS settings"
        case .networkSettingsTimedOut:
            return "iOS did not apply RahRow's leak-safe tunnel settings in time"
        }
    }

    var nsError: NSError {
        NSError(
            domain: "foundation.false.rahrow.packet-tunnel",
            code: rawValue,
            userInfo: [NSLocalizedDescriptionKey: errorDescription ?? "RahRow packet tunnel failed"]
        )
    }
}

private struct ProviderConfiguration {
    static let maximumConfigurationBytes = 1_048_576

    let engineId: String
    let profileId: String
    let engineConfiguration: Data

    init(protocolConfiguration: NEVPNProtocol?, expectedEngineId: String) throws {
        guard let tunnelProtocol = protocolConfiguration as? NETunnelProviderProtocol,
              let values = tunnelProtocol.providerConfiguration,
              let engineId = values["engineId"] as? String,
              let profileId = values["profileId"] as? String,
              !profileId.isEmpty,
              let engineJSON = values["engineConfig"] as? String,
              let data = engineJSON.data(using: .utf8),
              !data.isEmpty,
              data.count <= Self.maximumConfigurationBytes,
              let object = try? JSONSerialization.jsonObject(with: data),
              object is [String: Any] else {
            throw PacketTunnelError.invalidConfiguration
        }
        guard engineId == expectedEngineId else {
            throw PacketTunnelError.wrongEngine
        }

        self.engineId = engineId
        self.profileId = profileId
        self.engineConfiguration = data
    }
}

protocol PacketTunnelEngineRuntime: AnyObject {
    // Implementations own the native TUN bridge and apply network settings only
    // after they can attach the engine to this provider's packet-flow device.
    func start(configuration: Data, provider: PacketTunnelProvider) throws
    // Must synchronously release packet readers/writers, sockets, routes, and DNS ownership.
    func stop()
}

private enum BundledEngineRuntimeFactory {
    static func make(engineId: String) -> PacketTunnelEngineRuntime? {
        // Adapter compiler conditions are enabled only when the pinned framework and
        // its packet-flow bridge source are part of the extension target. A staged
        // framework alone is not enough to advertise a functional tunnel.
        switch engineId {
        case "xray":
            #if RAHROW_XRAY_RUNTIME_ADAPTER
            return XrayPacketTunnelRuntime()
            #else
            return nil
            #endif
        case "sing-box":
            #if RAHROW_SING_BOX_RUNTIME_ADAPTER
            return SingBoxPacketTunnelRuntime()
            #else
            return nil
            #endif
        default:
            return nil
        }
    }
}

final class PacketTunnelProvider: NEPacketTunnelProvider {
    private let lifecycleQueue = DispatchQueue(label: "foundation.false.rahrow.packet-tunnel.lifecycle")
    private var runtime: PacketTunnelEngineRuntime?
    private var isStarting = false

    override func startTunnel(
        options: [String: NSObject]?,
        completionHandler: @escaping (Error?) -> Void
    ) {
        lifecycleQueue.async {
            guard !self.isStarting, self.runtime == nil else {
                completionHandler(PacketTunnelError.alreadyRunning.nsError)
                return
            }
            self.isStarting = true

            #if targetEnvironment(simulator)
            self.isStarting = false
            completionHandler(PacketTunnelError.simulatorUnsupported.nsError)
            return
            #else
            do {
                let expectedEngineId = try self.expectedEngineId()
                let configuration = try ProviderConfiguration(
                    protocolConfiguration: self.protocolConfiguration,
                    expectedEngineId: expectedEngineId
                )
                guard self.isRuntimeDeclaredReady,
                      let runtime = BundledEngineRuntimeFactory.make(engineId: configuration.engineId) else {
                    throw PacketTunnelError.runtimeUnavailable
                }

                do {
                    try runtime.start(
                        configuration: configuration.engineConfiguration,
                        provider: self
                    )
                } catch {
                    runtime.stop()
                    self.clearTunnelNetworkSettings()
                    throw error
                }
                self.isStarting = false
                self.runtime = runtime
                completionHandler(nil)
            } catch {
                self.isStarting = false
                completionHandler((error as? PacketTunnelError)?.nsError ?? error)
            }
            #endif
        }
    }

    override func stopTunnel(
        with reason: NEProviderStopReason,
        completionHandler: @escaping () -> Void
    ) {
        lifecycleQueue.async {
            self.runtime?.stop()
            self.runtime = nil
            self.isStarting = false
            self.setTunnelNetworkSettings(nil) { _ in completionHandler() }
        }
    }

    override func handleAppMessage(_ messageData: Data, completionHandler: ((Data?) -> Void)?) {
        lifecycleQueue.async {
            let response: [String: Any] = [
                "engineId": (try? self.expectedEngineId()) ?? "unknown",
                "running": self.runtime != nil,
                "runtimeBundled": self.isRuntimeDeclaredReady
            ]
            completionHandler?(try? JSONSerialization.data(withJSONObject: response))
        }
    }

    private func expectedEngineId() throws -> String {
        guard let engineId = Bundle.main.object(forInfoDictionaryKey: "RahRowEngineId") as? String,
              engineId == "xray" || engineId == "sing-box" else {
            throw PacketTunnelError.invalidConfiguration
        }
        return engineId
    }

    private var isRuntimeDeclaredReady: Bool {
        if let value = Bundle.main.object(forInfoDictionaryKey: "RahRowBundledRuntimeReady") as? Bool {
            return value
        }
        return (Bundle.main.object(forInfoDictionaryKey: "RahRowBundledRuntimeReady") as? String)?
            .caseInsensitiveCompare("YES") == .orderedSame
    }

    func applyLeakSafeNetworkSettings(_ settings: NEPacketTunnelNetworkSettings) throws {
        try validateLeakSafeSettings(settings)

        let semaphore = DispatchSemaphore(value: 0)
        var applyError: Error?
        setTunnelNetworkSettings(settings) { error in
            applyError = error
            semaphore.signal()
        }
        guard semaphore.wait(timeout: .now() + 15) == .success else {
            throw PacketTunnelError.networkSettingsTimedOut
        }
        if let applyError {
            throw applyError
        }
    }

    private func clearTunnelNetworkSettings() {
        setTunnelNetworkSettings(nil) { _ in }
    }

    private func validateLeakSafeSettings(_ settings: NEPacketTunnelNetworkSettings) throws {
        let ipv4Routes = settings.ipv4Settings?.includedRoutes ?? []
        let hasIPv4DefaultRoute = ipv4Routes.contains {
            $0.destinationAddress == "0.0.0.0" && $0.destinationSubnetMask == "0.0.0.0"
        }
        let ipv6Routes = settings.ipv6Settings?.includedRoutes ?? []
        let hasIPv6DefaultRoute = ipv6Routes.contains(where: isIPv6DefaultRoute)
        let hasDNS = settings.dnsSettings?.servers.isEmpty == false

        guard hasIPv4DefaultRoute, hasIPv6DefaultRoute, hasDNS else {
            throw PacketTunnelError.unsafeNetworkSettings
        }
    }

    private func isIPv6DefaultRoute(_ route: NEIPv6Route) -> Bool {
        let isDefaultNetwork = route.destinationAddress == "::"
        let isZeroPrefix = route.destinationNetworkPrefixLength.intValue == 0
        return isDefaultNetwork && isZeroPrefix
    }
}
