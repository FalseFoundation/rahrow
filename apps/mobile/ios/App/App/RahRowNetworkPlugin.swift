import Capacitor
import CFNetwork
import Foundation

@objc(RahRowNetworkPlugin)
public final class RahRowNetworkPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RahRowNetworkPlugin"
    public let jsName = "RahRowNetwork"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "request", returnType: CAPPluginReturnPromise)
    ]

    @objc func request(_ call: CAPPluginCall) {
        do {
            let input = try RoutedHttpPolicy.requestInput(call)
            NativeRoutedHttpRequest(input: input, call: call).start()
        } catch {
            call.reject(error.localizedDescription, "routed_http_failed", error)
        }
    }
}

private struct RoutedHttpInput {
    let url: URL
    let proxyHost: String
    let proxyPort: Int
    let timeout: TimeInterval
    let maxBytes: Int
    let byteCountMode: Bool
}

private enum RoutedHttpPolicy {
    static let maxResponseBytes = 1024 * 1024
    static let maxTimeoutMilliseconds = 10_000
    static let endpoints: Set<String> = [
        "https://www.cloudflare.com/cdn-cgi/trace",
        "https://api64.ipify.org?format=json",
        "https://speed.cloudflare.com/__down?bytes=0",
        "https://speed.cloudflare.com/__down?bytes=1048576"
    ]

    static func requestInput(_ call: CAPPluginCall) throws -> RoutedHttpInput {
        guard let endpoint = call.getString("url"), endpoints.contains(endpoint),
              let url = URL(string: endpoint) else {
            throw RoutedHttpError.endpointNotAllowed
        }
        guard let value = call.getString("proxyUrl"),
              let components = URLComponents(string: value),
              components.scheme == "socks5",
              components.user == nil,
              components.password == nil,
              let host = components.host,
              host == "127.0.0.1" || host == "localhost" || host == "::1",
              let port = components.port,
              (1...65535).contains(port),
              components.path.isEmpty,
              components.query == nil,
              components.fragment == nil else {
            throw RoutedHttpError.invalidProxy
        }
        let timeoutMilliseconds = call.getInt("timeoutMs") ?? 8_000
        let maxBytes = call.getInt("maxBytes") ?? maxResponseBytes
        let responseMode = call.getString("responseMode") ?? "text"
        guard (1...maxTimeoutMilliseconds).contains(timeoutMilliseconds),
              (1...maxResponseBytes).contains(maxBytes),
              responseMode == "text" || responseMode == "byte-count" else {
            throw RoutedHttpError.invalidLimits
        }

        return RoutedHttpInput(
            url: url,
            proxyHost: host,
            proxyPort: port,
            timeout: TimeInterval(timeoutMilliseconds) / 1_000,
            maxBytes: maxBytes,
            byteCountMode: responseMode == "byte-count"
        )
    }
}

private final class NativeRoutedHttpRequest: NSObject, URLSessionDataDelegate, URLSessionTaskDelegate {
    private let input: RoutedHttpInput
    private let call: CAPPluginCall
    private var session: URLSession?
    private var body = Data()
    private var status = 0
    private var bytesRead = 0
    private var completed = false

    init(input: RoutedHttpInput, call: CAPPluginCall) {
        self.input = input
        self.call = call
    }

    func start() {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        configuration.urlCache = nil
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        configuration.timeoutIntervalForRequest = input.timeout
        configuration.timeoutIntervalForResource = input.timeout
        configuration.connectionProxyDictionary = [
            kCFNetworkProxiesSOCKSEnable as String: true,
            kCFNetworkProxiesSOCKSProxy as String: input.proxyHost,
            kCFNetworkProxiesSOCKSPort as String: input.proxyPort
        ]

        let session = URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
        self.session = session
        var request = URLRequest(url: input.url)
        request.httpMethod = "GET"
        request.setValue("text/plain, application/json", forHTTPHeaderField: "Accept")
        request.setValue("no-cache", forHTTPHeaderField: "Cache-Control")
        request.setValue("no-cache", forHTTPHeaderField: "Pragma")
        request.setValue("RahRow/0.0.0", forHTTPHeaderField: "User-Agent")
        session.dataTask(with: request).resume()
    }

    func urlSession(
        _ session: URLSession,
        task: URLSessionTask,
        willPerformHTTPRedirection response: HTTPURLResponse,
        newRequest request: URLRequest,
        completionHandler: @escaping (URLRequest?) -> Void
    ) {
        completionHandler(nil)
        finish(.failure(RoutedHttpError.redirectNotAllowed))
    }

    func urlSession(
        _ session: URLSession,
        dataTask: URLSessionDataTask,
        didReceive response: URLResponse,
        completionHandler: @escaping (URLSession.ResponseDisposition) -> Void
    ) {
        guard let response = response as? HTTPURLResponse else {
            completionHandler(.cancel)
            finish(.failure(RoutedHttpError.invalidResponse))
            return
        }
        if response.expectedContentLength > Int64(input.maxBytes) {
            completionHandler(.cancel)
            finish(.failure(RoutedHttpError.responseTooLarge))
            return
        }
        status = response.statusCode
        completionHandler(.allow)
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        guard !completed else { return }
        bytesRead += data.count
        guard bytesRead <= input.maxBytes else {
            dataTask.cancel()
            finish(.failure(RoutedHttpError.responseTooLarge))
            return
        }
        if !input.byteCountMode { body.append(data) }
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard !completed else { return }
        guard error == nil else {
            finish(.failure(RoutedHttpError.requestFailed))
            return
        }
        let text: String
        if input.byteCountMode {
            text = ""
        } else if let decoded = String(data: body, encoding: .utf8) {
            text = decoded
        } else {
            finish(.failure(RoutedHttpError.invalidUtf8))
            return
        }
        finish(.success(["status": status, "body": text, "bytesRead": bytesRead]))
    }

    private func finish(_ result: Result<[String: Any], Error>) {
        guard !completed else { return }
        completed = true
        session?.invalidateAndCancel()
        session = nil
        switch result {
        case .success(let value): call.resolve(value)
        case .failure(let error): call.reject(error.localizedDescription, "routed_http_failed", error)
        }
    }
}

private enum RoutedHttpError: LocalizedError {
    case endpointNotAllowed
    case invalidProxy
    case invalidLimits
    case redirectNotAllowed
    case invalidResponse
    case responseTooLarge
    case requestFailed
    case invalidUtf8

    var errorDescription: String? {
        switch self {
        case .endpointNotAllowed: return "Routed HTTP endpoint is not allowlisted"
        case .invalidProxy: return "Routed HTTP requires a credential-free loopback SOCKS5 URL"
        case .invalidLimits: return "Routed HTTP limits are invalid"
        case .redirectNotAllowed: return "Routed HTTP redirects are not allowed"
        case .invalidResponse: return "Routed HTTP response is invalid"
        case .responseTooLarge: return "Routed HTTP response is too large"
        case .requestFailed: return "Native routed HTTP request failed"
        case .invalidUtf8: return "Routed HTTP response is not valid UTF-8"
        }
    }
}
