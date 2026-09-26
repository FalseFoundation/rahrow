import { describe, expect, it } from 'vitest'
import {
	assertApkContents,
	assertUniqueNativeLibraries,
	collectAarNativeLibraries,
	createAndroidBuildPlan,
	createAndroidWebBuildPlan,
	filterAndroidPreviewPlugins,
	packagedAbisFromApkName,
	validateAndroidAbiPackaging,
	validateAndroidManifestContract,
	validateAndroidProjectWiring,
	validateAndroidRuntime,
} from './android-development-preview.mjs'

const abis = ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64']
const engine = {
	version: '1.2.3',
	repository: 'https://example.test/engine.git',
	revision: 'a'.repeat(40),
	androidArtifact: 'engine.aar',
	build: { android: ['go', 'run', './build', '-target', 'android'] },
}
const pins = {
	buildToolchains: { go: { version: '1.26.7' } },
	targets: { android: abis },
}

describe('Android development preview runtime contract', () => {
	it('omits only the unavailable native ad plugin from preview discovery', () => {
		const plugins = [
			{ pkg: '@capacitor-community/admob', classpath: 'AdMob' },
			{ pkg: '@capacitor/app', classpath: 'AppPlugin' },
			{ pkg: '@capacitor/preferences', classpath: 'PreferencesPlugin' },
		]

		expect(filterAndroidPreviewPlugins(plugins)).toEqual(plugins.slice(1))
	})

	it('requires native capability permissions and a portrait main activity', () => {
		const manifest = `<manifest>
			<uses-permission android:name="android.permission.CAMERA" />
			<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
			<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
			<uses-feature android:name="android.hardware.camera" android:required="false" />
			<application>
				<activity android:name=".MainActivity" android:screenOrientation="portrait" />
				<service android:name=".SingBoxVpnService" android:permission="android.permission.BIND_VPN_SERVICE" />
			</application>
		</manifest>`

		expect(validateAndroidManifestContract(manifest)).toBe(true)
		expect(() =>
			validateAndroidManifestContract(
				manifest.replace(
					'<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />',
					'',
				),
			),
		).toThrow('ACCESS_NETWORK_STATE')
		for (const capability of [
			'android.permission.CAMERA',
			'android.permission.POST_NOTIFICATIONS',
			'android.hardware.camera',
			'android.permission.BIND_VPN_SERVICE',
		]) {
			expect(() =>
				validateAndroidManifestContract(manifest.replace(capability, 'missing')),
			).toThrow(capability)
		}
		expect(() =>
			validateAndroidManifestContract(
				manifest.replace('android:screenOrientation="portrait"', ''),
			),
		).toThrow('portrait')
	})

	it('requires checksum and complete build provenance', () => {
		expect(
			validateAndroidRuntime({
				engineId: 'sing-box',
				engine,
				pins,
				artifactRelativePath: 'native-runtimes/sing-box/engine.aar',
				artifactExists: true,
				checksum: 'b'.repeat(64),
				lockEntry: {
					file: 'native-runtimes/sing-box/engine.aar',
					sha256: 'b'.repeat(64),
					source: {
						version: engine.version,
						repository: engine.repository,
						revision: engine.revision,
					},
					toolchains: { go: '1.26.7' },
					recipe: engine.build.android,
				},
			}),
		).toBe(true)

		expect(() =>
			validateAndroidRuntime({
				engineId: 'sing-box',
				engine,
				pins,
				artifactRelativePath: 'native-runtimes/sing-box/engine.aar',
				artifactExists: true,
				checksum: 'c'.repeat(64),
				lockEntry: { sha256: 'b'.repeat(64) },
			}),
		).toThrow('checksum mismatch')
	})

	it('uses portable POSIX paths in provenance on every build host', () => {
		expect(() =>
			validateAndroidRuntime({
				engineId: 'sing-box',
				engine,
				pins,
				artifactRelativePath: 'native-runtimes/sing-box/engine.aar',
				artifactExists: true,
				checksum: 'b'.repeat(64),
				lockEntry: {
					file: 'native-runtimes\\sing-box\\engine.aar',
					sha256: 'b'.repeat(64),
					source: {
						version: engine.version,
						repository: engine.repository,
						revision: engine.revision,
					},
					toolchains: { go: '1.26.7' },
					recipe: engine.build.android,
				},
			}),
		).toThrow('wrong artifact')
	})

	it('requires native content for every advertised ABI', () => {
		const entries = [
			'AndroidManifest.xml',
			'classes.jar',
			...abis.map((abi) => `jni/${abi}/libengine.so`),
		]
		expect(collectAarNativeLibraries(entries, 'xray', abis)).toEqual(
			Object.fromEntries(abis.map((abi) => [abi, ['libengine.so']])),
		)
		expect(() =>
			collectAarNativeLibraries(
				entries.filter((entry) => !entry.includes('arm64-v8a')),
				'xray',
				abis,
			),
		).toThrow('arm64-v8a')
	})

	it('rejects native library collisions between engines', () => {
		expect(() =>
			assertUniqueNativeLibraries([
				{ engineId: 'xray', libraries: { 'arm64-v8a': ['libgojni.so'] } },
				{
					engineId: 'sing-box',
					libraries: { 'arm64-v8a': ['libgojni.so'] },
				},
			]),
		).toThrow('native library collision')
	})

	it('verifies every staged native library and provenance manifest in the APK', () => {
		const manifest = {
			firstRunExecutableDownloads: false,
			engines: [
				{
					engineId: 'xray',
					libraries: Object.fromEntries(abis.map((abi) => [abi, ['libxray.so']])),
				},
				{
					engineId: 'sing-box',
					libraries: Object.fromEntries(abis.map((abi) => [abi, ['libsingbox.so']])),
				},
			],
		}
		const entries = [
			'assets/rahrow/native-runtime-manifest.json',
			...abis.map((abi) => `lib/${abi}/libxray.so`),
			...abis.map((abi) => `lib/${abi}/libsingbox.so`),
		]
		expect(assertApkContents(entries, manifest)).toBe(true)
		expect(() => assertApkContents(entries.slice(0, -1), manifest)).toThrow(
			'x86_64',
		)
		const arm64Entries = entries.filter(
			(entry) => !entry.startsWith('lib/') || entry.includes('arm64-v8a'),
		)
		expect(assertApkContents(arm64Entries, manifest, ['arm64-v8a'])).toBe(true)
		expect(() => assertApkContents(entries, manifest, ['arm64-v8a'])).toThrow(
			'unexpected ABI',
		)
	})

	it('reads one ABI from a split APK name without treating x86_64 as x86', () => {
		expect(packagedAbisFromApkName('app-x86_64-debug.apk', abis)).toEqual([
			'x86_64',
		])
		expect(packagedAbisFromApkName('app-x86-debug.apk', abis)).toEqual(['x86'])
		expect(packagedAbisFromApkName('app-arm64-v8a-debug.apk', abis)).toEqual([
			'arm64-v8a',
		])
		expect(packagedAbisFromApkName('app-debug.apk', abis)).toEqual([])
	})

	it('refuses a universal APK that embeds every native ABI', () => {
		const split = `splits {\n    abi {\n        enable true\n        universalApk false\n    }\n}`
		expect(validateAndroidAbiPackaging(split)).toBe(true)
		expect(() =>
			validateAndroidAbiPackaging('splits { abi { enable false } }'),
		).toThrow('per-ABI')
		expect(() =>
			validateAndroidAbiPackaging(
				'splits { abi { enable true\n universalApk true } }',
			),
		).toThrow('universal')
	})

	it('requires explicit local AAR dependencies in the Android app', () => {
		const project =
			"implementation files('libs/libXray.aar')\nimplementation files('libs/libbox.aar')"
		expect(
			validateAndroidProjectWiring(project, {
				engines: {
					xray: { androidArtifact: 'libXray.aar' },
					'sing-box': { androidArtifact: 'libbox.aar' },
				},
			}),
		).toBe(true)
		expect(
			validateAndroidProjectWiring(
				"def runtimes = [file('libs/libXray.aar'), file('libs/libbox.aar')]\nimplementation files('libs/libbox.aar')",
				{
					engines: {
						xray: { androidArtifact: 'libXray.aar' },
						'sing-box': { androidArtifact: 'libbox.aar' },
					},
				},
			),
		).toBe(true)
		expect(() =>
			validateAndroidProjectWiring(
				"def runtimes = [file('libs/libXray.aar'), file('libs/libbox.aar')]",
				{
					engines: {
						xray: { androidArtifact: 'libXray.aar' },
						'sing-box': { androidArtifact: 'libbox.aar' },
					},
				},
			),
		).toThrow('runtime API')
		expect(() =>
			validateAndroidProjectWiring("implementation files('libs/libXray.aar')", {
				engines: {
					xray: { androidArtifact: 'libXray.aar' },
					'sing-box': { androidArtifact: 'libbox.aar' },
				},
			}),
		).toThrow('libbox.aar')
	})

	it('uses the checked-in Gradle wrapper for the debug application bundle', () => {
		expect(createAndroidBuildPlan()).toEqual([
			'-PrahrowExcludeAdmob=true',
			':app:assembleDebug',
		])
	})

	it('builds preview web assets with test advertising enabled', () => {
		expect(createAndroidWebBuildPlan()).toEqual(['build', '--mode', 'preview'])
	})
})
