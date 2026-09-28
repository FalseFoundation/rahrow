import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const mobileRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')
const androidApp = join(mobileRoot, 'android/app/src/main')
const javaRoot = join(androidApp, 'java/foundation/false/rahrow')
const manifestPath = join(androidApp, 'AndroidManifest.xml')
const vpnPluginPath = join(javaRoot, 'RahRowVpnPlugin.kt')
const vpnServicePath = join(javaRoot, 'RahRowVpnService.kt')
const hevTunnelPath = join(javaRoot, 'HevSocks5Tunnel.kt')
const engineProviderPath = join(javaRoot, 'NativeEngineProvider.kt')
const xrayProviderPath = join(javaRoot, 'XrayNativeEngineProvider.kt')
const xrayBridgePath = join(androidApp, 'java/libXray/LibXray.java')
const singBoxPlatformPath = join(javaRoot, 'SingBoxPlatformInterface.kt')
const processLockPath = join(javaRoot, 'VpnProcessLock.kt')
const failureBoundaryPath = join(javaRoot, 'NativeVpnFailureBoundary.kt')
const androidBuildPath = join(mobileRoot, 'android/app/build.gradle')
const hevBuildScriptPath = join(mobileRoot, 'scripts/build-hev-tunnel.mjs')
const networkIdentityPath = join(javaRoot, 'NetworkIdentity.kt')
const qrPluginPath = join(javaRoot, 'RahRowQrPlugin.kt')
const qrActivityPath = join(javaRoot, 'QrScanActivity.kt')
const qrPreviewPath = join(javaRoot, 'QrCameraPreviewView.kt')
const qrDecoderPath = join(javaRoot, 'QrFrameDecoder.kt')
const iosApp = join(mobileRoot, 'ios/App/App')
const iosProjectPath = join(mobileRoot, 'ios/App/App.xcodeproj/project.pbxproj')
const iosPluginPath = join(iosApp, 'RahRowVpnPlugin.swift')
const iosQrPluginPath = join(iosApp, 'RahRowQrPlugin.swift')
const subscriptionPluginPath = join(javaRoot, 'RahRowSubscriptionPlugin.kt')
const subscriptionPolicyPath = join(javaRoot, 'SubscriptionFetchPolicy.kt')
const routedHttpPluginPath = join(javaRoot, 'RahRowNetworkPlugin.kt')
const routedHttpPolicyPath = join(javaRoot, 'RoutedHttpPolicy.kt')
const iosSubscriptionPluginPath = join(iosApp, 'RahRowSubscriptionPlugin.swift')
const iosRoutedHttpPluginPath = join(iosApp, 'RahRowNetworkPlugin.swift')
const iosBridgePath = join(iosApp, 'RahRowBridgeViewController.swift')
const iosInfoPath = join(iosApp, 'Info.plist')
const iosAppEntitlementsPath = join(iosApp, 'App.entitlements')
const iosPacketTunnelEntitlementsPath = join(
	mobileRoot,
	'ios/App/PacketTunnel/PacketTunnel.entitlements',
)
const shareLinkSchemes = ['vless://', 'vmess://', 'trojan://'] as const

function read(path: string): string {
	return readFileSync(path, 'utf8')
}

function kotlinSources(): string[] {
	return readdirSync(javaRoot)
		.filter((name) => name.endsWith('.kt'))
		.map((name) => read(join(javaRoot, name)))
}

describe('Android native plugin contract', () => {
	it('routes bounded observation requests through an explicit Android SOCKS proxy', () => {
		const plugin = read(routedHttpPluginPath)
		const policy = read(routedHttpPolicyPath)

		expect(plugin).toContain('@CapacitorPlugin(name = "RahRowNetwork")')
		expect(plugin).toContain('openConnection(proxy)')
		expect(plugin).toContain('instanceFollowRedirects = false')
		expect(plugin).toContain('useCaches = false')
		expect(plugin).toContain('Routed HTTP response is too large')
		expect(policy).toContain('Proxy.Type.SOCKS')
		expect(policy).toContain('InetSocketAddress.createUnresolved')
		expect(policy).toContain('uri.rawUserInfo == null')
		expect(policy).toContain('uri.host == "127.0.0.1"')
	})

	it('routes bounded observation requests through an ephemeral iOS SOCKS session', () => {
		const plugin = read(iosRoutedHttpPluginPath)
		const bridge = read(iosBridgePath)

		expect(plugin).toContain('URLSessionConfiguration.ephemeral')
		expect(plugin).toContain('configuration.connectionProxyDictionary')
		expect(plugin).toContain('kCFNetworkProxiesSOCKSEnable')
		expect(plugin).toContain('components.user == nil')
		expect(plugin).toContain('components.password == nil')
		expect(plugin).toContain('completionHandler(nil)')
		expect(plugin).toContain('configuration.urlCache = nil')
		expect(bridge).toContain('registerPluginType(RahRowNetworkPlugin.self)')
	})

	it('runs the bundled sing-box runtime through an Android VpnService platform adapter', () => {
		expect(existsSync(vpnPluginPath)).toBe(true)
		expect(existsSync(vpnServicePath)).toBe(true)
		expect(existsSync(engineProviderPath)).toBe(true)
		expect(existsSync(singBoxPlatformPath)).toBe(true)
		expect(existsSync(manifestPath)).toBe(true)

		const plugin = read(vpnPluginPath)
		const service = read(vpnServicePath)
		const provider = read(engineProviderPath)
		const platform = read(singBoxPlatformPath)
		const manifest = read(manifestPath)

		expect(plugin).toContain('@CapacitorPlugin(')
		expect(plugin).toContain('name = "RahRowVpn"')
		expect(plugin).toContain('fun connect(')
		expect(plugin).toContain('fun disconnect(')
		expect(plugin).toContain('fun status(')
		expect(plugin).toContain('isVpnProcessRunning')
		expect(plugin).toContain('fun diagnostics(')
		expect(plugin).toContain('fun probe(')
		expect(plugin).toContain('fun networkIdentity(')
		expect(plugin).toContain(
			'JSONArray(AndroidNetworkIdentity.snapshot(context))',
		)
		expect(read(networkIdentityPath)).toContain('activeNetwork')
		expect(read(networkIdentityPath)).toContain('NET_CAPABILITY_NOT_VPN')
		expect(read(networkIdentityPath)).toContain('if (byInterface.size != 1)')
		expect(service).toContain('class XrayVpnService : RahRowVpnService()')
		expect(service).toContain('class SingBoxVpnService : RahRowVpnService()')
		expect(provider).toContain('CommandServer')
		expect(provider).toContain('startOrReloadService')
		expect(provider).toContain('libbox.so')
		expect(provider).not.toContain('rahrow_sing_box')
		expect(provider).not.toContain('rahrow_xray')
		expect(platform).toContain('override fun openTun(')
		expect(platform).toContain('Builder()')
		expect(platform).toContain('service.protect(fd)')
		expect(manifest).toContain('android.net.VpnService')
		expect(manifest).toContain('android.permission.BIND_VPN_SERVICE')
		expect(manifest).toContain('android.permission.INTERNET')
		expect(manifest).toContain('android.permission.ACCESS_NETWORK_STATE')
		expect(manifest).toContain('android:screenOrientation="portrait"')
		expect(manifest).toContain('android:process=":vpn_xray"')
		expect(manifest).toContain('android:process=":vpn_sing_box"')
	})

	it('wires the pinned HEV AAR to the dedicated Android JNI bridge', () => {
		expect(existsSync(hevTunnelPath)).toBe(true)
		expect(existsSync(hevBuildScriptPath)).toBe(true)

		const tunnel = read(hevTunnelPath)
		const service = read(vpnServicePath)
		const plugin = read(vpnPluginPath)
		const build = read(androidBuildPath)
		const buildScript = read(hevBuildScriptPath)

		expect(tunnel).toContain('internal object HevSocks5TunnelNative')
		expect(tunnel).toContain('System.loadLibrary("hev-socks5-tunnel")')
		expect(tunnel).toContain('TProxyStartService(config.absolutePath, tunnel.fd)')
		expect(tunnel).toContain('TProxyStopService()')
		expect(tunnel).toContain('TProxyGetStats(): LongArray')
		expect(tunnel).toContain('addDisallowedApplication(service.packageName)')
		expect(tunnel).toContain('address: 127.0.0.1')
		expect(service).toContain(
			'HevSocks5Tunnel(this, socksPort).also { it.start() }',
		)
		expect(service).toContain('currentHevTunnel?.close()')
		expect(plugin).toContain('HevSocks5Tunnel.isBundled(context)')
		expect(plugin).toContain('.put("hev-socks5-tunnel", hevBundled)')
		expect(build).toContain("file('libs/hev-socks5-tunnel.aar')")
		expect(build).toContain('rahrowExtractedRuntimeAars')
		expect(buildScript).toContain(
			'-DPKGNAME=foundation/falsefoundation/rahrow -DCLSNAME=HevSocks5TunnelNative',
		)
		expect(buildScript).toContain("join(destination, 'libhev-socks5-tunnel.so')")
	})

	it('requests the system VPN consent before notification access at activation', () => {
		const plugin = read(vpnPluginPath)
		const manifest = read(manifestPath)

		expect(manifest).toContain('android.permission.POST_NOTIFICATIONS')
		expect(plugin).toContain('Manifest.permission.POST_NOTIFICATIONS')
		expect(plugin).toContain('alias = "notifications"')
		expect(plugin).toContain('VpnService.prepare(')
		expect(plugin).toContain('continueVpnPreparation(call)')
		expect(plugin).toContain('maybeRequestNotificationsThenStart(call)')
		expect(plugin).toContain('notificationPermissionHandled')
		// VPN consent must run before the optional notification prompt.
		expect(plugin.indexOf('continueVpnPreparation(call)')).toBeLessThan(
			plugin.indexOf('maybeRequestNotificationsThenStart(call)'),
		)
	})

	it('keeps an active Android tunnel owned by its foreground service after the app is backgrounded', () => {
		const service = read(vpnServicePath)

		expect(service).toContain('startForegroundNotification()')
		expect(service).toContain(
			'return if (started) START_REDELIVER_INTENT else START_NOT_STICKY',
		)
		expect(service).toContain(
			'ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)',
		)
	})

	it('runs the bundled Xray runtime against the Android-owned TUN descriptor', () => {
		expect(existsSync(xrayProviderPath)).toBe(true)

		const provider = read(engineProviderPath)
		const xray = read(xrayProviderPath)
		const build = read(androidBuildPath)

		expect(provider).toContain('XrayNativeEngineProvider(service)')
		expect(provider).toContain('libgojni.so')
		expect(xray).toContain('service.Builder()')
		expect(xray).toContain('addDisallowedApplication(service.packageName)')
		expect(xray).toContain('"xray.tun.fd"')
		expect(xray).toContain('"runXrayFromJson"')
		expect(xray).toContain('"stopXray"')
		expect(xray).toContain('InMemoryDexClassLoader')
		expect(xray).toContain('rahrow-libxray.dex')
		expect(xray).toContain('expandGeoipPrivateRules')
		expect(xray).toContain('geoip:private')
		expect(xray).toContain('tun?.close()')
		expect(build).toContain('packageRahrowXrayApi')
		expect(build).toContain('rahrow-libxray.dex')
		expect(build).toContain('rahrowXrayAssetsDir')
		expect(existsSync(xrayBridgePath)).toBe(false)
	})

	it('keeps VLESS, VMess, and Trojan parsing out of Kotlin', () => {
		const sources = kotlinSources().join('\n')

		for (const scheme of shareLinkSchemes) {
			expect(sources).not.toContain(scheme)
		}

		expect(sources).toContain('engineConfig')
		expect(read(vpnPluginPath)).not.toContain('ProcessBuilder')
	})

	it('fails closed when a native provider is absent', () => {
		const plugin = read(vpnPluginPath)
		const service = read(vpnServicePath)

		expect(plugin).toContain('missing-native-plugin')
		expect(plugin).toContain('NativeEngineProvider.availability')
		expect(service).not.toContain('SocksTunGateway')
	})

	it('excludes concurrent providers and closes the libbox service and Android TUN', () => {
		const plugin = read(vpnPluginPath)
		const service = read(vpnServicePath)
		const provider = read(engineProviderPath)
		const platform = read(singBoxPlatformPath)
		const failureBoundary = read(failureBoundaryPath)

		expect(existsSync(processLockPath)).toBe(true)
		expect(existsSync(failureBoundaryPath)).toBe(true)
		expect(service).toContain('VpnProcessLock.acquire')
		expect(service).toContain('currentProcessLock?.close()')
		expect(service).toContain('runNativeVpnStart')
		expect(service).toContain('runNativeVpnCleanup')
		expect(failureBoundary).toContain('catch (error: Throwable)')
		expect(failureBoundary).toContain('error.rethrowIfFatal()')
		expect(provider).toContain('closeService()')
		expect(platform).toContain('tun?.close()')
		expect(plugin).toContain('awaitTunnelStarted')
		expect(plugin).toContain('Native VPN provider start timed out')
		expect(plugin).toContain('NativeVpnStatus("disconnecting"')
		expect(plugin).toContain('RahRowVpnService.ACTION_STOP')
		expect(plugin).toContain('context.startService(')
		expect(plugin).toContain('.put("engineId", status.engineId)')
		expect(plugin).toContain('awaitTunnelStopped')
		expect(plugin).toContain('nativeVpnStopFailure(current, message)')
		expect(plugin).toContain('stop target is unavailable')
		expect(plugin).toContain('stop timed out')
		expect(plugin).toContain('stopTunnelService(status.engineId)')
		expect(plugin).not.toContain(
			'VpnStatusStore(context).write(NativeVpnStatus("disconnected"))',
		)
	})

	it('contains the iOS NETunnelProviderManager control plane while entitlement remains fail-closed', () => {
		expect(existsSync(iosPluginPath)).toBe(true)
		expect(existsSync(iosBridgePath)).toBe(true)

		const plugin = read(iosPluginPath)
		const bridge = read(iosBridgePath)
		const appEntitlements = read(iosAppEntitlementsPath)
		const packetTunnelEntitlements = read(iosPacketTunnelEntitlementsPath)

		expect(plugin).toContain('NETunnelProviderManager')
		expect(plugin).toContain('providerBundleIdentifier')
		expect(plugin).toContain('missing-vpn-entitlement')
		expect(plugin).toContain('startVPNTunnel')
		expect(plugin).toContain('awaitTunnelStarted')
		expect(plugin).toContain('VPN provider start timed out')
		expect(plugin).toContain('stopVPNTunnel')
		expect(plugin).toContain('awaitTunnelStopped')
		expect(plugin).toContain('activeConnectionInBackground')
		expect(plugin).toContain('periodicSmartConnectInBackground')
		expect(plugin).toContain('VPN provider stop timed out')
		expect(plugin).toContain('CAPPluginMethod(name: "networkIdentity"')
		expect(plugin).toContain('NWPathMonitor')
		expect(plugin).toContain('interfaceNames.count == 1')
		expect(bridge).toContain('registerPluginType(RahRowVpnPlugin.self)')
		for (const entitlements of [appEntitlements, packetTunnelEntitlements]) {
			expect(entitlements).toContain(
				'com.apple.developer.networking.networkextension',
			)
			expect(entitlements).toContain('packet-tunnel-provider')
		}
	})

	it('implements the Android inline QR preview and routes decoded text through scan', () => {
		expect(existsSync(qrPluginPath)).toBe(true)
		expect(existsSync(qrActivityPath)).toBe(true)
		expect(existsSync(qrPreviewPath)).toBe(true)
		expect(existsSync(qrDecoderPath)).toBe(true)

		const plugin = read(qrPluginPath)
		const activity = read(qrActivityPath)
		const preview = read(qrPreviewPath)
		const decoder = read(qrDecoderPath)
		const manifest = read(manifestPath)

		expect(plugin).toContain('@CapacitorPlugin(name = "RahRowQr"')
		expect(plugin).toContain('fun startPreview(')
		expect(plugin).toContain('fun stopPreview(')
		expect(plugin).toContain('fun scan(')
		expect(plugin).toContain('activePreview.requestDecode')
		expect(plugin).toContain('PackageManager.FEATURE_CAMERA_ANY')
		expect(plugin).toContain('onReady = {')
		expect(plugin).toContain('pendingScan?.reject(message')
		expect(plugin).toContain('override fun handleOnPause()')
		expect(plugin).toContain('override fun handleOnResume()')
		expect(plugin).toContain('value')
		expect(activity).toContain('QrCameraPreviewView')
		expect(preview).toContain('CameraDevice.TEMPLATE_PREVIEW')
		expect(preview).toContain('y.rowStride')
		expect(preview).toContain('y.pixelStride')
		expect(preview).toContain('QrFrameDecoder.decode')
		expect(preview).toContain('onConfigureFailed')
		expect(preview).toContain('failCamera(')
		expect(preview).not.toContain('?: Size(1280, 720)')
		expect(decoder).toContain('BarcodeFormat.QR_CODE')
		expect(decoder).toContain('PlanarYUVLuminanceSource')
		expect(decoder).toContain('DecodeHintType.TRY_HARDER')
		expect(decoder).toContain('DecodeHintType.ALSO_INVERTED')
		expect([activity, preview, plugin].join('\n')).not.toContain('vless://')
		expect(manifest).toContain('android.permission.CAMERA')
		expect(manifest).toContain('QrScanActivity')
	})

	it('implements the iOS inline QR preview with permission and lifecycle ownership', () => {
		expect(existsSync(iosQrPluginPath)).toBe(true)
		const plugin = read(iosQrPluginPath)
		const bridge = read(iosBridgePath)
		const info = read(iosInfoPath)

		expect(plugin).toContain('CAPPluginMethod(name: "startPreview"')
		expect(plugin).toContain('CAPPluginMethod(name: "stopPreview"')
		expect(plugin).toContain('CAPPluginMethod(name: "scan"')
		expect(plugin).toContain('AVCaptureVideoPreviewLayer')
		expect(plugin).toContain('metadataObjectTypes = [.qr]')
		expect(plugin).toContain('pendingScan')
		expect(plugin).toContain('UIApplication.didEnterBackgroundNotification')
		expect(plugin).toContain('AVCaptureSession.didStartRunningNotification')
		expect(plugin).toContain('AVCaptureSession.runtimeErrorNotification')
		expect(plugin).toContain('AVCaptureSession.wasInterruptedNotification')
		expect(plugin).toContain('pendingPreviewStart = nil')
		expect(plugin).toContain('pendingScan = nil')
		expect(plugin).toContain('rejectPendingScan(')
		expect(plugin).toContain('removeSessionObservers()')
		expect(plugin).toMatch(
			/let call = pendingScan\s+pendingScan = nil\s+call\?\.reject\(message, code, error\)/u,
		)
		expect(plugin).toMatch(
			/didStartRunningNotification[\s\S]*pendingPreviewStart = nil[\s\S]*call\?\.resolve\(\)/u,
		)
		expect(plugin).not.toContain(
			'try self.showPreview(frame: frame)\n                    call.resolve()',
		)
		expect(plugin).not.toContain('vless://')
		expect(bridge).toContain('registerPluginType(RahRowQrPlugin.self)')
		expect(info).toContain('NSCameraUsageDescription')
	})

	it('uses one bounded, non-redirecting Android request for subscription data and metadata', () => {
		expect(existsSync(subscriptionPluginPath)).toBe(true)
		expect(existsSync(subscriptionPolicyPath)).toBe(true)
		const plugin = read(subscriptionPluginPath)
		const policy = read(subscriptionPolicyPath)
		const activity = read(join(javaRoot, 'MainActivity.java'))

		expect(plugin).toContain('@CapacitorPlugin(name = "RahRowSubscription")')
		expect(plugin).toContain('instanceFollowRedirects = false')
		expect(plugin).toContain('setRequestProperty("Authorization", authorization)')
		expect(plugin).toContain('readBody(connection)')
		expect(plugin).toContain('Subscription-Userinfo')
		expect(plugin).toContain('Profile-Web-Page-Url')
		expect(policy).toContain('MAX_RESPONSE_BYTES = 8 * 1024 * 1024')
		expect(policy).toContain('validatePublicEndpoint')
		expect(activity).toContain('registerPlugin(RahRowSubscriptionPlugin.class)')
	})

	it('uses one ephemeral, bounded, non-redirecting iOS request for subscription data and metadata', () => {
		expect(existsSync(iosSubscriptionPluginPath)).toBe(true)
		const plugin = read(iosSubscriptionPluginPath)
		const bridge = read(iosBridgePath)
		const project = read(iosProjectPath)

		expect(plugin).toContain('CAPPluginMethod(name: "fetch"')
		expect(plugin).toContain('URLSessionConfiguration.ephemeral')
		expect(plugin).toContain('willPerformHTTPRedirection')
		expect(plugin).toContain('completionHandler(nil)')
		expect(plugin).toContain('maxResponseBytes = 8 * 1024 * 1024')
		expect(plugin).toContain('forHTTPHeaderField: "Authorization"')
		expect(plugin).toContain('Subscription-Userinfo')
		expect(plugin).toContain('Profile-Web-Page-Url')
		expect(bridge).toContain('registerPluginType(RahRowSubscriptionPlugin.self)')
		expect(project).toContain('RahRowSubscriptionPlugin.swift in Sources')
	})
})
