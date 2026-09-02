import AVFoundation
import Capacitor
import UIKit

@objc(RahRowQrPlugin)
public final class RahRowQrPlugin: CAPPlugin, CAPBridgedPlugin, AVCaptureMetadataOutputObjectsDelegate {
    public let identifier = "RahRowQrPlugin"
    public let jsName = "RahRowQr"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "startPreview", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopPreview", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scan", returnType: CAPPluginReturnPromise)
    ]

    private let captureQueue = DispatchQueue(label: "foundation.false.rahrow.qr-camera")
    private var session: AVCaptureSession?
    private var previewView: UIView?
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var pendingPreviewStart: CAPPluginCall?
    private var pendingScan: CAPPluginCall?
    private var previewGeneration = 0
    private var sessionObservers: [NSObjectProtocol] = []

    @objc override public func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(pauseCapture),
            name: UIApplication.didEnterBackgroundNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(resumeCapture),
            name: UIApplication.willEnterForegroundNotification,
            object: nil
        )
    }

    deinit {
        removeSessionObservers()
        NotificationCenter.default.removeObserver(self)
    }

    @objc func startPreview(_ call: CAPPluginCall) {
        guard let frame = previewFrame(call) else {
            call.reject("QR preview requires a visible camera rectangle", "invalid_config")
            return
        }
        DispatchQueue.main.async {
            self.rejectPendingPreviewStart("QR preview request was superseded", code: "invalid_config")
            let generation = self.previewGeneration + 1
            self.previewGeneration = generation
            self.authorizeCamera { [weak self] authorized in
                guard let self else {
                    call.reject("QR preview is unavailable", "unsupported_capability")
                    return
                }
                DispatchQueue.main.async {
                    guard generation == self.previewGeneration else {
                        call.reject("QR preview request was stopped", "invalid_config")
                        return
                    }
                    guard authorized else {
                        call.reject("Camera permission is required to preview QR codes", "unsupported_capability")
                        return
                    }
                    do {
                        try self.showPreview(frame: frame, startCall: call)
                    } catch {
                        call.reject(error.localizedDescription, "unsupported_capability", error)
                    }
                }
            }
        }
    }

    @objc func stopPreview(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.previewGeneration += 1
            self.removePreview()
            call.resolve()
        }
    }

    @objc func scan(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            guard self.previewLayer != nil, self.session?.isRunning == true else {
                call.reject("Open the QR camera preview before scanning", "unsupported_capability")
                return
            }
            guard self.pendingScan == nil else {
                call.reject("A QR scan is already pending", "invalid_config")
                return
            }
            self.pendingScan = call
        }
    }

    public func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        guard let value = metadataObjects
            .compactMap({ ($0 as? AVMetadataMachineReadableCodeObject)?.stringValue?.trimmingCharacters(in: .whitespacesAndNewlines) })
            .first(where: { !$0.isEmpty }) else { return }

        DispatchQueue.main.async {
            guard let call = self.pendingScan else { return }
            self.pendingScan = nil
            call.resolve(["value": value])
        }
    }

    private func previewFrame(_ call: CAPPluginCall) -> CGRect? {
        guard let x = call.getDouble("x"),
              let y = call.getDouble("y"),
              let width = call.getDouble("width"),
              let height = call.getDouble("height"),
              width > 0,
              height > 0 else { return nil }
        return CGRect(x: x, y: y, width: width, height: height)
    }

    private func authorizeCamera(completion: @escaping (Bool) -> Void) {
        switch AVCaptureDevice.authorizationStatus(for: .video) {
        case .authorized:
            completion(true)
        case .notDetermined:
            AVCaptureDevice.requestAccess(for: .video, completionHandler: completion)
        default:
            completion(false)
        }
    }

    private func showPreview(frame: CGRect, startCall: CAPPluginCall) throws {
        if let previewView, let previewLayer {
            previewView.frame = frame
            previewLayer.frame = previewView.bounds
            if session?.isRunning == true {
                startCall.resolve()
            } else {
                rejectPendingPreviewStart("QR preview request was superseded", code: "invalid_config")
                pendingPreviewStart = startCall
                let activeSession = session
                captureQueue.async { activeSession?.startRunning() }
            }
            return
        }
        guard let hostView = bridge?.viewController?.view,
              let camera = AVCaptureDevice.default(for: .video) else {
            throw QrCameraError.unavailable
        }

        let input = try AVCaptureDeviceInput(device: camera)
        let captureSession = AVCaptureSession()
        let output = AVCaptureMetadataOutput()
        guard captureSession.canAddInput(input), captureSession.canAddOutput(output) else {
            throw QrCameraError.unavailable
        }
        captureSession.addInput(input)
        captureSession.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: captureQueue)
        output.metadataObjectTypes = [.qr]

        let container = UIView(frame: frame)
        container.backgroundColor = .black
        container.clipsToBounds = true
        container.layer.cornerRadius = 16
        let layer = AVCaptureVideoPreviewLayer(session: captureSession)
        layer.frame = container.bounds
        layer.videoGravity = .resizeAspectFill
        container.layer.addSublayer(layer)
        hostView.addSubview(container)

        session = captureSession
        previewView = container
        previewLayer = layer
        pendingPreviewStart = startCall
        observeSession(captureSession)
        captureQueue.async { captureSession.startRunning() }
    }

    private func removePreview(
        rejectionMessage: String = "QR preview stopped",
        code: String = "invalid_config",
        error: Error? = nil
    ) {
        rejectPendingPreviewStart(rejectionMessage, code: code, error: error)
        rejectPendingScan(rejectionMessage, code: code, error: error)
        removeSessionObservers()
        let oldSession = session
        session = nil
        previewLayer?.removeFromSuperlayer()
        previewLayer = nil
        previewView?.removeFromSuperview()
        previewView = nil
        captureQueue.async { oldSession?.stopRunning() }
    }

    @objc private func pauseCapture() {
        DispatchQueue.main.async {
            self.rejectPendingPreviewStart("QR camera paused", code: "unsupported_capability")
            self.rejectPendingScan("QR camera paused", code: "unsupported_capability")
            let activeSession = self.session
            self.captureQueue.async { activeSession?.stopRunning() }
        }
    }

    @objc private func resumeCapture() {
        DispatchQueue.main.async {
            let activeSession = self.session
            self.captureQueue.async {
                if let activeSession, !activeSession.isRunning {
                    activeSession.startRunning()
                }
            }
        }
    }

    private func observeSession(_ captureSession: AVCaptureSession) {
        removeSessionObservers()
        let center = NotificationCenter.default
        sessionObservers = [
            center.addObserver(
                forName: AVCaptureSession.didStartRunningNotification,
                object: captureSession,
                queue: .main
            ) { [weak self, weak captureSession] _ in
                guard let self, let captureSession, captureSession === self.session else { return }
                let call = self.pendingPreviewStart
                self.pendingPreviewStart = nil
                call?.resolve()
            },
            center.addObserver(
                forName: AVCaptureSession.runtimeErrorNotification,
                object: captureSession,
                queue: .main
            ) { [weak self, weak captureSession] notification in
                guard let self, let captureSession, captureSession === self.session else { return }
                let error = notification.userInfo?[AVCaptureSessionErrorKey] as? Error
                self.removePreview(
                    rejectionMessage: "QR camera stopped unexpectedly",
                    code: "unsupported_capability",
                    error: error
                )
            },
            center.addObserver(
                forName: AVCaptureSession.wasInterruptedNotification,
                object: captureSession,
                queue: .main
            ) { [weak self, weak captureSession] _ in
                guard let self, let captureSession, captureSession === self.session else { return }
                self.removePreview(
                    rejectionMessage: "QR camera was interrupted",
                    code: "unsupported_capability"
                )
            }
        ]
    }

    private func removeSessionObservers() {
        let center = NotificationCenter.default
        for observer in sessionObservers {
            center.removeObserver(observer)
        }
        sessionObservers.removeAll()
    }

    private func rejectPendingPreviewStart(_ message: String, code: String, error: Error? = nil) {
        let call = pendingPreviewStart
        pendingPreviewStart = nil
        call?.reject(message, code, error)
    }

    private func rejectPendingScan(_ message: String, code: String, error: Error? = nil) {
        let call = pendingScan
        pendingScan = nil
        call?.reject(message, code, error)
    }
}

private enum QrCameraError: LocalizedError {
    case unavailable

    var errorDescription: String? {
        "A camera capable of scanning QR codes is unavailable"
    }
}
