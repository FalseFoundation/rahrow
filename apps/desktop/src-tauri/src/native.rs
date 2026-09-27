use crate::{
    capability_status, command_error, unsupported_capability, unsupported_status,
    DesktopCommandError, NativeCapabilityStatus, SystemProxyInput,
};
use serde::Serialize;
use std::{
    env, fs,
    net::{TcpStream, ToSocketAddrs},
    path::PathBuf,
    process::Command,
    time::{Duration, Instant},
};
use tauri::{
    image::Image,
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Manager,
};

const AUTOSTART_LABEL: &str = "foundation.false.rahrow.desktop";
const TRAY_ID: &str = "rahrow";

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
    let show = MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
    let hide = MenuItem::with_id(app, "hide", "Hide", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &hide, &quit])?;

    if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_icon(app_icon());
    }

    TrayIconBuilder::with_id(TRAY_ID)
        .icon(app_icon())
        .menu(&menu)
        .show_menu_on_left_click(true)
        .on_menu_event(|app, event| match event.id().as_ref() {
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
