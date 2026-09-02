import Capacitor

final class RahRowBridgeViewController: CAPBridgeViewController {
	override func viewDidLoad() {
		super.viewDidLoad()
		view.backgroundColor = .systemBackground
		webView?.isOpaque = false
	}

    override func capacitorDidLoad() {
        bridge?.registerPluginType(RahRowVpnPlugin.self)
        bridge?.registerPluginType(RahRowQrPlugin.self)
        bridge?.registerPluginType(RahRowSubscriptionPlugin.self)
        bridge?.registerPluginType(RahRowNetworkPlugin.self)
    }
}
