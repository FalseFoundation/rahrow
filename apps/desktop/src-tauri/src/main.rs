#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod native;
mod network_identity;
mod tun;
mod vpn_ipc;

use serde::Serialize;
use serde_json::Value;
use std::{
    collections::VecDeque,
    env, fs,
    io::{BufRead, BufReader, Read},
    net::{IpAddr, Ipv4Addr, SocketAddrV4, TcpListener, ToSocketAddrs},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{Arc, Mutex},
    thread,
    time::{Duration, SystemTime, UNIX_EPOCH},
};
use tauri::{Manager, State};

use native::{
    autostart_status, loopback_port_occupant, rahrow_autostart_disable, rahrow_autostart_enable,
    rahrow_autostart_status, rahrow_loopback_port_occupant, rahrow_system_proxy_disable,
    rahrow_system_proxy_enable, rahrow_system_proxy_status, rahrow_tcp_probe, rahrow_tray_hide,
    rahrow_tray_show, rahrow_tray_status, rahrow_tray_sync, setup_tray, system_proxy_status,
    tray_status,
};
use tun::{rahrow_tun_start, rahrow_tun_stop, TunRuntimeState};

#[derive(Default)]
struct XrayRuntimeState {
    child: Option<Child>,
    config_path: Option<PathBuf>,
    last_error: Option<String>,
    output: EngineOutputBuffer,
}

#[derive(Default)]
struct SingBoxRuntimeState {
    child: Option<Child>,
    config_path: Option<PathBuf>,
    last_error: Option<String>,
    output: EngineOutputBuffer,
}

type EngineOutputBuffer = Arc<Mutex<EngineOutputState>>;

#[derive(Default)]
struct EngineOutputState {
    sequence: u64,
    lines: VecDeque<NativeOutputLine>,
}

#[derive(Serialize)]
pub(crate) struct DesktopCommandError {
    pub code: &'static str,
    pub message: String,
}

#[derive(Serialize)]
struct EngineRuntimeStatus {
    running: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NativeCapabilityStatus {
    pub capability: &'static str,
    pub supported: bool,
    pub enabled: Option<bool>,
    pub detail: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DesktopDiagnostics {
    capabilities: Vec<NativeCapabilityStatus>,
    output: Vec<NativeOutputLine>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct NativeOutputLine {
    sequence: u64,
    source: &'static str,
    stream: &'static str,
    line: String,
    observed_at: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct SubscriptionHttpResponse {
    body: String,
    subscription_userinfo: Option<String>,
    profile_update_interval: Option<String>,
    support_url: Option<String>,
    profile_web_page_url: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct RoutedHttpResponse {
    status: u16,
    body: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    bytes_read: Option<usize>,
}

#[derive(serde::Deserialize)]
pub(crate) struct SystemProxyInput {
    pub host: String,
    pub port: u16,
}

#[tauri::command]
fn rahrow_http_get(
    url: String,
    authorization: Option<String>,
) -> Result<SubscriptionHttpResponse, DesktopCommandError> {
    if !url.starts_with("https://") {
        return Err(command_error(
            "invalid_config",
            "Subscription URLs must use HTTPS".to_string(),
        ));
    }

    validate_subscription_authorization(authorization.as_deref())?;
    let agent = ureq::AgentBuilder::new().redirects(0).build();
    let mut request = agent
        .get(&url)
        .set("User-Agent", "RahRow/0.0.0")
        .timeout(Duration::from_secs(20));
    if let Some(value) = authorization.as_deref() {
        request = request.set("Authorization", value);
    }
    let response = request
        .call()
        .map_err(|error| command_error("invalid_config", error.to_string()))?;

    if let Some(content_length) = response.header("content-length") {
        let bytes = content_length
            .parse::<usize>()
            .map_err(|_| command_error("invalid_config", "Invalid Content-Length".to_string()))?;
        if bytes > MAX_SUBSCRIPTION_BYTES {
            return Err(subscription_too_large());
        }
    }

    let subscription_userinfo = response.header("subscription-userinfo").map(str::to_string);
    let profile_update_interval = response
        .header("profile-update-interval")
        .map(str::to_string);
    let support_url = response.header("support-url").map(str::to_string);
    let profile_web_page_url = response.header("profile-web-page-url").map(str::to_string);
    let body = read_limited_subscription(response.into_reader())?;

    Ok(SubscriptionHttpResponse {
        body,
        subscription_userinfo,
        profile_update_interval,
        support_url,
        profile_web_page_url,
    })
}

const MAX_ROUTED_HTTP_BYTES: usize = 1024 * 1024;
const MAX_ROUTED_HTTP_TIMEOUT_MS: u64 = 10_000;
const ROUTED_HTTP_URLS: [&str; 4] = [
    "https://www.cloudflare.com/cdn-cgi/trace",
    "https://api64.ipify.org?format=json",
    "https://speed.cloudflare.com/__down?bytes=0",
    "https://speed.cloudflare.com/__down?bytes=1048576",
];

#[tauri::command]
fn rahrow_routed_http_get(
    url: String,
    proxy_url: String,
    timeout_ms: u64,
    max_bytes: usize,
    response_mode: Option<String>,
) -> Result<RoutedHttpResponse, DesktopCommandError> {
    validate_routed_http_input(
        &url,
        &proxy_url,
        timeout_ms,
        max_bytes,
        response_mode.as_deref(),
    )?;
    let proxy = ureq::Proxy::new(&proxy_url)
        .map_err(|error| command_error("invalid_config", error.to_string()))?;
    let agent = ureq::AgentBuilder::new().redirects(0).proxy(proxy).build();
    let request = agent
        .get(&url)
        .set("Accept", "text/plain, application/json")
        .set("Cache-Control", "no-cache")
        .set("Pragma", "no-cache")
        .set("User-Agent", "RahRow/0.0.0")
        .timeout(Duration::from_millis(timeout_ms));
    let response = match request.call() {
        Ok(response) => response,
        Err(ureq::Error::Status(_, response)) => response,
        Err(error) => return Err(command_error("network_unavailable", error.to_string())),
    };
    let status = response.status();
    let byte_count_mode = response_mode.as_deref() == Some("byte-count");
    let (body, bytes_read) = read_limited_routed_http(response, max_bytes, byte_count_mode)?;

    Ok(RoutedHttpResponse {
        status,
        body,
        bytes_read: byte_count_mode.then_some(bytes_read),
    })
}

fn validate_routed_http_input(
    url: &str,
    proxy_url: &str,
    timeout_ms: u64,
    max_bytes: usize,
    response_mode: Option<&str>,
) -> Result<(), DesktopCommandError> {
    if !ROUTED_HTTP_URLS.contains(&url) {
        return Err(command_error(
            "invalid_config",
            "Routed HTTP endpoint is not allowlisted".to_string(),
        ));
    }
    if !valid_loopback_socks_url(proxy_url) {
        return Err(command_error(
            "invalid_config",
            "Routed HTTP requires a credential-free loopback SOCKS5 URL".to_string(),
        ));
    }
    if timeout_ms == 0 || timeout_ms > MAX_ROUTED_HTTP_TIMEOUT_MS {
        return Err(command_error(
            "invalid_config",
            "Routed HTTP timeout is invalid".to_string(),
        ));
    }
    if max_bytes == 0 || max_bytes > MAX_ROUTED_HTTP_BYTES {
        return Err(command_error(
            "invalid_config",
            "Routed HTTP response limit is invalid".to_string(),
        ));
    }
    if !matches!(response_mode, None | Some("text") | Some("byte-count")) {
        return Err(command_error(
            "invalid_config",
            "Routed HTTP response mode is invalid".to_string(),
        ));
    }
    Ok(())
}

fn valid_loopback_socks_url(value: &str) -> bool {
    let port = value
        .strip_prefix("socks5://127.0.0.1:")
        .or_else(|| value.strip_prefix("socks5://localhost:"))
        .or_else(|| value.strip_prefix("socks5://[::1]:"));
    let Some(port) = port else { return false };
    !port.is_empty()
        && port.bytes().all(|byte| byte.is_ascii_digit())
        && port.parse::<u16>().is_ok_and(|port| port > 0)
}

fn read_limited_routed_http(
    response: ureq::Response,
    max_bytes: usize,
    byte_count_mode: bool,
) -> Result<(String, usize), DesktopCommandError> {
    if response.header("content-length").is_some_and(|value| {
        value
            .parse::<usize>()
            .map_or(true, |length| length > max_bytes)
    }) {
        return Err(command_error(
            "invalid_response",
            "Routed HTTP response is too large".to_string(),
        ));
    }

    let mut bytes = Vec::new();
    response
        .into_reader()
        .take((max_bytes + 1) as u64)
        .read_to_end(&mut bytes)
        .map_err(|error| command_error("network_unavailable", error.to_string()))?;
    if bytes.len() > max_bytes {
        return Err(command_error(
            "invalid_response",
            "Routed HTTP response is too large".to_string(),
        ));
    }
    let bytes_read = bytes.len();
    if byte_count_mode {
        return Ok((String::new(), bytes_read));
    }
    String::from_utf8(bytes)
        .map(|body| (body, bytes_read))
        .map_err(|_| {
            command_error(
                "invalid_response",
                "Routed HTTP response is not valid UTF-8".to_string(),
            )
        })
}

fn validate_subscription_authorization(
    authorization: Option<&str>,
) -> Result<(), DesktopCommandError> {
    if authorization.is_some_and(|value| {
        value.is_empty() || value.len() > 8_192 || value.contains('\r') || value.contains('\n')
    }) {
        return Err(command_error(
            "invalid_config",
            "Subscription credential is invalid".to_string(),
        ));
    }

    Ok(())
}

#[tauri::command]
fn rahrow_network_identity() -> network_identity::NetworkIdentitySnapshot {
    network_identity::snapshot()
}

const MAX_SUBSCRIPTION_BYTES: usize = 8 * 1024 * 1024;

fn read_limited_subscription(mut reader: impl Read) -> Result<String, DesktopCommandError> {
    let mut bytes = Vec::new();
    reader
        .by_ref()
        .take((MAX_SUBSCRIPTION_BYTES + 1) as u64)
        .read_to_end(&mut bytes)
        .map_err(|error| command_error("invalid_config", error.to_string()))?;

    if bytes.len() > MAX_SUBSCRIPTION_BYTES {
        return Err(subscription_too_large());
    }

    String::from_utf8(bytes).map_err(|_| {
        command_error(
            "invalid_config",
            "Subscription is not valid UTF-8".to_string(),
        )
    })
}

fn subscription_too_large() -> DesktopCommandError {
    command_error(
        "invalid_config",
        "Subscription response is too large".to_string(),
    )
}

#[tauri::command]
async fn rahrow_xray_start(
    config: Value,
    app: tauri::AppHandle,
    state: State<'_, Mutex<XrayRuntimeState>>,
) -> Result<(), DesktopCommandError> {
    validate_xray_config(&config)?;

    let mut state = lock_state(&state)?;
    clear_exited_xray(&mut state);

    if state.child.is_some() {
        return Err(DesktopCommandError {
            code: "engine_already_running",
            message: "Xray is already running".to_string(),
        });
    }

    match start_xray_process(&config, &app, Arc::clone(&state.output)) {
        Ok((child, config_path)) => {
            state.child = Some(child);
            state.config_path = Some(config_path);
            state.last_error = None;

            Ok(())
        }
        Err(error) => {
            state.last_error = Some(error.message.clone());
            Err(error)
        }
    }
}

fn start_xray_process(
    config: &Value,
    app: &tauri::AppHandle,
    output: EngineOutputBuffer,
) -> Result<(Child, PathBuf), DesktopCommandError> {
    if config_uses_tun(Some(config)) {
        return Err(desktop_vpn_provider_unavailable());
    }

    let binary = xray_binary_path()?;
    terminate_orphaned_engines();
    if let Some(port) = proxy_listen_port(config) {
        ensure_local_port_free(port)?;
    }
    let config_path = write_xray_config(&pin_proxy_servers(config))?;

    let mut command = Command::new(&binary);
    command
        .arg("run")
        .arg("-config")
        .arg(&config_path)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(asset_dir) = xray_asset_dir(app, &binary) {
        command.current_dir(&asset_dir);
        command.env("XRAY_LOCATION_ASSET", &asset_dir);
        command.env("xray.location.asset", &asset_dir);
    }

    let mut child = command.spawn().map_err(|error| {
        let _ = fs::remove_file(&config_path);

        DesktopCommandError {
            code: "engine_start_failed",
            message: format!("Failed to start Xray binary '{}': {}", binary, error),
        }
    })?;
    attach_engine_output(&mut child, "xray", Arc::clone(&output));

    std::thread::sleep(Duration::from_millis(250));
    match child.try_wait() {
        Ok(Some(status)) => {
            let _ = fs::remove_file(&config_path);
            Err(engine_startup_exit_error(
                "Xray",
                &status.to_string(),
                &output,
            ))
        }
        Ok(None) => Ok((child, config_path)),
        Err(error) => {
            let _ = child.kill();
            let _ = fs::remove_file(&config_path);

            Err(DesktopCommandError {
                code: "engine_start_failed",
                message: format!("Failed to confirm Xray startup: {}", error),
            })
        }
    }
}

fn xray_asset_dir(app: &tauri::AppHandle, binary: &str) -> Option<PathBuf> {
    if let Ok(resource_dir) = app.path().resource_dir() {
        if resource_dir.join("geoip.dat").is_file() && resource_dir.join("geosite.dat").is_file() {
            return Some(resource_dir);
        }
    }

    Path::new(binary).parent().map(Path::to_path_buf)
}

#[tauri::command]
async fn rahrow_xray_stop(
    state: State<'_, Mutex<XrayRuntimeState>>,
) -> Result<(), DesktopCommandError> {
    let mut state = lock_state(&state)?;

    if let Some(mut child) = state.child.take() {
        child
            .kill()
            .map_err(|error| command_error("engine_stop_failed", error.to_string()))?;
        child
            .wait()
            .map_err(|error| command_error("engine_stop_failed", error.to_string()))?;
    }

    cleanup_xray_config(&mut state);
    state.last_error = None;

    Ok(())
}

#[tauri::command]
async fn rahrow_xray_status(
    state: State<'_, Mutex<XrayRuntimeState>>,
) -> Result<EngineRuntimeStatus, DesktopCommandError> {
    let mut state = lock_state(&state)?;
    clear_exited_xray(&mut state);

    Ok(EngineRuntimeStatus {
        running: state.child.is_some(),
    })
}

#[tauri::command]
async fn rahrow_sing_box_start(
    config: Value,
    state: State<'_, Mutex<SingBoxRuntimeState>>,
) -> Result<(), DesktopCommandError> {
    validate_sing_box_config(&config)?;
    let mut state = lock_sing_box_state(&state)?;
    clear_exited_sing_box(&mut state);

    if state.child.is_some() {
        return Err(command_error(
            "engine_already_running",
            "sing-box is already running".to_string(),
        ));
    }

    match start_sing_box_process(&config, Arc::clone(&state.output)) {
        Ok((child, config_path)) => {
            state.child = Some(child);
            state.config_path = Some(config_path);
            state.last_error = None;
            Ok(())
        }
        Err(error) => {
            state.last_error = Some(error.message.clone());
            Err(error)
        }
    }
}

#[tauri::command]
async fn rahrow_sing_box_stop(
    state: State<'_, Mutex<SingBoxRuntimeState>>,
) -> Result<(), DesktopCommandError> {
    let mut state = lock_sing_box_state(&state)?;

    if let Some(mut child) = state.child.take() {
        child
            .kill()
            .map_err(|error| command_error("engine_stop_failed", error.to_string()))?;
        child
            .wait()
            .map_err(|error| command_error("engine_stop_failed", error.to_string()))?;
    }

    cleanup_sing_box_config(&mut state);
    state.last_error = None;
    Ok(())
}

#[tauri::command]
async fn rahrow_sing_box_status(
    state: State<'_, Mutex<SingBoxRuntimeState>>,
) -> Result<EngineRuntimeStatus, DesktopCommandError> {
    let mut state = lock_sing_box_state(&state)?;
    clear_exited_sing_box(&mut state);

    Ok(EngineRuntimeStatus {
        running: state.child.is_some(),
    })
}

#[tauri::command]
async fn rahrow_desktop_diagnostics(
    app: tauri::AppHandle,
    state: State<'_, Mutex<XrayRuntimeState>>,
    sing_box_state: State<'_, Mutex<SingBoxRuntimeState>>,
    tun_state: State<'_, Mutex<TunRuntimeState>>,
) -> Result<DesktopDiagnostics, DesktopCommandError> {
    let mut state = lock_state(&state)?;
    clear_exited_xray(&mut state);
    let mut sing_box_state = lock_sing_box_state(&sing_box_state)?;
    clear_exited_sing_box(&mut sing_box_state);
    let mut tun_state = tun_state
        .lock()
        .map_err(|error| command_error("desktop_command_failed", error.to_string()))?;

    Ok(DesktopDiagnostics {
        capabilities: vec![
            engine_runtime_capability(
                "xray-sidecar",
                "Xray",
                state.child.is_some(),
                state.last_error.as_deref(),
                xray_binary_path(),
            ),
            engine_runtime_capability(
                "sing-box-sidecar",
                "sing-box",
                sing_box_state.child.is_some(),
                sing_box_state.last_error.as_deref(),
                sing_box_binary_path(),
            ),
            tun::capability_status(&mut tun_state),
            hev_tunnel_backend_capability(),
            system_proxy_status(),
            tray_status(&app),
            background_execution_capability(),
            autostart_status(),
        ],
        output: output_snapshot(&state.output)
            .into_iter()
            .chain(output_snapshot(&sing_box_state.output))
            .chain(output_snapshot(&tun_state.output))
            .collect(),
    })
}

fn background_execution_capability() -> NativeCapabilityStatus {
    NativeCapabilityStatus {
        capability: "background-execution",
        supported: true,
        enabled: Some(true),
        detail: Some(
            "RahRow keeps running after its window closes while the tray process remains open."
                .to_string(),
        ),
    }
}

fn config_uses_tun(config: Option<&Value>) -> bool {
    config
        .and_then(|value| value.get("inbounds"))
        .and_then(Value::as_array)
        .is_some_and(|inbounds| {
            inbounds.iter().any(|inbound| {
                inbound.get("protocol").and_then(Value::as_str) == Some("tun")
                    || inbound.get("type").and_then(Value::as_str) == Some("tun")
            })
        })
}

fn validate_xray_config(config: &Value) -> Result<(), DesktopCommandError> {
    let inbounds = config.get("inbounds").and_then(Value::as_array);
    let outbounds = config.get("outbounds").and_then(Value::as_array);

    if inbounds.is_none_or(Vec::is_empty) || outbounds.is_none_or(Vec::is_empty) {
        return Err(DesktopCommandError {
            code: "invalid_config",
            message: "Xray config requires at least one inbound and one outbound".to_string(),
        });
    }

    Ok(())
}

fn validate_sing_box_config(config: &Value) -> Result<(), DesktopCommandError> {
    let inbounds = config.get("inbounds").and_then(Value::as_array);
    let outbounds = config.get("outbounds").and_then(Value::as_array);

    if inbounds.is_none_or(Vec::is_empty) || outbounds.is_none_or(Vec::is_empty) {
        return Err(command_error(
            "invalid_config",
            "sing-box config requires at least one inbound and one outbound".to_string(),
        ));
    }

    Ok(())
}

fn start_sing_box_process(
    config: &Value,
    output: EngineOutputBuffer,
) -> Result<(Child, PathBuf), DesktopCommandError> {
    if config_uses_tun(Some(config)) {
        return Err(desktop_vpn_provider_unavailable());
    }

    let binary = sing_box_binary_path()?;
    terminate_orphaned_engines();
    if let Some(port) = proxy_listen_port(config) {
        ensure_local_port_free(port)?;
    }
    let pinned = pin_proxy_servers(config);
    let config_path = write_sing_box_config(&pinned)?;

    let mut child = Command::new(&binary)
        .arg("run")
        .arg("-c")
        .arg(&config_path)
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| {
            let _ = fs::remove_file(&config_path);
            command_error(
                "engine_start_failed",
                format!("Failed to start sing-box binary '{}': {}", binary, error),
            )
        })?;
    attach_engine_output(&mut child, "sing-box", Arc::clone(&output));

    std::thread::sleep(Duration::from_millis(250));
    match child.try_wait() {
        Ok(Some(status)) => {
            let _ = fs::remove_file(&config_path);
            Err(engine_startup_exit_error(
                "sing-box",
                &status.to_string(),
                &output,
            ))
        }
        Ok(None) => Ok((child, config_path)),
        Err(error) => {
            let _ = child.kill();
            let _ = fs::remove_file(&config_path);
            Err(command_error("engine_start_failed", error.to_string()))
        }
    }
}

fn proxy_listen_port(config: &Value) -> Option<u16> {
    let inbounds = config.get("inbounds")?.as_array()?;
    for inbound in inbounds {
        let kind = inbound
            .get("type")
            .or_else(|| inbound.get("protocol"))
            .and_then(Value::as_str);
        if kind == Some("tun") {
            continue;
        }
        for key in ["listen_port", "port"] {
            if let Some(port) = inbound.get(key).and_then(Value::as_u64) {
                if let Ok(port) = u16::try_from(port) {
                    return Some(port);
                }
            }
        }
    }
    None
}

fn ensure_local_port_free(port: u16) -> Result<(), DesktopCommandError> {
    match TcpListener::bind(SocketAddrV4::new(Ipv4Addr::LOCALHOST, port)) {
        Ok(listener) => {
            drop(listener);
            Ok(())
        }
        Err(_) => {
            let message = match loopback_port_occupant(port) {
                Some(app) => format!(
                    "Local port {port} is already in use by {app}. Stop {app}, or change RahRow's local port in Settings."
                ),
                None => format!(
                    "Local port {port} is already in use. Stop the other local proxy, or change RahRow's local port in Settings."
                ),
            };
            Err(command_error("engine_start_failed", message))
        }
    }
}

fn engine_startup_exit_error(
    engine: &str,
    status: &str,
    output: &EngineOutputBuffer,
) -> DesktopCommandError {
    // Give the stderr reader a beat to flush the fatal line.
    thread::sleep(Duration::from_millis(50));
    let detail = output_snapshot(output)
        .into_iter()
        .rev()
        .find(|line| line.stream == "stderr" && !line.line.is_empty())
        .map(|line| line.line);
    command_error(
        "engine_start_failed",
        match detail {
            Some(line) if line.to_ascii_lowercase().contains("address already in use") => {
                format!(
                    "{engine} could not bind its local port ({line}). Stop the other local proxy, or change RahRow's local port in Settings."
                )
            }
            Some(line) => format!("{engine} exited during startup with status {status}. {line}"),
            None => format!("{engine} exited during startup with status {status}"),
        },
    )
}

fn sing_box_binary_path() -> Result<String, DesktopCommandError> {
    if let Some(path) = env_engine_binary("RAHROW_SING_BOX_BINARY", "sing-box")? {
        return Ok(path);
    }

    if let Some(path) = bundled_engine_sidecar_path("sing-box") {
        return Ok(path);
    }

    Err(command_error(
        "invalid_config",
        "sing-box sidecar was not found. Set RAHROW_SING_BOX_BINARY to an explicit executable path or bundle the pinned artifact from engines/sing-box/runtime.json. Production builds do not search PATH."
            .to_string(),
    ))
}

/// Engine configs are named `rahrow-<engine>-<owner pid>-<suffix>.json`. An
/// engine whose owner is gone (crash, dev rebuild) still holds the local
/// port, and every new connect then fails to bind it.
fn orphaned_engine_owner(arg: &str) -> Option<u32> {
    let name = Path::new(arg).file_name()?.to_str()?;
    let rest = name
        .strip_prefix("rahrow-sing-box-")
        .or_else(|| name.strip_prefix("rahrow-xray-"))?;
    if !name.ends_with(".json") {
        return None;
    }
    rest.split('-').next()?.parse().ok()
}

#[cfg(unix)]
fn terminate_orphaned_engines() {
    let own_pid = std::process::id();
    let Ok(entries) = fs::read_dir("/proc") else {
        return;
    };
    for entry in entries.flatten() {
        let Some(pid) = entry.file_name().to_str().and_then(|pid| pid.parse::<i32>().ok()) else {
            continue;
        };
        let Ok(cmdline) = fs::read(entry.path().join("cmdline")) else {
            continue;
        };
        let owner = cmdline
            .split(|byte| *byte == 0)
            .find_map(|arg| orphaned_engine_owner(&String::from_utf8_lossy(arg)));
        let Some(owner) = owner else {
            continue;
        };
        if owner == own_pid || Path::new(&format!("/proc/{owner}")).exists() {
            continue;
        }
        let _ = Command::new("kill").arg(pid.to_string()).status();
        let deadline = std::time::Instant::now() + Duration::from_secs(3);
        while entry.path().exists() && std::time::Instant::now() < deadline {
            thread::sleep(Duration::from_millis(50));
        }
    }
}

#[cfg(not(unix))]
fn terminate_orphaned_engines() {}

/// Resolve proxy hostnames before the tunnel owns system DNS. Once the TUN
/// points systemd-resolved at itself, a hostname server lookup deadlocks:
/// the engine asks DNS, DNS enters the tunnel, and the tunnel needs the
/// engine to reach its own server.
fn pin_proxy_servers(config: &Value) -> Value {
    pin_proxy_servers_with(config, |host| {
        (host, 0)
            .to_socket_addrs()
            .ok()?
            .map(|address| address.ip())
            .find(IpAddr::is_ipv4)
    })
}

/// Swaps server hostnames for IPs. Engines derive the TLS SNI and the
/// WebSocket Host from the server address when those are unset, so the
/// original hostname is written into them first.
fn pin_proxy_servers_with(config: &Value, resolve: impl Fn(&str) -> Option<IpAddr>) -> Value {
    let mut config = config.clone();
    let Some(outbounds) = config.get_mut("outbounds").and_then(Value::as_array_mut) else {
        return config;
    };
    for outbound in outbounds {
        if let Some(host) = pin_address(outbound, "server", &resolve) {
            keep_sing_box_host(outbound, &host);
            continue;
        }
        let mut pinned_host = None;
        for list in ["vnext", "servers"] {
            let Some(entries) = outbound
                .get_mut("settings")
                .and_then(|settings| settings.get_mut(list))
                .and_then(Value::as_array_mut)
            else {
                continue;
            };
            for entry in entries {
                if let Some(host) = pin_address(entry, "address", &resolve) {
                    pinned_host.get_or_insert(host);
                }
            }
        }
        if let Some(host) = pinned_host {
            keep_xray_host(outbound, &host);
        }
    }
    config
}

fn pin_address(
    object: &mut Value,
    key: &str,
    resolve: &impl Fn(&str) -> Option<IpAddr>,
) -> Option<String> {
    let host = object.get(key)?.as_str()?.to_string();
    if host.parse::<IpAddr>().is_ok() {
        return None;
    }
    let ip = resolve(&host)?;
    object[key] = Value::String(ip.to_string());
    Some(host)
}

fn set_if_missing(object: &mut Value, key: &str, host: &str) {
    let missing = object
        .get(key)
        .and_then(Value::as_str)
        .map_or(true, str::is_empty);
    if missing && object.is_object() {
        object[key] = Value::String(host.to_string());
    }
}

fn keep_sing_box_host(outbound: &mut Value, host: &str) {
    if let Some(tls) = outbound.get_mut("tls") {
        if tls.get("enabled").and_then(Value::as_bool) == Some(true) {
            set_if_missing(tls, "server_name", host);
        }
    }
    let Some(transport) = outbound.get_mut("transport") else {
        return;
    };
    match transport.get("type").and_then(Value::as_str) {
        Some("ws") => {
            if transport.get("headers").is_none() {
                transport["headers"] = serde_json::json!({});
            }
            set_if_missing(&mut transport["headers"], "Host", host);
        }
        Some("httpupgrade") | Some("http") => set_if_missing(transport, "host", host),
        _ => {}
    }
}

fn keep_xray_host(outbound: &mut Value, host: &str) {
    let Some(stream) = outbound.get_mut("streamSettings") else {
        return;
    };
    if stream.get("security").and_then(Value::as_str) == Some("tls") {
        if stream.get("tlsSettings").is_none() {
            stream["tlsSettings"] = serde_json::json!({});
        }
        set_if_missing(&mut stream["tlsSettings"], "serverName", host);
    }
    let settings_key = match stream.get("network").and_then(Value::as_str) {
        Some("ws") => "wsSettings",
        Some("httpupgrade") => "httpupgradeSettings",
        Some("xhttp") | Some("splithttp") => "xhttpSettings",
        _ => return,
    };
    let header_host = stream
        .get(settings_key)
        .and_then(|settings| settings.get("headers"))
        .and_then(|headers| headers.get("Host"))
        .is_some();
    if header_host {
        return;
    }
    if stream.get(settings_key).is_none() {
        stream[settings_key] = serde_json::json!({});
    }
    set_if_missing(&mut stream[settings_key], "host", host);
}

fn write_sing_box_config(config: &Value) -> Result<PathBuf, DesktopCommandError> {
    let path = env::temp_dir().join(format!(
        "rahrow-sing-box-{}-{}.json",
        std::process::id(),
        monotonic_suffix()
    ));
    let config_text = serde_json::to_string_pretty(config)
        .map_err(|error| command_error("invalid_config", error.to_string()))?;
    fs::write(&path, config_text)
        .map_err(|error| command_error("engine_start_failed", error.to_string()))?;
    Ok(path)
}

fn clear_exited_sing_box(state: &mut SingBoxRuntimeState) {
    let Some(child) = state.child.as_mut() else {
        return;
    };

    match child.try_wait() {
        Ok(Some(status)) => {
            state.last_error = if status.success() {
                None
            } else {
                Some(format!("sing-box exited with status {status}"))
            };
            state.child = None;
            cleanup_sing_box_config(state);
        }
        Ok(None) => {}
        Err(error) => {
            state.last_error = Some(error.to_string());
            state.child = None;
            cleanup_sing_box_config(state);
        }
    }
}

fn cleanup_sing_box_config(state: &mut SingBoxRuntimeState) {
    if let Some(path) = state.config_path.take() {
        let _ = fs::remove_file(path);
    }
}

fn xray_binary_path() -> Result<String, DesktopCommandError> {
    // Keep this aligned with packages/engine Xray runtime resolution:
    // engines/xray/runtime.json plus RAHROW_XRAY_BINARY. Production never
    // searches PATH for a host xray binary.
    if let Some(path) = env_engine_binary("RAHROW_XRAY_BINARY", "xray")? {
        return Ok(path);
    }

    if let Some(path) = bundled_engine_sidecar_path("xray") {
        return Ok(path);
    }

    Err(DesktopCommandError {
        code: "invalid_config",
        message: "Xray sidecar was not found. Set RAHROW_XRAY_BINARY to an explicit executable path or bundle the pinned artifact from engines/xray/runtime.json. Production builds do not search PATH.".to_string(),
    })
}

fn env_engine_binary(
    environment_variable: &str,
    engine: &str,
) -> Result<Option<String>, DesktopCommandError> {
    match env::var(environment_variable) {
        Ok(value) if !value.trim().is_empty() => {
            let value = value.trim().to_string();
            if !value.contains('/') && !value.contains('\\') {
                return Err(DesktopCommandError {
                    code: "invalid_config",
                    message: format!(
                        "{environment_variable} must be an explicit filesystem path. Production builds do not search PATH."
                    ),
                });
            }

            if !Path::new(&value).is_file() {
                return Err(DesktopCommandError {
                    code: "invalid_config",
                    message: format!(
                        "{environment_variable} does not point to an executable {engine} file: {value}."
                    ),
                });
            }

            Ok(Some(value))
        }
        _ => Ok(None),
    }
}

fn bundled_engine_sidecar_path(engine: &str) -> Option<String> {
    let mut dir = env::current_exe().ok()?;
    dir.pop();

    for name in engine_sidecar_file_names_for(engine, env::consts::OS, env::consts::ARCH) {
        let candidate = dir.join(name);
        if candidate.is_file() {
            return Some(candidate.to_string_lossy().into_owned());
        }
    }

    None
}

fn engine_sidecar_file_names_for(engine: &str, os: &str, arch: &str) -> Vec<String> {
    let triple = match (os, arch) {
        ("macos", "aarch64") => "aarch64-apple-darwin",
        ("macos", "x86_64") => "x86_64-apple-darwin",
        ("linux", "aarch64") => "aarch64-unknown-linux-gnu",
        ("linux", "x86_64") => "x86_64-unknown-linux-gnu",
        ("windows", "x86_64") => "x86_64-pc-windows-msvc",
        _ => "",
    };

    if os == "windows" {
        if triple.is_empty() {
            vec![format!("{engine}.exe")]
        } else {
            vec![format!("{engine}-{triple}.exe"), format!("{engine}.exe")]
        }
    } else if triple.is_empty() {
        vec![engine.to_string()]
    } else {
        vec![format!("{engine}-{triple}"), engine.to_string()]
    }
}

fn write_xray_config(config: &Value) -> Result<PathBuf, DesktopCommandError> {
    let path = env::temp_dir().join(format!(
        "rahrow-xray-{}-{}.json",
        std::process::id(),
        monotonic_suffix()
    ));
    let config_text =
        serde_json::to_string_pretty(config).map_err(|error| DesktopCommandError {
            code: "invalid_config",
            message: error.to_string(),
        })?;

    fs::write(&path, config_text).map_err(|error| DesktopCommandError {
        code: "engine_start_failed",
        message: error.to_string(),
    })?;

    Ok(path)
}

fn monotonic_suffix() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_millis())
        .unwrap_or_default()
}

const MAX_ENGINE_OUTPUT_LINES: usize = 500;

fn attach_engine_output(child: &mut Child, source: &'static str, output: EngineOutputBuffer) {
    if let Some(stdout) = child.stdout.take() {
        spawn_output_reader(stdout, source, "stdout", Arc::clone(&output));
    }
    if let Some(stderr) = child.stderr.take() {
        spawn_output_reader(stderr, source, "stderr", output);
    }
}

fn spawn_output_reader(
    reader: impl Read + Send + 'static,
    source: &'static str,
    stream: &'static str,
    output: EngineOutputBuffer,
) {
    thread::spawn(move || {
        for line in BufReader::new(reader).lines().map_while(Result::ok) {
            if !line.is_empty() {
                append_engine_output(&output, source, stream, line);
            }
        }
    });
}

fn append_engine_output(
    output: &EngineOutputBuffer,
    source: &'static str,
    stream: &'static str,
    line: String,
) {
    let Ok(mut output) = output.lock() else {
        return;
    };
    output.sequence += 1;
    let sequence = output.sequence;
    output.lines.push_back(NativeOutputLine {
        sequence,
        source,
        stream,
        line: redact_engine_output(&line),
        observed_at: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|duration| duration.as_millis() as u64)
            .unwrap_or_default(),
    });
    while output.lines.len() > MAX_ENGINE_OUTPUT_LINES {
        output.lines.pop_front();
    }
}

fn redact_engine_output(line: &str) -> String {
    let lower = line.to_ascii_lowercase();
    for marker in ["authorization:", "authorization=", "api-key:", "api_key="] {
        if let Some(index) = lower.find(marker) {
            return format!(
                "{}{}[redacted]",
                &line[..index],
                &line[index..index + marker.len()]
            );
        }
    }
    if let Some(index) = lower.find("bearer ") {
        return format!("{}Bearer [redacted]", &line[..index]);
    }

    line.split_whitespace()
        .map(redact_engine_output_token)
        .collect::<Vec<_>>()
        .join(" ")
}

fn redact_engine_output_token(token: &str) -> String {
    let lower = token.to_ascii_lowercase();
    for marker in [
        "password=",
        "passwd=",
        "token=",
        "secret=",
        "uuid=",
        "password\":\"",
        "token\":\"",
        "secret\":\"",
        "uuid\":\"",
    ] {
        if let Some(index) = lower.find(marker) {
            return format!("{}[redacted]", &token[..index + marker.len()]);
        }
    }

    if let Some(scheme_end) = token.find("://") {
        let authority_start = scheme_end + 3;
        let authority_end = token[authority_start..]
            .find('/')
            .map(|index| authority_start + index)
            .unwrap_or(token.len());
        if let Some(at) = token[authority_start..authority_end].rfind('@') {
            let credentials_end = authority_start + at + 1;
            return format!(
                "{}[redacted]@{}",
                &token[..authority_start],
                &token[credentials_end..]
            );
        }
    }

    token.to_string()
}

fn output_snapshot(output: &EngineOutputBuffer) -> Vec<NativeOutputLine> {
    output
        .lock()
        .map(|output| output.lines.iter().cloned().collect())
        .unwrap_or_default()
}

fn clear_exited_xray(state: &mut XrayRuntimeState) {
    let Some(child) = state.child.as_mut() else {
        return;
    };

    match child.try_wait() {
        Ok(Some(status)) => {
            state.last_error = if status.success() {
                None
            } else {
                Some(format!("Xray exited with status {status}"))
            };
            state.child = None;
            cleanup_xray_config(state);
        }
        Ok(None) => {}
        Err(error) => {
            state.last_error = Some(error.to_string());
            state.child = None;
            cleanup_xray_config(state);
        }
    }
}

fn cleanup_xray_config(state: &mut XrayRuntimeState) {
    if let Some(path) = state.config_path.take() {
        let _ = fs::remove_file(path);
    }
}

fn desktop_vpn_provider_unavailable() -> DesktopCommandError {
    command_error(
        "vpn_provider_unavailable",
        desktop_vpn_provider_detail().to_string(),
    )
}

#[cfg(target_os = "macos")]
fn desktop_vpn_provider_detail() -> &'static str {
    "This macOS build has no signed Network Extension packet-tunnel provider. VPN mode is unavailable; choose Proxy explicitly or install a build signed with the Network Extension entitlement."
}

fn hev_tunnel_backend_capability() -> NativeCapabilityStatus {
    NativeCapabilityStatus {
        capability: "hev-socks5-tunnel",
        supported: false,
        enabled: Some(false),
        detail: Some(hev_tunnel_backend_detail().to_string()),
    }
}

#[cfg(target_os = "macos")]
fn hev_tunnel_backend_detail() -> &'static str {
    "HEV tunnel support is in development for macOS. This build has no signed Network Extension descriptor bridge."
}

#[cfg(target_os = "windows")]
fn hev_tunnel_backend_detail() -> &'static str {
    "HEV tunnel support is in development for Windows. This build has no installed privileged Wintun service."
}

#[cfg(target_os = "linux")]
fn hev_tunnel_backend_detail() -> &'static str {
    "HEV tunnel support is in development for Linux. This build has no packaged privileged TUN service."
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
fn hev_tunnel_backend_detail() -> &'static str {
    "HEV tunnel support is unavailable on this desktop platform."
}

#[cfg(target_os = "windows")]
fn desktop_vpn_provider_detail() -> &'static str {
    "This Windows build has no installed privileged Wintun service integration. VPN mode is unavailable; choose Proxy explicitly."
}

#[cfg(target_os = "linux")]
fn desktop_vpn_provider_detail() -> &'static str {
    "This Linux build has no packaged TUN capability helper or service. VPN mode is unavailable; choose Proxy explicitly."
}

#[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
fn desktop_vpn_provider_detail() -> &'static str {
    "This desktop build has no registered OS tunnel provider. VPN mode is unavailable; choose Proxy explicitly."
}

fn engine_runtime_capability(
    capability: &'static str,
    engine: &'static str,
    running: bool,
    last_error: Option<&str>,
    binary: Result<String, DesktopCommandError>,
) -> NativeCapabilityStatus {
    let supported = binary.is_ok();
    let detail = if running {
        format!("{engine} sidecar process is running.")
    } else if let Some(error) = last_error {
        format!("{engine} stopped after an error: {error}")
    } else {
        match binary {
            Ok(_) => format!("{engine} is available and stopped."),
            Err(error) => error.message,
        }
    };

    NativeCapabilityStatus {
        capability,
        supported,
        enabled: Some(running),
        detail: Some(detail),
    }
}

fn lock_state<'a>(
    state: &'a State<'_, Mutex<XrayRuntimeState>>,
) -> Result<std::sync::MutexGuard<'a, XrayRuntimeState>, DesktopCommandError> {
    state.lock().map_err(|error| DesktopCommandError {
        code: "desktop_command_failed",
        message: error.to_string(),
    })
}

fn lock_sing_box_state<'a>(
    state: &'a State<'_, Mutex<SingBoxRuntimeState>>,
) -> Result<std::sync::MutexGuard<'a, SingBoxRuntimeState>, DesktopCommandError> {
    state
        .lock()
        .map_err(|error| command_error("desktop_command_failed", error.to_string()))
}

pub(crate) fn unsupported_capability(capability: &'static str) -> DesktopCommandError {
    command_error(
        "unsupported_capability",
        format!("Desktop capability is not available: {capability}"),
    )
}

pub(crate) fn unsupported_status(
    capability: &'static str,
    detail: Option<String>,
) -> NativeCapabilityStatus {
    NativeCapabilityStatus {
        capability,
        supported: false,
        enabled: Some(false),
        detail,
    }
}

pub(crate) fn capability_status(
    capability: &'static str,
    supported: bool,
    enabled: Option<bool>,
    detail: Option<String>,
) -> NativeCapabilityStatus {
    NativeCapabilityStatus {
        capability,
        supported,
        enabled,
        detail,
    }
}

pub(crate) fn command_error(code: &'static str, message: String) -> DesktopCommandError {
    DesktopCommandError { code, message }
}

fn main() {
    tun::run_helper_if_requested();

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .manage(Mutex::new(XrayRuntimeState::default()))
        .manage(Mutex::new(SingBoxRuntimeState::default()))
        .manage(Mutex::new(TunRuntimeState::default()))
        .setup(|app| {
            if let Err(error) = setup_tray(app) {
                eprintln!("RahRow tray is unavailable: {error}");
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            rahrow_http_get,
            rahrow_routed_http_get,
            rahrow_network_identity,
            rahrow_xray_start,
            rahrow_xray_stop,
            rahrow_xray_status,
            rahrow_sing_box_start,
            rahrow_sing_box_stop,
            rahrow_sing_box_status,
            rahrow_tcp_probe,
            rahrow_loopback_port_occupant,
            rahrow_autostart_enable,
            rahrow_autostart_disable,
            rahrow_autostart_status,
            rahrow_tray_show,
            rahrow_tray_hide,
            rahrow_tray_status,
            rahrow_tray_sync,
            rahrow_system_proxy_enable,
            rahrow_system_proxy_disable,
            rahrow_system_proxy_status,
            rahrow_tun_start,
            rahrow_tun_stop,
            rahrow_desktop_diagnostics
        ])
        .run(tauri::generate_context!())
        .expect("failed to run tauri application")
}

#[cfg(test)]
mod tests {
    use super::{
        append_engine_output, background_execution_capability, command_error, config_uses_tun,
        desktop_vpn_provider_unavailable, engine_runtime_capability, engine_sidecar_file_names_for,
        ensure_local_port_free, hev_tunnel_backend_capability, orphaned_engine_owner,
        pin_proxy_servers_with, proxy_listen_port, output_snapshot, read_limited_subscription,
        redact_engine_output, valid_loopback_socks_url, validate_routed_http_input,
        validate_subscription_authorization, EngineOutputState, MAX_ENGINE_OUTPUT_LINES,
        MAX_SUBSCRIPTION_BYTES,
    };
    use serde_json::json;
    use std::sync::{Arc, Mutex};

    #[test]
    fn reads_proxy_listen_ports_and_rejects_occupied_ports() {
        assert_eq!(
            proxy_listen_port(&json!({
                "inbounds": [{ "type": "mixed", "listen": "127.0.0.1", "listen_port": 18081 }]
            })),
            Some(18081)
        );
        assert_eq!(
            proxy_listen_port(&json!({
                "inbounds": [{ "protocol": "socks", "listen": "127.0.0.1", "port": 18082 }]
            })),
            Some(18082)
        );
        assert_eq!(
            proxy_listen_port(&json!({
                "inbounds": [{ "type": "tun" }, { "type": "mixed", "listen_port": 18083 }]
            })),
            Some(18083)
        );

        let listener = std::net::TcpListener::bind("127.0.0.1:18084").unwrap();
        let error = ensure_local_port_free(18084).unwrap_err();
        assert_eq!(error.code, "engine_start_failed");
        assert!(error.message.contains("18084"));
        assert!(error.message.contains("already in use"));
        drop(listener);
        assert!(ensure_local_port_free(18084).is_ok());
    }

    #[test]
    fn sidecar_names_include_macos_arm_triple() {
        assert_eq!(
            engine_sidecar_file_names_for("xray", "macos", "aarch64"),
            vec!["xray-aarch64-apple-darwin".to_string(), "xray".to_string()]
        );
        assert_eq!(
            engine_sidecar_file_names_for("sing-box", "windows", "x86_64"),
            vec![
                "sing-box-x86_64-pc-windows-msvc.exe".to_string(),
                "sing-box.exe".to_string()
            ]
        );
    }

    #[test]
    fn engine_configs_name_their_owning_app_process() {
        assert_eq!(
            orphaned_engine_owner("/tmp/rahrow-sing-box-282588-1790534579393.json"),
            Some(282588)
        );
        assert_eq!(orphaned_engine_owner("/tmp/rahrow-xray-42-7.json"), Some(42));
        assert_eq!(orphaned_engine_owner("/run/user/1000/rahrow-tun-42-7.json"), None);
        assert_eq!(orphaned_engine_owner("run"), None);
    }

    #[test]
    fn pins_proxy_hostnames_so_the_tunnel_cannot_deadlock_dns() {
        let pinned = pin_proxy_servers_with(
            &json!({
                "outbounds": [
                    { "type": "shadowsocks", "server": "edge.example", "server_port": 443 },
                    { "type": "shadowsocks", "server": "203.0.113.10", "server_port": 443 },
                    {
                        "type": "trojan",
                        "server": "edge.example",
                        "tls": { "enabled": true },
                        "transport": { "type": "ws", "path": "/ws" }
                    },
                    { "type": "direct" }
                ]
            }),
            fake_resolver,
        );
        assert_eq!(pinned["outbounds"][0]["server"], "198.51.100.4");
        assert_eq!(pinned["outbounds"][1]["server"], "203.0.113.10");
        assert_eq!(pinned["outbounds"][2]["server"], "198.51.100.4");
        assert_eq!(pinned["outbounds"][2]["tls"]["server_name"], "edge.example");
        assert_eq!(pinned["outbounds"][2]["transport"]["headers"]["Host"], "edge.example");
        assert!(pinned["outbounds"][3].get("server").is_none());
    }

    fn fake_resolver(host: &str) -> Option<std::net::IpAddr> {
        (host == "edge.example").then(|| "198.51.100.4".parse().unwrap())
    }

    #[test]
    fn pins_xray_server_addresses_and_keeps_tls_names() {
        let pinned = pin_proxy_servers_with(
            &json!({
                "outbounds": [
                    {
                        "protocol": "vless",
                        "settings": { "vnext": [{ "address": "edge.example", "port": 443 }] },
                        "streamSettings": { "network": "ws", "security": "tls", "wsSettings": { "path": "/ws" } }
                    },
                    {
                        "protocol": "trojan",
                        "settings": { "servers": [{ "address": "edge.example", "port": 443 }] },
                        "streamSettings": {
                            "network": "tcp",
                            "security": "tls",
                            "tlsSettings": { "serverName": "sni.example" }
                        }
                    },
                    { "protocol": "freedom", "tag": "direct" }
                ]
            }),
            fake_resolver,
        );
        let vless = &pinned["outbounds"][0];
        assert_eq!(vless["settings"]["vnext"][0]["address"], "198.51.100.4");
        assert_eq!(vless["streamSettings"]["tlsSettings"]["serverName"], "edge.example");
        assert_eq!(vless["streamSettings"]["wsSettings"]["host"], "edge.example");
        let trojan = &pinned["outbounds"][1];
        assert_eq!(trojan["settings"]["servers"][0]["address"], "198.51.100.4");
        assert_eq!(trojan["streamSettings"]["tlsSettings"]["serverName"], "sni.example");
    }

    #[test]
    fn detects_tun_for_both_engine_config_shapes() {
        assert!(config_uses_tun(Some(&json!({
            "inbounds": [{ "protocol": "tun" }]
        }))));
        assert!(config_uses_tun(Some(&json!({
            "inbounds": [{ "type": "tun" }]
        }))));
        assert!(!config_uses_tun(Some(&json!({
            "inbounds": [{ "type": "mixed" }]
        }))));
    }

    #[test]
    fn unavailable_desktop_vpn_provider_fails_closed_with_actionable_error() {
        let error = desktop_vpn_provider_unavailable();

        assert_eq!(error.code, "vpn_provider_unavailable");
        assert!(error.message.contains("VPN mode is unavailable"));
        assert!(error.message.contains("Proxy explicitly"));
    }

    #[test]
    fn hev_tunnel_backend_stays_disabled_without_a_privileged_desktop_provider() {
        let capability = hev_tunnel_backend_capability();

        assert_eq!(capability.capability, "hev-socks5-tunnel");
        assert!(!capability.supported);
        assert_eq!(capability.enabled, Some(false));
        assert!(capability
            .detail
            .as_deref()
            .is_some_and(|detail| detail.contains("in development")));
    }

    #[test]
    fn desktop_background_execution_requires_the_tray_process_to_remain_open() {
        let capability = background_execution_capability();

        assert_eq!(capability.capability, "background-execution");
        assert!(capability.supported);
        assert_eq!(capability.enabled, Some(true));
        assert!(capability
            .detail
            .as_deref()
            .is_some_and(|detail| detail.contains("tray process remains open")));
    }

    #[test]
    fn diagnostics_distinguish_stopped_available_and_missing_sidecars() {
        let stopped = engine_runtime_capability(
            "xray-sidecar",
            "Xray",
            false,
            None,
            Ok("/bundle/xray".to_string()),
        );
        assert!(stopped.supported);
        assert_eq!(stopped.enabled, Some(false));
        assert_eq!(
            stopped.detail.as_deref(),
            Some("Xray is available and stopped.")
        );

        let missing = engine_runtime_capability(
            "xray-sidecar",
            "Xray",
            false,
            None,
            Err(command_error(
                "invalid_config",
                "Set RAHROW_XRAY_BINARY or bundle engines/xray/runtime.json.".to_string(),
            )),
        );
        assert!(!missing.supported);
        assert_eq!(missing.enabled, Some(false));
        assert!(missing
            .detail
            .as_deref()
            .is_some_and(|detail| detail.contains("RAHROW_XRAY_BINARY")));
    }

    #[test]
    fn subscription_reader_accepts_large_bounded_bodies() {
        let body = vec![b'a'; 1_056_130];
        let result = read_limited_subscription(body.as_slice());

        assert!(result.is_ok());
        assert_eq!(result.unwrap_or_default().len(), body.len());
    }

    #[test]
    fn subscription_reader_rejects_unbounded_bodies() {
        let body = vec![b'a'; MAX_SUBSCRIPTION_BYTES + 1];
        let error = read_limited_subscription(body.as_slice()).expect_err("body must be rejected");

        assert_eq!(error.code, "invalid_config");
        assert_eq!(error.message, "Subscription response is too large");
    }

    #[test]
    fn subscription_authorization_rejects_header_injection() {
        assert!(validate_subscription_authorization(Some("Bearer token")).is_ok());
        for value in ["", "Bearer token\r\nInjected: value"] {
            let error = validate_subscription_authorization(Some(value))
                .expect_err("invalid authorization must be rejected");
            assert_eq!(error.code, "invalid_config");
            assert_eq!(error.message, "Subscription credential is invalid");
        }
    }

    #[test]
    fn routed_http_accepts_only_allowlisted_endpoints_and_loopback_socks() {
        assert!(validate_routed_http_input(
            "https://www.cloudflare.com/cdn-cgi/trace",
            "socks5://127.0.0.1:10808",
            8_000,
            4_096,
            None,
        )
        .is_ok());
        assert!(valid_loopback_socks_url("socks5://localhost:1"));
        assert!(valid_loopback_socks_url("socks5://[::1]:65535"));

        for proxy in [
            "socks5://user:secret@127.0.0.1:10808",
            "socks5://192.168.1.5:10808",
            "http://127.0.0.1:10808",
            "socks5://127.0.0.1:0",
            "socks5://127.0.0.1:10808/path",
        ] {
            assert!(!valid_loopback_socks_url(proxy), "accepted {proxy}");
        }
        assert!(validate_routed_http_input(
            "https://attacker.invalid/",
            "socks5://127.0.0.1:10808",
            8_000,
            4_096,
            None,
        )
        .is_err());
    }

    #[test]
    fn engine_output_is_bounded_and_keeps_stream_metadata() {
        let output = Arc::new(Mutex::new(EngineOutputState::default()));
        for index in 0..=MAX_ENGINE_OUTPUT_LINES {
            append_engine_output(&output, "xray", "stderr", format!("line {index}"));
        }

        let lines = output_snapshot(&output);
        assert_eq!(lines.len(), MAX_ENGINE_OUTPUT_LINES);
        assert_eq!(lines.first().map(|line| line.line.as_str()), Some("line 1"));
        assert_eq!(lines.last().map(|line| line.source), Some("xray"));
        assert_eq!(lines.last().map(|line| line.stream), Some("stderr"));
    }

    #[test]
    fn engine_output_redacts_credentials_before_diagnostics_surface_it() {
        assert_eq!(
            redact_engine_output(
                "failed https://alice:secret@example.com/path token=abc password\":\"hunter2\""
            ),
            "failed https://[redacted]@example.com/path token=[redacted] password\":\"[redacted]"
        );
        assert_eq!(
            redact_engine_output("request Authorization: Bearer abc.def"),
            "request Authorization:[redacted]"
        );
    }
}
