import Foundation
import Network
import NetworkExtension

#if RAHROW_XRAY_RUNTIME_ADAPTER
import Darwin
import LibXray
#endif

#if RAHROW_SING_BOX_RUNTIME_ADAPTER
import Libbox
#endif

enum NativeRuntimeError: LocalizedError {
    case invalidConfiguration(String)
    case missingTunnelFileDescriptor
    case runtimeFailure(String)

    var errorDescription: String? {
        switch self {
        case let .invalidConfiguration(message):
            return "Invalid native tunnel configuration: \(message)"
        case .missingTunnelFileDescriptor:
            return "The Network Extension did not expose its TUN file descriptor"
        case let .runtimeFailure(message):
            return "The bundled native runtime failed: \(message)"
        }
    }
}

#if RAHROW_XRAY_RUNTIME_ADAPTER
final class XrayPacketTunnelRuntime: PacketTunnelEngineRuntime {
    private var isRunning = false

    func start(configuration: Data, provider: PacketTunnelProvider) throws {
        guard !isRunning else {
            throw NativeRuntimeError.runtimeFailure("Xray is already running")
        }
        guard var root = try JSONSerialization.jsonObject(with: configuration) as? [String: Any] else {
            throw NativeRuntimeError.invalidConfiguration("the root must be a JSON object")
        }

        let settings = try Self.makeNetworkSettings(root)
        // NetworkExtension owns route installation on iOS. Asking Xray to mutate
        // Darwin's routing table from the extension is both redundant and unsafe.
        if var inbounds = root["inbounds"] as? [[String: Any]],
           let index = inbounds.firstIndex(where: { $0["protocol"] as? String == "tun" }),
           var tunSettings = inbounds[index]["settings"] as? [String: Any] {
            tunSettings.removeValue(forKey: "autoSystemRoutingTable")
            inbounds[index]["settings"] = tunSettings
            root["inbounds"] = inbounds
        }
        try provider.applyLeakSafeNetworkSettings(settings)

        guard let tunnelFD = DarwinTunnelFileDescriptor.current() else {
            throw NativeRuntimeError.missingTunnelFileDescriptor
        }
        var environment = root["env"] as? [String: Any] ?? [:]
        environment["xray.tun.fd"] = String(tunnelFD)
        root["env"] = environment

        let updatedConfiguration = try JSONSerialization.data(withJSONObject: root)
        guard let configurationJSON = String(data: updatedConfiguration, encoding: .utf8) else {
            throw NativeRuntimeError.invalidConfiguration("configuration is not UTF-8")
        }
        try Self.invoke(method: "runXrayFromJson", payload: ["configJSON": configurationJSON])
        isRunning = true
    }

    func stop() {
        guard isRunning else { return }
        try? Self.invoke(method: "stopXray", payload: [:])
        isRunning = false
    }

    private static func makeNetworkSettings(
        _ root: [String: Any]
    ) throws -> NEPacketTunnelNetworkSettings {
        guard let inbounds = root["inbounds"] as? [[String: Any]],
              let tunInbound = inbounds.first(where: { $0["protocol"] as? String == "tun" }),
              let rawSettings = tunInbound["settings"] as? [String: Any] else {
            throw NativeRuntimeError.invalidConfiguration("Xray requires a tun inbound")
        }
        guard let gateways = rawSettings["gateway"] as? [String], !gateways.isEmpty else {
            throw NativeRuntimeError.invalidConfiguration("Xray tun gateway is missing")
        }
        guard let dnsServers = rawSettings["dns"] as? [String],
              !dnsServers.isEmpty,
              dnsServers.allSatisfy({ IPv4Address($0) != nil || IPv6Address($0) != nil }) else {
            throw NativeRuntimeError.invalidConfiguration("Xray tun DNS is missing")
        }

        let settings = NEPacketTunnelNetworkSettings(tunnelRemoteAddress: "127.0.0.1")
        let mtu = rawSettings["mtu"] as? NSNumber ?? 1500
        guard mtu.intValue >= 1280, mtu.intValue <= 9000 else {
            throw NativeRuntimeError.invalidConfiguration("Xray tun MTU is outside 1280...9000")
        }
        settings.mtu = mtu
        settings.dnsSettings = NEDNSSettings(servers: dnsServers)

        let ipv4Gateways = try gateways.compactMap { try IPv4CIDR.parse($0) }
        guard !ipv4Gateways.isEmpty else {
            throw NativeRuntimeError.invalidConfiguration("Xray tun requires an IPv4 gateway")
        }
        let ipv4 = NEIPv4Settings(
            addresses: ipv4Gateways.map(\.address),
            subnetMasks: ipv4Gateways.map(\.mask)
        )
        ipv4.includedRoutes = [NEIPv4Route.default()]
        settings.ipv4Settings = ipv4

        let ipv6Gateways = try gateways.compactMap { try IPv6CIDR.parse($0) }
        guard !ipv6Gateways.isEmpty else {
            throw NativeRuntimeError.invalidConfiguration("Xray tun requires an IPv6 gateway")
        }
        let ipv6 = NEIPv6Settings(
            addresses: ipv6Gateways.map(\.address),
            networkPrefixLengths: ipv6Gateways.map { NSNumber(value: $0.prefix) }
        )
        ipv6.includedRoutes = [NEIPv6Route.default()]
        settings.ipv6Settings = ipv6
        return settings
    }

    private static func invoke(method: String, payload: [String: Any]) throws {
        let request = try JSONSerialization.data(withJSONObject: [
            "apiVersion": 1,
            "method": method,
            "payload": payload,
        ])
        guard let requestJSON = String(data: request, encoding: .utf8),
              let requestPointer = strdup(requestJSON) else {
            throw NativeRuntimeError.runtimeFailure("could not encode the Xray request")
        }
        defer { free(requestPointer) }
        guard let responsePointer = CGoInvoke(requestPointer) else {
            throw NativeRuntimeError.runtimeFailure("Xray returned no response")
        }
        defer { CGoFree(responsePointer) }

        let responseJSON = String(cString: responsePointer)
        guard let responseData = responseJSON.data(using: .utf8),
              let response = try JSONSerialization.jsonObject(with: responseData) as? [String: Any],
              let success = response["success"] as? Bool else {
            throw NativeRuntimeError.runtimeFailure("Xray returned an invalid response")
        }
        guard success else {
            throw NativeRuntimeError.runtimeFailure(response["error"] as? String ?? "unknown Xray error")
        }
    }
}

private enum DarwinTunnelFileDescriptor {
    static func current() -> Int32? {
        for fd in Int32(0)...Int32(1024) {
            var interfaceName = [CChar](repeating: 0, count: Int(IFNAMSIZ))
            var length = socklen_t(interfaceName.count)
            // SYSPROTO_CONTROL and UTUN_OPT_IFNAME are both 2. This is the
            // upstream Xray iOS discovery contract for NetworkExtension utun.
            let result = getsockopt(fd, 2, 2, &interfaceName, &length)
            if result == 0, String(cString: interfaceName).hasPrefix("utun") {
                return fd
            }
        }
        return nil
    }
}

private struct IPv4CIDR {
    let address: String
    let mask: String

    static func parse(_ value: String) throws -> IPv4CIDR? {
        let components = value.split(separator: "/", omittingEmptySubsequences: false)
        guard components.count == 2 else {
            throw NativeRuntimeError.invalidConfiguration("invalid CIDR \(value)")
        }
        let address = String(components[0])
        guard IPv4Address(address) != nil else { return nil }
        guard let prefix = Int(components[1]), (0...32).contains(prefix) else {
            throw NativeRuntimeError.invalidConfiguration("invalid IPv4 prefix in \(value)")
        }
        let bits = prefix == 0 ? UInt32(0) : UInt32.max << UInt32(32 - prefix)
        let mask = [24, 16, 8, 0].map { String((bits >> UInt32($0)) & 0xff) }.joined(separator: ".")
        return IPv4CIDR(address: address, mask: mask)
    }
}

private struct IPv6CIDR {
    let address: String
    let prefix: Int

    static func parse(_ value: String) throws -> IPv6CIDR? {
        let components = value.split(separator: "/", omittingEmptySubsequences: false)
        guard components.count == 2 else {
            throw NativeRuntimeError.invalidConfiguration("invalid CIDR \(value)")
        }
        let address = String(components[0])
        guard IPv6Address(address) != nil else { return nil }
        guard let prefix = Int(components[1]), (0...128).contains(prefix) else {
            throw NativeRuntimeError.invalidConfiguration("invalid IPv6 prefix in \(value)")
        }
        return IPv6CIDR(address: address, prefix: prefix)
    }
}
#endif

#if RAHROW_SING_BOX_RUNTIME_ADAPTER
final class SingBoxPacketTunnelRuntime: PacketTunnelEngineRuntime {
    private var commandServer: LibboxCommandServer?
    private var platformInterface: SingBoxPlatformInterface?

    func start(configuration: Data, provider: PacketTunnelProvider) throws {
        guard commandServer == nil else {
            throw NativeRuntimeError.runtimeFailure("sing-box is already running")
        }
        guard let configurationJSON = String(data: configuration, encoding: .utf8) else {
            throw NativeRuntimeError.invalidConfiguration("configuration is not UTF-8")
        }
        guard let root = try JSONSerialization.jsonObject(with: configuration) as? [String: Any],
              let inbounds = root["inbounds"] as? [[String: Any]],
              inbounds.contains(where: { $0["type"] as? String == "tun" }) else {
            throw NativeRuntimeError.invalidConfiguration("sing-box requires a tun inbound")
        }

        let baseURL = try Self.runtimeDirectory()
        let setupOptions = LibboxSetupOptions()
        setupOptions.basePath = baseURL.path
        setupOptions.workingPath = baseURL.appendingPathComponent("Working", isDirectory: true).path
        setupOptions.tempPath = baseURL.appendingPathComponent("Temp", isDirectory: true).path
        setupOptions.logMaxLines = 1000
        var setupError: NSError?
        LibboxSetup(setupOptions, &setupError)
        if let setupError {
            throw setupError
        }

        let platform = SingBoxPlatformInterface(provider: provider)
        var serverError: NSError?
        guard let server = LibboxNewCommandServer(platform, platform, &serverError) else {
            throw serverError ?? NativeRuntimeError.runtimeFailure("could not create the sing-box command server")
        }
        do {
            try server.start()
            try server.startOrReloadService(configurationJSON, options: LibboxOverrideOptions())
        } catch {
            server.close()
            platform.reset()
            throw error
        }
        platformInterface = platform
        commandServer = server
    }

    func stop() {
        try? commandServer?.closeService()
        commandServer?.close()
        commandServer = nil
        platformInterface?.reset()
        platformInterface = nil
    }

    private static func runtimeDirectory() throws -> URL {
        let root = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
            .appendingPathComponent("RahRowPacketTunnel", isDirectory: true)
        try FileManager.default.createDirectory(at: root, withIntermediateDirectories: true)
        return root
    }
}

private final class SingBoxPlatformInterface: NSObject,
    LibboxPlatformInterfaceProtocol,
    LibboxCommandServerHandlerProtocol
{
    private weak var provider: PacketTunnelProvider?
    private var networkMonitor: NWPathMonitor?

    init(provider: PacketTunnelProvider) {
        self.provider = provider
    }

    func openTun(_ options: LibboxTunOptionsProtocol?, ret0_: UnsafeMutablePointer<Int32>?) throws {
        guard let options, let ret0_, let provider else {
            throw NativeRuntimeError.runtimeFailure("sing-box did not provide TUN options")
        }
        guard options.getAutoRoute() else {
            throw NativeRuntimeError.invalidConfiguration("sing-box tun auto_route must be enabled")
        }

        let settings = NEPacketTunnelNetworkSettings(tunnelRemoteAddress: "127.0.0.1")
        settings.mtu = NSNumber(value: options.getMTU())
        let dnsServer = try options.getDNSServerAddress()
        settings.dnsSettings = NEDNSSettings(servers: [dnsServer.value])

        let ipv4Iterator = options.getInet4Address()!
        var ipv4Addresses: [String] = []
        var ipv4Masks: [String] = []
        while ipv4Iterator.hasNext() {
            let prefix = ipv4Iterator.next()!
            ipv4Addresses.append(prefix.address())
            ipv4Masks.append(prefix.mask())
        }
        guard !ipv4Addresses.isEmpty else {
            throw NativeRuntimeError.invalidConfiguration("sing-box tun requires an IPv4 address")
        }
        let ipv4 = NEIPv4Settings(addresses: ipv4Addresses, subnetMasks: ipv4Masks)
        ipv4.includedRoutes = [NEIPv4Route.default()]
        settings.ipv4Settings = ipv4

        let ipv6Iterator = options.getInet6Address()!
        var ipv6Addresses: [String] = []
        var ipv6Prefixes: [NSNumber] = []
        while ipv6Iterator.hasNext() {
            let prefix = ipv6Iterator.next()!
            ipv6Addresses.append(prefix.address())
            ipv6Prefixes.append(NSNumber(value: prefix.prefix()))
        }
        guard !ipv6Addresses.isEmpty else {
            throw NativeRuntimeError.invalidConfiguration("sing-box tun requires an IPv6 address")
        }
        let ipv6 = NEIPv6Settings(addresses: ipv6Addresses, networkPrefixLengths: ipv6Prefixes)
        ipv6.includedRoutes = [NEIPv6Route.default()]
        settings.ipv6Settings = ipv6

        try provider.applyLeakSafeNetworkSettings(settings)
        let fd = LibboxGetTunnelFileDescriptor()
        guard fd >= 0 else {
            throw NativeRuntimeError.missingTunnelFileDescriptor
        }
        ret0_.pointee = fd
    }

    func usePlatformAutoDetectControl() -> Bool { false }
    func autoDetectControl(_: Int32) throws {}
    func useProcFS() -> Bool { false }
    func underNetworkExtension() -> Bool { true }
    func includeAllNetworks() -> Bool { false }
    func clearDNSCache() {}
    func readWIFIState() -> LibboxWIFIState? { nil }
    func localDNSTransport() -> (any LibboxLocalDNSTransportProtocol)? { nil }
    func systemCertificates() -> (any LibboxStringIteratorProtocol)? { nil }
    func send(_: LibboxNotification?) throws {}

    func findConnectionOwner(
        _: Int32,
        sourceAddress _: String?,
        sourcePort _: Int32,
        destinationAddress _: String?,
        destinationPort _: Int32
    ) throws -> LibboxConnectionOwner {
        throw NativeRuntimeError.runtimeFailure("connection-owner lookup is unavailable on iOS")
    }

    func startDefaultInterfaceMonitor(_ listener: LibboxInterfaceUpdateListenerProtocol?) throws {
        guard let listener else { return }
        let monitor = NWPathMonitor()
        networkMonitor = monitor
        let ready = DispatchSemaphore(value: 0)
        var firstUpdate = true
        monitor.pathUpdateHandler = { path in
            if path.status == .satisfied, let interface = path.availableInterfaces.first {
                listener.updateDefaultInterface(
                    interface.name,
                    interfaceIndex: Int32(interface.index),
                    isExpensive: path.isExpensive,
                    isConstrained: path.isConstrained
                )
            } else {
                listener.updateDefaultInterface("", interfaceIndex: -1, isExpensive: false, isConstrained: false)
            }
            if firstUpdate {
                firstUpdate = false
                ready.signal()
            }
        }
        monitor.start(queue: DispatchQueue.global(qos: .utility))
        guard ready.wait(timeout: .now() + 10) == .success else {
            monitor.cancel()
            networkMonitor = nil
            throw NativeRuntimeError.runtimeFailure("default-interface discovery timed out")
        }
    }

    func closeDefaultInterfaceMonitor(_: LibboxInterfaceUpdateListenerProtocol?) throws {
        networkMonitor?.cancel()
        networkMonitor = nil
    }

    func getInterfaces() throws -> LibboxNetworkInterfaceIteratorProtocol {
        guard let path = networkMonitor?.currentPath, path.status == .satisfied else {
            return SingBoxNetworkInterfaceIterator([])
        }
        let interfaces = path.availableInterfaces.map { value -> LibboxNetworkInterface in
            let interface = LibboxNetworkInterface()
            interface.name = value.name
            interface.index = Int32(value.index)
            switch value.type {
            case .wifi: interface.type = LibboxInterfaceTypeWIFI
            case .cellular: interface.type = LibboxInterfaceTypeCellular
            case .wiredEthernet: interface.type = LibboxInterfaceTypeEthernet
            default: interface.type = LibboxInterfaceTypeOther
            }
            return interface
        }
        return SingBoxNetworkInterfaceIterator(interfaces)
    }

    func serviceStop() throws {
        throw NativeRuntimeError.runtimeFailure("runtime-requested stop must be handled by the provider lifecycle")
    }

    func serviceReload() throws {
        throw NativeRuntimeError.runtimeFailure("runtime reload requires an explicit disconnect and reconnect")
    }

    func getSystemProxyStatus() throws -> LibboxSystemProxyStatus {
        LibboxSystemProxyStatus()
    }

    func setSystemProxyEnabled(_ enabled: Bool) throws {
        if enabled {
            throw NativeRuntimeError.runtimeFailure("system proxy is not a VPN fallback")
        }
    }

    func writeDebugMessage(_: String?) {}

    func reset() {
        networkMonitor?.cancel()
        networkMonitor = nil
    }
}

private final class SingBoxNetworkInterfaceIterator: NSObject, LibboxNetworkInterfaceIteratorProtocol {
    private var iterator: IndexingIterator<[LibboxNetworkInterface]>
    private var nextValue: LibboxNetworkInterface?

    init(_ interfaces: [LibboxNetworkInterface]) {
        iterator = interfaces.makeIterator()
    }

    func hasNext() -> Bool {
        nextValue = iterator.next()
        return nextValue != nil
    }

    func next() -> LibboxNetworkInterface? {
        nextValue
    }
}
#endif
