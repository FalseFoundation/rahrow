import Capacitor
import Darwin
import Foundation

@objc(RahRowSubscriptionPlugin)
public final class RahRowSubscriptionPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "RahRowSubscriptionPlugin"
    public let jsName = "RahRowSubscription"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "fetch", returnType: CAPPluginReturnPromise)
    ]

    @objc func fetch(_ call: CAPPluginCall) {
        do {
            let input = try NativeSubscriptionFetchPolicy.requestInput(call)
            NativeSubscriptionRequest(input: input, call: call).start()
        } catch {
            call.reject(error.localizedDescription, "subscription_fetch_failed", error)
        }
    }
}

private struct NativeSubscriptionRequestInput {
    let url: URL
    let authorization: String?
}

private enum NativeSubscriptionFetchPolicy {
    static let maxResponseBytes = 8 * 1024 * 1024
    static let maxHeaderBytes = 4096
    static let maxAuthorizationBytes = 8192

    static func requestInput(_ call: CAPPluginCall) throws -> NativeSubscriptionRequestInput {
        guard let value = call.getString("url"),
              let url = URL(string: value.trimmingCharacters(in: .whitespacesAndNewlines)) else {
            throw SubscriptionFetchError.invalidUrl
        }
        guard url.scheme?.lowercased() == "https" else {
            throw SubscriptionFetchError.httpsRequired
        }
        guard url.user == nil, url.password == nil else {
            throw SubscriptionFetchError.credentialsInUrl
        }
        guard url.fragment == nil else {
            throw SubscriptionFetchError.fragmentNotAllowed
        }
        guard let host = url.host, isPublicHostLiteralOrName(host) else {
            throw SubscriptionFetchError.publicHostRequired
        }

        let authorization = call.getString("authorization")
        if let authorization,
           authorization.isEmpty ||
            authorization.utf8.count > maxAuthorizationBytes ||
            authorization.contains("\r") ||
            authorization.contains("\n") {
            throw SubscriptionFetchError.invalidCredential
        }
        return NativeSubscriptionRequestInput(url: url, authorization: authorization)
    }

    static func header(_ response: HTTPURLResponse, name: String) -> String? {
        guard let value = response.value(forHTTPHeaderField: name),
              value.utf8.count <= maxHeaderBytes else { return nil }
        return value
    }

    private static func isPublicHostLiteralOrName(_ input: String) -> Bool {
        let host = input.lowercased()
        if host == "localhost" || host.hasSuffix(".localhost") || host.hasSuffix(".local") {
            return false
        }

        var ipv4 = in_addr()
        if inet_pton(AF_INET, host, &ipv4) == 1 {
            let value = UInt32(bigEndian: ipv4.s_addr)
            let first = Int((value >> 24) & 0xff)
            let second = Int((value >> 16) & 0xff)
            return !(first == 0 ||
                     first == 10 ||
                     first == 127 ||
                     (first == 100 && (64...127).contains(second)) ||
                     (first == 169 && second == 254) ||
                     (first == 172 && (16...31).contains(second)) ||
                     (first == 192 && second == 168) ||
                     first >= 224)
        }

        var ipv6 = in6_addr()
        if inet_pton(AF_INET6, host, &ipv6) == 1 {
            let bytes = withUnsafeBytes(of: &ipv6) { Array($0) }
            let isUnspecified = bytes.allSatisfy { $0 == 0 }
            let isLoopback = bytes.dropLast().allSatisfy { $0 == 0 } && bytes.last == 1
            let isUniqueLocal = (bytes[0] & 0xfe) == 0xfc
            let isLinkLocal = bytes[0] == 0xfe && (bytes[1] & 0xc0) == 0x80
            let isMulticast = bytes[0] == 0xff
            return !(isUnspecified || isLoopback || isUniqueLocal || isLinkLocal || isMulticast)
        }

        return true
    }
}

private final class NativeSubscriptionRequest: NSObject, URLSessionDataDelegate, URLSessionTaskDelegate {
    private let input: NativeSubscriptionRequestInput
    private let call: CAPPluginCall
    private var session: URLSession?
    private var body = Data()
    private var headers: [String: String] = [:]
    private var completed = false

    init(input: NativeSubscriptionRequestInput, call: CAPPluginCall) {
        self.input = input
        self.call = call
    }

    func start() {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
        configuration.timeoutIntervalForRequest = 30
        configuration.timeoutIntervalForResource = 30

        let session = URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
        self.session = session
        var request = URLRequest(url: input.url)
        request.httpMethod = "GET"
        request.setValue("RahRow/0.0.0", forHTTPHeaderField: "User-Agent")
        if let authorization = input.authorization {
            request.setValue(authorization, forHTTPHeaderField: "Authorization")
        }
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
        finish(.failure(SubscriptionFetchError.redirectNotAllowed))
    }

    func urlSession(
        _ session: URLSession,
        dataTask: URLSessionDataTask,
        didReceive response: URLResponse,
        completionHandler: @escaping (URLSession.ResponseDisposition) -> Void
    ) {
        guard let response = response as? HTTPURLResponse else {
            completionHandler(.cancel)
            finish(.failure(SubscriptionFetchError.invalidResponse))
            return
        }
        guard (200...299).contains(response.statusCode) else {
            completionHandler(.cancel)
            finish(.failure(SubscriptionFetchError.httpStatus(response.statusCode)))
            return
        }
        if response.expectedContentLength > NativeSubscriptionFetchPolicy.maxResponseBytes {
            completionHandler(.cancel)
            finish(.failure(SubscriptionFetchError.responseTooLarge))
            return
        }

        captureHeader(response, source: "Subscription-Userinfo", output: "subscriptionUserinfo")
        captureHeader(response, source: "Profile-Update-Interval", output: "profileUpdateInterval")
        captureHeader(response, source: "Support-Url", output: "supportUrl")
        captureHeader(response, source: "Profile-Web-Page-Url", output: "profileWebPageUrl")
        completionHandler(.allow)
    }

    func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        guard !completed else { return }
        guard body.count + data.count <= NativeSubscriptionFetchPolicy.maxResponseBytes else {
            dataTask.cancel()
            finish(.failure(SubscriptionFetchError.responseTooLarge))
            return
        }
        body.append(data)
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard !completed else { return }
        if error != nil {
            finish(.failure(SubscriptionFetchError.requestFailed))
            return
        }
        guard let text = String(data: body, encoding: .utf8) else {
            finish(.failure(SubscriptionFetchError.invalidUtf8))
            return
        }
        var result = headers
        result["body"] = text
        finish(.success(result))
    }

    private func captureHeader(_ response: HTTPURLResponse, source: String, output: String) {
        if let value = NativeSubscriptionFetchPolicy.header(response, name: source) {
            headers[output] = value
        }
    }

    private func finish(_ result: Result<[String: String], Error>) {
        guard !completed else { return }
        completed = true
        session?.finishTasksAndInvalidate()
        session = nil
        switch result {
        case .success(let value):
            call.resolve(value)
        case .failure(let error):
            call.reject(error.localizedDescription, "subscription_fetch_failed", error)
        }
    }
}

private enum SubscriptionFetchError: LocalizedError {
    case invalidUrl
    case httpsRequired
    case credentialsInUrl
    case fragmentNotAllowed
    case publicHostRequired
    case invalidCredential
    case redirectNotAllowed
    case invalidResponse
    case httpStatus(Int)
    case responseTooLarge
    case requestFailed
    case invalidUtf8

    var errorDescription: String? {
        switch self {
        case .invalidUrl: return "Invalid subscription URL"
        case .httpsRequired: return "Subscription URLs must use HTTPS"
        case .credentialsInUrl: return "Subscription URL credentials are not allowed"
        case .fragmentNotAllowed: return "Subscription URLs must not contain fragments"
        case .publicHostRequired: return "Subscription URLs must target a public host"
        case .invalidCredential: return "Subscription credential is invalid"
        case .redirectNotAllowed: return "Subscription redirects are not allowed"
        case .invalidResponse: return "Subscription response is invalid"
        case .httpStatus(let status): return "Subscription request returned HTTP \(status)"
        case .responseTooLarge: return "Subscription response is too large"
        case .requestFailed: return "Native subscription request failed"
        case .invalidUtf8: return "Subscription response is not valid UTF-8"
        }
    }
}
