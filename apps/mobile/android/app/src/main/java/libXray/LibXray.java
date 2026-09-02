package libXray;

/** Minimal binding for the pinned libXray gomobile runtime.
 *
 * The full libXray AAR cannot share its generated go.Seq classes with libbox in
 * one APK class path. RahRow isolates the native runtimes by Android process and
 * exposes only the string-based invoke contract used by the Xray VPN service.
 */
public final class LibXray {
    static {
        System.loadLibrary("gojni");
        _init();
    }

    private LibXray() {}

    private static native void _init();

    public static native String invoke(String requestJSON);
}
