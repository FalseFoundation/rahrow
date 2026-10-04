use crate::{
    capability_status, command_error, unsupported_capability, unsupported_status,
    DesktopCommandError, NativeCapabilityStatus, SystemProxyInput,
};
use serde::{Deserialize, Serialize};
use std::{
    env, fs,
    net::{TcpStream, ToSocketAddrs},
    path::PathBuf,
    process::Command,
    sync::Mutex,
    time::{Duration, Instant},
};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, Manager, Wry,
};

const AUTOSTART_LABEL: &str = "foundation.false.rahrow.desktop";
const TRAY_ID: &str = "rahrow";
const TRAY_EVENT: &str = "rahrow-tray";

struct TrayControls {
    status: MenuItem<Wry>,
    connect: MenuItem<Wry>,
    disconnect: MenuItem<Wry>,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TraySyncInput {
    pub connected: bool,
    pub profile_label: Option<String>,
    pub can_connect: bool,
    pub can_disconnect: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TcpProbeResult {
    pub reachable: bool,
    pub latency_ms: Option<u64>,
    pub error: Option<String>,
}

#[tauri::command]
pub fn rahrow_tcp_probe(host: String, port: u16) -> Result<TcpProbeResult, DesktopCommandError> {
    let target = format!("{}:{}", host, port);
    let addr = target
        .to_socket_addrs()
        .map_err(|error| command_error("probe_failed", error.to_string()))?
        .next()
        .ok_or_else(|| command_error("probe_failed", format!("Could not resolve {target}")))?;
    let started = Instant::now();

    match TcpStream::connect_timeout(&addr, Duration::from_secs(3)) {
        Ok(_) => Ok(TcpProbeResult {
            reachable: true,
            latency_ms: Some(started.elapsed().as_millis() as u64),
            error: None,
        }),
        Err(error) => Ok(TcpProbeResult {
            reachable: false,
            latency_ms: None,
            error: Some(error.to_string()),
        }),
    }
}

#[tauri::command]
pub fn rahrow_autostart_enable() -> Result<(), DesktopCommandError> {
    set_autostart(true)
}

#[tauri::command]
pub fn rahrow_autostart_disable() -> Result<(), DesktopCommandError> {
    set_autostart(false)
}

#[tauri::command]
pub fn rahrow_autostart_status() -> Result<NativeCapabilityStatus, DesktopCommandError> {
    Ok(autostart_status())
}

#[tauri::command]
pub fn rahrow_tray_show(app: AppHandle) -> Result<(), DesktopCommandError> {
    let tray = app
        .tray_by_id(TRAY_ID)
        .ok_or_else(|| unsupported_capability("tray"))?;
    tray.set_visible(true)
        .map_err(|error| command_error("desktop_command_failed", error.to_string()))?;

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }

    Ok(())
}

#[tauri::command]
pub fn rahrow_tray_hide(app: AppHandle) -> Result<(), DesktopCommandError> {
    if app.tray_by_id(TRAY_ID).is_none() {
        return Err(unsupported_capability("tray"));
    }

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }

    Ok(())
}

#[tauri::command]
pub fn rahrow_tray_status(app: AppHandle) -> Result<NativeCapabilityStatus, DesktopCommandError> {
    Ok(tray_status(&app))
}

#[tauri::command]
pub fn rahrow_system_proxy_enable(input: SystemProxyInput) -> Result<(), DesktopCommandError> {
    set_system_proxy(true, Some(&input))
}

#[tauri::command]
pub fn rahrow_system_proxy_disable() -> Result<(), DesktopCommandError> {
    set_system_proxy(false, None)
}

#[tauri::command]
pub fn rahrow_system_proxy_status() -> Result<NativeCapabilityStatus, DesktopCommandError> {
    Ok(system_proxy_status())
}

pub fn setup_tray(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let status = MenuItem::with_id(app, "status", "Ready · No connection selected", false, None::<&str>)?;
    let connect = MenuItem::with_id(app, "connect", "Connect", true, None::<&str>)?;
    let disconnect = MenuItem::with_id(app, "disconnect", "Disconnect", false, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(
        app,
        &[
            &status,
            &connect,
            &disconnect,
            &separator,
            &show,
            &hide,
            &quit,
        ],
    )?;

    app.manage(Mutex::new(TrayControls {
        status: status.clone(),
        connect: connect.clone(),
        disconnect: disconnect.clone(),
    }));

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_icon(app_icon());
    }

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(app_icon())
        .tooltip("RahRow")
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "connect" => {
                let _ = app.emit(TRAY_EVENT, "connect");
            }
            "disconnect" => {
                let _ = app.emit(TRAY_EVENT, "disconnect");
            }
            "show" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "hide" => {
                if let Some(window) = app.get_webview_window("main") {
                    let _ = window.hide();
                }
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    if let Some(window) = app.get_webview_window("main") {
        let window_handle = window.clone();
        window.on_window_event(move |event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window_handle.hide();
            }
        });
    }

    Ok(())
}

#[tauri::command]
pub fn rahrow_tray_sync(
    app: AppHandle,
    input: TraySyncInput,
) -> Result<(), DesktopCommandError> {
    let tray = app
        .tray_by_id(TRAY_ID)
        .ok_or_else(|| unsupported_capability("tray"))?;
    let controls = app
        .try_state::<Mutex<TrayControls>>()
        .ok_or_else(|| unsupported_capability("tray"))?;
    let controls = controls
        .lock()
        .map_err(|_| command_error("desktop_command_failed", "Tray menu is busy.".to_string()))?;

    let profile = input
        .profile_label
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("No connection selected");
    let status_text = if input.connected {
        format!("Connected · {profile}")
    } else {
        format!("Ready · {profile}")
    };
    controls.status.set_text(status_text).map_err(|error| {
        command_error("desktop_command_failed", format!("Tray status label: {error}"))
    })?;
    controls
        .connect
        .set_enabled(input.can_connect)
        .map_err(|error| {
            command_error(
                "desktop_command_failed",
                format!("Tray connect item: {error}"),
            )
        })?;
    controls
        .disconnect
        .set_enabled(input.can_disconnect)
        .map_err(|error| {
            command_error(
                "desktop_command_failed",
                format!("Tray disconnect item: {error}"),
            )
        })?;

    let tooltip = if input.connected {
        format!("RahRow · Connected · {profile}")
    } else {
        format!("RahRow · Disconnected · {profile}")
    };
    tray.set_tooltip(Some(&tooltip)).map_err(|error| {
        command_error("desktop_command_failed", format!("Tray tooltip: {error}"))
    })?;
    Ok(())
}

pub fn autostart_status() -> NativeCapabilityStatus {
    match autostart_enabled() {
        Ok(enabled) => capability_status(
            "autostart",
            true,
            Some(enabled),
            Some("Launch at login is registered for the current user.".to_string()),
        ),
        Err(error) => unsupported_status("autostart", Some(error.message)),
    }
}

pub fn tray_status(app: &AppHandle) -> NativeCapabilityStatus {
    match app.tray_by_id(TRAY_ID) {
        Some(_) => capability_status(
            "tray",
            true,
            Some(true),
            Some("Desktop tray icon is available.".to_string()),
        ),
        None => unsupported_status(
            "tray",
            Some("Tray icon was not created in the current host.".to_string()),
        ),
    }
}

pub fn system_proxy_status() -> NativeCapabilityStatus {
    match system_proxy_enabled() {
        Ok(enabled) => capability_status(
            "system-proxy",
            true,
            Some(enabled),
            Some("System SOCKS proxy is managed through OS settings.".to_string()),
        ),
        Err(error) => unsupported_status("system-proxy", Some(error.message)),
    }
}

fn set_autostart(enabled: bool) -> Result<(), DesktopCommandError> {
    let exe = current_exe()?;

    #[cfg(target_os = "macos")]
    {
        let plist_path = autostart_plist_path()?;
        if enabled {
            if let Some(parent) = plist_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|error| command_error("desktop_command_failed", error.to_string()))?;
            }
            fs::write(&plist_path, macos_plist(&exe))
                .map_err(|error| command_error("desktop_command_failed", error.to_string()))?;
        } else if plist_path.exists() {
            fs::remove_file(&plist_path)
                .map_err(|error| command_error("desktop_command_failed", error.to_string()))?;
        }

        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        if enabled {
            run_command(
                "reg",
                &[
                    "add",
                    r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
                    "/v",
                    "RahRow",
                    "/t",
                    "REG_SZ",
                    "/d",
                    &format!("\"{}\"", exe.display()),
                    "/f",
                ],
            )
        } else {
            let _ = run_command(
                "reg",
                &[
                    "delete",
                    r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
                    "/v",
                    "RahRow",
                    "/f",
                ],
            );
            Ok(())
        }
    }

    #[cfg(target_os = "linux")]
    {
        let desktop_path = linux_autostart_path()?;
        if enabled {
            if let Some(parent) = desktop_path.parent() {
                fs::create_dir_all(parent)
                    .map_err(|error| command_error("desktop_command_failed", error.to_string()))?;
            }
            fs::write(
                &desktop_path,
                format!(
                    "[Desktop Entry]\nType=Application\nName=RahRow\nExec={}\nX-GNOME-Autostart-enabled=true\nHidden=false\n",
                    exe.display()
                ),
            )
            .map_err(|error| command_error("desktop_command_failed", error.to_string()))?;
        } else if desktop_path.exists() {
            fs::remove_file(&desktop_path)
                .map_err(|error| command_error("desktop_command_failed", error.to_string()))?;
        }

        Ok(())
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        let _ = exe;
        let _ = enabled;
        Err(unsupported_capability("autostart"))
    }
}

fn autostart_enabled() -> Result<bool, DesktopCommandError> {
    #[cfg(target_os = "macos")]
    {
        Ok(autostart_plist_path()?.is_file())
    }

    #[cfg(target_os = "windows")]
    {
        Ok(run_command(
            "reg",
            &[
                "query",
                r"HKCU\Software\Microsoft\Windows\CurrentVersion\Run",
                "/v",
                "RahRow",
            ],
        )
        .is_ok())
    }

    #[cfg(target_os = "linux")]
    {
        Ok(linux_autostart_path()?.is_file())
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Err(unsupported_capability("autostart"))
    }
}

fn set_system_proxy(
    enabled: bool,
    input: Option<&SystemProxyInput>,
) -> Result<(), DesktopCommandError> {
    #[cfg(target_os = "macos")]
    {
        let services = macos_network_services()?;
        if services.is_empty() {
            return Err(command_error(
                "desktop_command_failed",
                "No macOS network services were found.".to_string(),
            ));
        }

        for service in services {
            if enabled {
                let input = input.ok_or_else(|| {
                    command_error(
                        "invalid_config",
                        "System proxy host and port are required".to_string(),
                    )
                })?;
                run_command(
                    "networksetup",
                    &[
                        "-setsocksfirewallproxy",
                        &service,
                        &input.host,
                        &input.port.to_string(),
                        "off",
                    ],
                )?;
                run_command(
                    "networksetup",
                    &["-setsocksfirewallproxystate", &service, "on"],
                )?;
            } else {
                run_command(
                    "networksetup",
                    &["-setsocksfirewallproxystate", &service, "off"],
                )?;
            }
        }

        Ok(())
    }

    #[cfg(target_os = "windows")]
    {
        if enabled {
            let input = input.ok_or_else(|| {
                command_error(
                    "invalid_config",
                    "System proxy host and port are required".to_string(),
                )
            })?;
            let server = format!("socks={}:{}", input.host, input.port);
            run_command(
                "reg",
                &[
                    "add",
                    r"HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings",
                    "/v",
                    "ProxyEnable",
                    "/t",
                    "REG_DWORD",
                    "/d",
                    "1",
                    "/f",
                ],
            )?;
            run_command(
                "reg",
                &[
                    "add",
                    r"HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings",
                    "/v",
                    "ProxyServer",
                    "/t",
                    "REG_SZ",
                    "/d",
                    &server,
                    "/f",
                ],
            )?;
        } else {
            run_command(
                "reg",
                &[
                    "add",
                    r"HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings",
                    "/v",
                    "ProxyEnable",
                    "/t",
                    "REG_DWORD",
                    "/d",
                    "0",
                    "/f",
                ],
            )?;
        }

        let _ = run_command(
            "powershell",
            &[
                "-NoProfile",
                "-Command",
                "Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class WinINet { [DllImport(\"wininet.dll\")] public static extern bool InternetSetOption(System.IntPtr h, int o, System.IntPtr b, int l); }'; [WinINet]::InternetSetOption([System.IntPtr]::Zero, 39, [System.IntPtr]::Zero, 0) | Out-Null; [WinINet]::InternetSetOption([System.IntPtr]::Zero, 37, [System.IntPtr]::Zero, 0) | Out-Null",
            ],
        );

        Ok(())
    }

    #[cfg(target_os = "linux")]
    {
        if Command::new("gsettings").arg("--version").output().is_err() {
            return Err(unsupported_status_error(
                "system-proxy",
                "gsettings is not available; GNOME system proxy is unsupported on this desktop.",
            ));
        }

        if enabled {
            let input = input.ok_or_else(|| {
                command_error(
                    "invalid_config",
                    "System proxy host and port are required".to_string(),
                )
            })?;
            run_command(
                "gsettings",
                &["set", "org.gnome.system.proxy", "mode", "manual"],
            )?;
            run_command(
                "gsettings",
                &["set", "org.gnome.system.proxy.socks", "host", &input.host],
            )?;
            run_command(
                "gsettings",
                &[
                    "set",
                    "org.gnome.system.proxy.socks",
                    "port",
                    &input.port.to_string(),
                ],
            )?;
        } else {
            run_command(
                "gsettings",
                &["set", "org.gnome.system.proxy", "mode", "none"],
            )?;
        }

        Ok(())
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        let _ = enabled;
        let _ = input;
        Err(unsupported_capability("system-proxy"))
    }
}

fn system_proxy_enabled() -> Result<bool, DesktopCommandError> {
    #[cfg(target_os = "macos")]
    {
        for service in macos_network_services()? {
            let output = Command::new("networksetup")
                .args(["-getsocksfirewallproxy", &service])
                .output()
                .map_err(|error| command_error("desktop_command_failed", error.to_string()))?;
            let text = String::from_utf8_lossy(&output.stdout);
            if text
                .lines()
                .any(|line| line.to_ascii_lowercase().starts_with("enabled: yes"))
            {
                return Ok(true);
            }
        }

        Ok(false)
    }

    #[cfg(target_os = "windows")]
    {
        let output = Command::new("reg")
            .args([
                "query",
                r"HKCU\Software\Microsoft\Windows\CurrentVersion\Internet Settings",
                "/v",
                "ProxyEnable",
            ])
            .output()
            .map_err(|error| command_error("desktop_command_failed", error.to_string()))?;
        let text = String::from_utf8_lossy(&output.stdout);
        Ok(text.contains("0x1"))
    }

    #[cfg(target_os = "linux")]
    {
        let output = Command::new("gsettings")
            .args(["get", "org.gnome.system.proxy", "mode"])
            .output()
            .map_err(|_| {
                unsupported_status_error(
                    "system-proxy",
                    "gsettings is not available; GNOME system proxy is unsupported on this desktop.",
                )
            })?;
        let text = String::from_utf8_lossy(&output.stdout);
        Ok(text.contains("manual"))
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        Err(unsupported_capability("system-proxy"))
    }
}

fn macos_network_services() -> Result<Vec<String>, DesktopCommandError> {
    let output = Command::new("networksetup")
        .arg("-listallnetworkservices")
        .output()
        .map_err(|error| command_error("desktop_command_failed", error.to_string()))?;
    let text = String::from_utf8_lossy(&output.stdout);

    Ok(text
        .lines()
        .skip(1)
        .filter(|line| !line.starts_with('*') && !line.trim().is_empty())
        .map(|line| line.trim().to_string())
        .collect())
}

fn autostart_plist_path() -> Result<PathBuf, DesktopCommandError> {
    let home = env::var("HOME")
        .map_err(|error| command_error("desktop_command_failed", error.to_string()))?;
    Ok(PathBuf::from(home)
        .join("Library/LaunchAgents")
        .join(format!("{AUTOSTART_LABEL}.plist")))
}

#[cfg(target_os = "linux")]
fn linux_autostart_path() -> Result<PathBuf, DesktopCommandError> {
    let home = env::var("HOME")
        .map_err(|error| command_error("desktop_command_failed", error.to_string()))?;
    Ok(PathBuf::from(home).join(".config/autostart/rahrow.desktop"))
}

fn macos_plist(exe: &std::path::Path) -> String {
    format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>{AUTOSTART_LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>{}</string>
  </array>
  <key>RunAtLoad</key>
  <true/>
</dict>
</plist>
"#,
        exe.display()
    )
}

fn current_exe() -> Result<PathBuf, DesktopCommandError> {
    env::current_exe().map_err(|error| command_error("desktop_command_failed", error.to_string()))
}

fn app_icon() -> Image<'static> {
    Image::from_bytes(include_bytes!("../icons/icon.png")).unwrap_or_else(|_| fallback_tray_icon())
}

fn fallback_tray_icon() -> Image<'static> {
    let rgba = [0x25u8, 0x63, 0xeb, 0xff].repeat(32 * 32);
    Image::new(Box::leak(rgba.into_boxed_slice()), 32, 32)
}

#[cfg(target_os = "linux")]
fn unsupported_status_error(capability: &'static str, detail: &str) -> DesktopCommandError {
    DesktopCommandError {
        code: "unsupported_capability",
        message: format!("Desktop capability is not available: {capability}: {detail}"),
    }
}

fn run_command(program: &str, args: &[&str]) -> Result<(), DesktopCommandError> {
    let output = Command::new(program)
        .args(args)
        .output()
        .map_err(|error| command_error("desktop_command_failed", error.to_string()))?;

    if output.status.success() {
        Ok(())
    } else {
        Err(command_error(
            "desktop_command_failed",
            String::from_utf8_lossy(&output.stderr).trim().to_string(),
        ))
    }
}

/// Best-effort friendly name for a common local proxy holding a loopback port.
pub(crate) fn friendly_local_proxy_name(process: &str) -> Option<&'static str> {
    let normalized = process.to_ascii_lowercase().replace('\\', "/");
    let base = normalized
        .rsplit('/')
        .next()
        .unwrap_or(normalized.as_str())
        .trim_end_matches(".exe")
        .trim_end_matches(".app");

    if base.contains("v2rayn") || base == "v2ray-desktop" {
        return Some("v2rayN");
    }
    if base.contains("clash-verge") || base.contains("clash verge") {
        return Some("Clash Verge");
    }
    if base.contains("clash for windows")
        || base.contains("clash-for-windows")
        || base == "cfw"
    {
        return Some("Clash for Windows");
    }
    if base.contains("mihomo") || base == "clash-meta" || base.contains("clash.meta") {
        return Some("mihomo");
    }
    if base == "clash" || base.starts_with("clash-") {
        return Some("Clash");
    }
    if base.contains("hiddify") {
        return Some("Hiddify");
    }
    if base.contains("nekoray") || base.contains("nekobox") {
        return Some("Nekoray");
    }
    if base == "happ" || base.starts_with("happ-") {
        return Some("Happ");
    }
    if base.contains("shadowsocks") || base == "ss-local" {
        return Some("Shadowsocks");
    }
    if base.contains("hysteria") {
        return Some("Hysteria");
    }
    if base == "xray" || base.starts_with("xray-") {
        return Some("Xray");
    }
    if base == "sing-box" || base.starts_with("sing-box-") {
        return Some("sing-box");
    }
    None
}

/// Who is listening on 127.0.0.1:`port`, when we can tell (best effort).
pub(crate) fn loopback_port_occupant(port: u16) -> Option<&'static str> {
    let process = raw_loopback_port_process(port)?;
    friendly_local_proxy_name(&process)
}

fn raw_loopback_port_process(port: u16) -> Option<String> {
    #[cfg(target_os = "linux")]
    {
        let output = Command::new("ss")
            .args(["-H", "-ltnp", &format!("sport = :{port}")])
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }
        let text = String::from_utf8_lossy(&output.stdout);
        // users:(("v2rayN",pid=123,fd=4))
        for line in text.lines() {
            if let Some(start) = line.find("users:((") {
                let rest = &line[start + "users:((".len()..];
                if let Some(end) = rest.find('"') {
                    let name = rest[..end].trim();
                    if !name.is_empty() {
                        return Some(name.to_string());
                    }
                }
            }
        }
        None
    }

    #[cfg(target_os = "macos")]
    {
        let output = Command::new("lsof")
            .args(["-nP", &format!("-iTCP:{port}"), "-sTCP:LISTEN"])
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }
        let text = String::from_utf8_lossy(&output.stdout);
        for line in text.lines().skip(1) {
            let name = line.split_whitespace().next()?.trim();
            if !name.is_empty() {
                return Some(name.to_string());
            }
        }
        None
    }

    #[cfg(target_os = "windows")]
    {
        let output = Command::new("netstat")
            .args(["-ano", "-p", "tcp"])
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }
        let text = String::from_utf8_lossy(&output.stdout);
        let needle = format!(":{port}");
        let mut pid: Option<String> = None;
        for line in text.lines() {
            let lowered = line.to_ascii_lowercase();
            if !(lowered.contains("127.0.0.1")
                || lowered.contains("0.0.0.0")
                || lowered.contains("[::1]")
                || lowered.contains("[::]"))
            {
                continue;
            }
            if !line.contains(&needle) || !lowered.contains("listening") {
                continue;
            }
            pid = line.split_whitespace().last().map(str::to_string);
            break;
        }
        let pid = pid.filter(|value| value.chars().all(|ch| ch.is_ascii_digit()))?;
        let task = Command::new("tasklist")
            .args(["/FI", &format!("PID eq {pid}"), "/FO", "CSV", "/NH"])
            .output()
            .ok()?;
        if !task.status.success() {
            return None;
        }
        let row = String::from_utf8_lossy(&task.stdout);
        let name = row
            .lines()
            .next()?
            .trim()
            .trim_start_matches('"')
            .split('"')
            .next()?
            .trim();
        if name.is_empty() {
            None
        } else {
            Some(name.to_string())
        }
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        let _ = port;
        None
    }
}

#[tauri::command]
pub fn rahrow_loopback_port_occupant(port: u16) -> Option<&'static str> {
    loopback_port_occupant(port)
}

#[cfg(test)]
mod local_proxy_name_tests {
    use super::friendly_local_proxy_name;

    #[test]
    fn maps_common_local_proxy_process_names() {
        assert_eq!(friendly_local_proxy_name("v2rayN"), Some("v2rayN"));
        assert_eq!(friendly_local_proxy_name("v2rayN.exe"), Some("v2rayN"));
        assert_eq!(
            friendly_local_proxy_name("clash-verge-rev"),
            Some("Clash Verge")
        );
        assert_eq!(
            friendly_local_proxy_name("Clash for Windows"),
            Some("Clash for Windows")
        );
        assert_eq!(friendly_local_proxy_name("mihomo"), Some("mihomo"));
        assert_eq!(friendly_local_proxy_name("clash"), Some("Clash"));
        assert_eq!(friendly_local_proxy_name("firefox"), None);
    }
}
