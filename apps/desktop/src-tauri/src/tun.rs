use serde::Deserialize;
use serde_json::{json, Value};
use std::{net::Ipv4Addr, sync::Mutex};
use tauri::Manager;

use crate::{command_error, DesktopCommandError, EngineOutputBuffer, NativeCapabilityStatus};

pub(crate) const HELPER_FLAG: &str = "--rahrow-tun-helper";
const TUN_INTERFACE: &str = "rahrow0";
/// Avoid Docker's 172.17–172.19 and FakeIP's 198.18.0.0/15.
const TUN_ADDRESS: &str = "10.255.85.1/30";
/// Peer address inside the /30. The interface's own address (.1) is local, so
/// the kernel would answer DNS sent to it without it ever entering the TUN.
const TUN_GATEWAY: &str = "10.255.85.2";
const REMOTE_DNS: &str = "1.1.1.1";
/// Censored lookups in Iran answer with this private block.
const POISONED_DNS_RANGE: &str = "10.10.34.0/24";
const FALLBACK_BOOTSTRAP_DNS: Ipv4Addr = Ipv4Addr::new(8, 8, 8, 8);

#[derive(Default)]
pub(crate) struct TunRuntimeState {
    #[cfg(target_os = "linux")]
    process: Option<linux::TunProcess>,
    last_error: Option<String>,
    pub(crate) output: EngineOutputBuffer,
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct TunStartInput {
    socks_port: u16,
    server_host: String,
    server_port: u16,
}

pub(crate) struct TunConfigInput<'a> {
    pub socks_port: u16,
    pub server_host: &'a str,
    pub server_addresses: &'a [Ipv4Addr],
    pub bypass_process_paths: &'a [String],
    pub bootstrap_dns: Ipv4Addr,
}

/// Same shape Happ and v2rayN use on Linux: one TUN, sniff the real hostname,
/// answer DNS through the proxy, and nft-redirect the systemd-resolved stub
/// (127.0.0.53) so browsers cannot keep Shecan's poisoned answers.
pub(crate) fn build_tun_config(input: &TunConfigInput) -> Value {
    let server_is_ip = input.server_host.parse::<std::net::IpAddr>().is_ok();
    let mut dns = json!({
        "independent_cache": true,
        "strategy": "ipv4_only",
        "final": "dns-remote",
        "servers": [
            {
                "type": "https",
                "tag": "dns-remote",
                "server": REMOTE_DNS,
                "detour": "proxy"
            },
            {
                "type": "udp",
                "tag": "dns-bootstrap",
                "server": input.bootstrap_dns.to_string()
            }
        ]
    });
    if !server_is_ip {
        dns["rules"] = json!([{ "domain": [input.server_host], "server": "dns-bootstrap" }]);
    }

    // 127.0.0.1 stays local (engine SOCKS + the dev UI). 127.0.0.53 must not:
    // auto_redirect sends that stub into the tunnel so every app's DNS is hijacked.
    let mut route_exclude = vec![Value::String("127.0.0.1/32".to_string())];
    for address in input.server_addresses {
        route_exclude.push(Value::String(format!("{address}/32")));
    }

    let tun = json!({
        "type": "tun",
        "tag": "tun-in",
        "interface_name": TUN_INTERFACE,
        "address": [TUN_ADDRESS],
        "mtu": 1500,
        "auto_route": true,
        "strict_route": true,
        "auto_redirect": true,
        "stack": "gvisor",
        "route_exclude_address": route_exclude
    });

    let mut rules = Vec::new();
    if !input.bypass_process_paths.is_empty() {
        rules.push(json!({ "process_path": input.bypass_process_paths, "outbound": "direct" }));
    }
    // DoH to the remote resolver is itself DNS. If sniff + hijack-dns see it,
    // the resolver query is captured and never leaves, and every name fails.
    rules.push(json!({
        "ip_cidr": [format!("{REMOTE_DNS}/32")],
        "port": [443],
        "outbound": "proxy"
    }));
    rules.push(json!({ "action": "sniff" }));
    rules.push(json!({ "protocol": "dns", "action": "hijack-dns" }));
    // Sniff learns the real name (SNI) even when the ISP handed out a fake IP.
    // Resolve that name through the proxy before dialing, or the tunnel
    // connects to the poisoned address.
    rules.push(json!({
        "action": "resolve",
        "server": "dns-remote",
        "strategy": "ipv4_only"
    }));
    rules.push(json!({ "ip_cidr": [POISONED_DNS_RANGE], "outbound": "proxy" }));

    json!({
        "log": { "level": "warn", "timestamp": true },
        "dns": dns,
        "inbounds": [tun],
        "outbounds": [
            {
                "type": "socks",
                "tag": "proxy",
                "server": "127.0.0.1",
                "server_port": input.socks_port,
                "version": "5",
                "udp_fragment": true,
                "domain_resolver": {
                    "server": "dns-remote",
                    "strategy": "ipv4_only"
                }
            },
            { "type": "direct", "tag": "direct" }
        ],
        "route": {
            "auto_detect_interface": true,
            "default_domain_resolver": "dns-remote",
            "final": "proxy",
            "rules": rules
        }
    })
}

/// Reads the network's real upstream resolver; loopback stubs would loop back through the TUN.
pub(crate) fn bootstrap_dns_from(resolv_conf_contents: &[&str]) -> Ipv4Addr {
    resolv_conf_contents
        .iter()
        .flat_map(|contents| contents.lines())
        .filter_map(|line| {
            let mut parts = line.split_whitespace();
            (parts.next() == Some("nameserver"))
                .then(|| parts.next())
                .flatten()
                .and_then(|value| value.parse::<Ipv4Addr>().ok())
        })
        .find(|address| !address.is_loopback() && !address.is_unspecified())
        .unwrap_or(FALLBACK_BOOTSTRAP_DNS)
}

fn validate_start_input(input: &TunStartInput) -> Result<(), DesktopCommandError> {
    let host = input.server_host.trim();
    if input.socks_port == 0
        || input.server_port == 0
        || host.is_empty()
        || host.len() > 253
        || host.chars().any(|c| c.is_whitespace() || c.is_control())
    {
        return Err(command_error(
            "invalid_config",
            "VPN tunnel requires a local SOCKS port and a valid server address.".to_string(),
        ));
    }
    Ok(())
}

pub(crate) fn capability_status(state: &mut TunRuntimeState) -> NativeCapabilityStatus {
    #[cfg(target_os = "linux")]
    {
        linux::clear_exited(state);
        let running = state.process.is_some();
        let available = linux::availability();
        let detail = if running {
            "The RahRow VPN tunnel is active.".to_string()
        } else if let Some(error) = &state.last_error {
            format!("The VPN tunnel stopped after an error: {error}")
        } else {
            match &available {
                Ok(()) => "The RahRow VPN tunnel is available and stopped.".to_string(),
                Err(error) => error.clone(),
            }
        };
        NativeCapabilityStatus {
            capability: "vpn-tunnel",
            supported: available.is_ok(),
            enabled: Some(running),
            detail: Some(detail),
        }
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = &state.last_error;
        crate::unsupported_status(
            "vpn-tunnel",
            Some(crate::desktop_vpn_provider_detail().to_string()),
        )
    }
}

#[tauri::command]
pub(crate) async fn rahrow_tun_start(
    app: tauri::AppHandle,
    input: TunStartInput,
) -> Result<(), DesktopCommandError> {
    validate_start_input(&input)?;
    #[cfg(target_os = "linux")]
    {
        tauri::async_runtime::spawn_blocking(move || {
            let state = app.state::<Mutex<TunRuntimeState>>();
            let mut state = state
                .lock()
                .map_err(|error| command_error("desktop_command_failed", error.to_string()))?;
            linux::start(&mut state, &input)
        })
        .await
        .map_err(|error| command_error("desktop_command_failed", error.to_string()))?
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = app;
        Err(crate::desktop_vpn_provider_unavailable())
    }
}

#[tauri::command]
pub(crate) async fn rahrow_tun_stop(app: tauri::AppHandle) -> Result<(), DesktopCommandError> {
    tauri::async_runtime::spawn_blocking(move || {
        let state = app.state::<Mutex<TunRuntimeState>>();
        let mut state = state
            .lock()
            .map_err(|error| command_error("desktop_command_failed", error.to_string()))?;
        #[cfg(target_os = "linux")]
        linux::stop(&mut state);
        state.last_error = None;
        Ok(())
    })
    .await
    .map_err(|error| command_error("desktop_command_failed", error.to_string()))?
}

/// Runs before Tauri starts. pkexec re-executes this binary as root in helper
/// mode; any other root invocation is refused so the policy cannot launch the UI as root.
pub(crate) fn run_helper_if_requested() {
    #[cfg(target_os = "linux")]
    {
        let args: Vec<std::ffi::OsString> = std::env::args_os().collect();
        if args.get(1).is_some_and(|arg| arg == HELPER_FLAG) {
            let error = linux::helper::run(&args[2..]);
            eprintln!("rahrow-tun-helper: {error}");
            std::process::exit(1);
        }
        if unsafe { libc::geteuid() } == 0 {
            eprintln!("RahRow must not run as root.");
            std::process::exit(1);
        }
    }
}

#[cfg(target_os = "linux")]
mod linux {
    use super::{
        bootstrap_dns_from, build_tun_config, TunConfigInput, TunRuntimeState, TunStartInput,
        HELPER_FLAG, TUN_INTERFACE,
    };
    use crate::{
        attach_engine_output, command_error, output_snapshot, sing_box_binary_path,
        xray_binary_path, DesktopCommandError, EngineOutputBuffer,
    };
    use std::{
        env, fs,
        io::Write,
        net::{Ipv4Addr, SocketAddr, ToSocketAddrs},
        os::unix::{
            fs::{OpenOptionsExt, PermissionsExt},
            process::CommandExt as UnixCommandExt,
        },
        path::{Path, PathBuf},
        process::{Command, ExitStatus, Stdio},
        sync::{mpsc, Arc, Mutex},
        thread,
        time::{Duration, Instant},
    };

    const PKEXEC: &str = "/usr/bin/pkexec";
    const SUDO: &str = "/usr/bin/sudo";
    const POLICY_PATH: &str = "/usr/share/polkit-1/actions/foundation.false.rahrow.tun.policy";
    const CONFIG_PREFIX: &str = "rahrow-tun-";
    const START_TIMEOUT: Duration = Duration::from_secs(90);

    pub(super) struct TunProcess {
        pid: i32,
        exit: Arc<Mutex<Option<String>>>,
    }

    impl TunProcess {
        fn exited(&self) -> Option<String> {
            self.exit.lock().ok().and_then(|exit| exit.clone())
        }
    }

    pub(super) fn availability() -> Result<(), String> {
        if !Path::new(PKEXEC).is_file() {
            return Err("VPN mode needs polkit (pkexec), which is not installed on this system. Install polkit or choose Proxy.".to_string());
        }
        sing_box_binary_path().map_err(|error| error.message)?;
        if !cfg!(debug_assertions) && !Path::new(POLICY_PATH).is_file() {
            return Err("The RahRow VPN permission policy is missing. Reinstall the RahRow package to enable VPN mode.".to_string());
        }
        Ok(())
    }

    pub(super) fn clear_exited(state: &mut TunRuntimeState) {
        if let Some(exit) = state.process.as_ref().and_then(TunProcess::exited) {
            state.process = None;
            state.last_error = Some(exit);
        }
    }

    pub(super) fn start(
        state: &mut TunRuntimeState,
        input: &TunStartInput,
    ) -> Result<(), DesktopCommandError> {
        clear_exited(state);
        if state.process.is_some() {
            return Err(command_error(
                "engine_already_running",
                "The VPN tunnel is already running.".to_string(),
            ));
        }
        availability().map_err(|detail| command_error("vpn_provider_unavailable", detail))?;
        terminate_stale_tunnels()?;
        sweep_kernel_leftovers();

        let sing_box = sing_box_binary_path()?;
        // Only the proxy engines bypass the TUN. The UI stays reachable via the
        // 127.0.0.0/8 exclude; bypassing rahrow-desktop would send its own
        // connectivity checks around the tunnel and look like VPN is off.
        let bypass_process_paths: Vec<String> = [xray_binary_path(), Ok(sing_box.clone())]
            .into_iter()
            .filter_map(Result::ok)
            .map(|path| {
                fs::canonicalize(&path)
                    .map(|path| path.to_string_lossy().into_owned())
                    .unwrap_or(path)
            })
            .collect();
        let resolv_conf: Vec<String> = ["/run/systemd/resolve/resolv.conf", "/etc/resolv.conf"]
            .iter()
            .filter_map(|path| fs::read_to_string(path).ok())
            .collect();
        let resolv_conf: Vec<&str> = resolv_conf.iter().map(String::as_str).collect();
        let server_host = input.server_host.trim();
        let server_addresses = resolve_server(server_host, input.server_port);
        let config = build_tun_config(&TunConfigInput {
            socks_port: input.socks_port,
            server_host,
            server_addresses: &server_addresses,
            bypass_process_paths: &bypass_process_paths,
            bootstrap_dns: bootstrap_dns_from(&resolv_conf),
        });
        let config_path = write_config(&config)?;

        let process = spawn(&sing_box, &config_path, Arc::clone(&state.output))?;
        match wait_until_ready(&process, &state.output) {
            Ok(()) => {
                state.process = Some(process);
                state.last_error = None;
                Ok(())
            }
            Err(error) => {
                terminate(&process);
                state.last_error = Some(error.message.clone());
                Err(error)
            }
        }
    }

    pub(super) fn stop(state: &mut TunRuntimeState) {
        if let Some(process) = state.process.take() {
            terminate(&process);
        }
        sweep_kernel_leftovers();
    }

    /// sing-box removes its nft table and ip rules on a clean exit. A kill
    /// leaves them in place, and the next lookup then blackholes the network.
    fn sweep_kernel_leftovers() {
        if !Path::new(SUDO).is_file() {
            return;
        }
        let _ = Command::new(SUDO)
            .args(["-n", "nft", "delete", "table", "inet", "sing-box"])
            .status();
        let _ = Command::new(SUDO)
            .args(["-n", "ip", "link", "del", TUN_INTERFACE])
            .status();
        let _ = Command::new(SUDO)
            .args(["-n", "ip", "rule", "del", "lookup", "2022"])
            .status();
        let _ = Command::new(SUDO)
            .args(["-n", "ip", "rule", "del", "pref", "1"])
            .status();
        for preference in 9000..=9010 {
            let _ = Command::new(SUDO)
                .args(["-n", "ip", "rule", "del", "pref", &preference.to_string()])
                .status();
        }
    }

    fn resolve_server(host: &str, port: u16) -> Vec<Ipv4Addr> {
        if let Ok(address) = host.parse::<Ipv4Addr>() {
            return vec![address];
        }
        let mut addresses: Vec<Ipv4Addr> = (host, port)
            .to_socket_addrs()
            .map(|resolved| {
                resolved
                    .filter_map(|address| match address {
                        SocketAddr::V4(address) => Some(*address.ip()),
                        SocketAddr::V6(_) => None,
                    })
                    .collect()
            })
            .unwrap_or_default();
        addresses.sort();
        addresses.dedup();
        addresses
    }

    fn write_config(config: &serde_json::Value) -> Result<PathBuf, DesktopCommandError> {
        let dir = env::var_os("XDG_RUNTIME_DIR")
            .map(PathBuf::from)
            .filter(|dir| dir.is_dir())
            .unwrap_or_else(env::temp_dir);
        let path = dir.join(format!(
            "{CONFIG_PREFIX}{}-{}.json",
            std::process::id(),
            crate::monotonic_suffix()
        ));
        let text = serde_json::to_vec_pretty(config)
            .map_err(|error| command_error("invalid_config", error.to_string()))?;
        fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .mode(0o600)
            .open(&path)
            .and_then(|mut file| file.write_all(&text))
            .map_err(|error| command_error("engine_start_failed", error.to_string()))?;
        Ok(path)
    }

    /// pkexec refuses binaries writable by group/other. Cargo builds under
    /// umask 002 (and NTFS/exFAT checkouts) land group-writable, so clear those
    /// bits when we own the file, then fall back to passwordless sudo.
    fn helper_command(
        exe: &Path,
        sing_box: &str,
        config_path: &Path,
    ) -> Result<Command, String> {
        let _ = clear_group_other_write_bits(exe);
        let mut command = if pkexec_safe(exe) {
            let mut command = Command::new(PKEXEC);
            command.arg(exe);
            command
        } else if Path::new(SUDO).is_file() {
            let uid = unsafe { libc::getuid() };
            let mut command = Command::new(SUDO);
            command
                .arg("-n")
                .arg("env")
                .arg(format!("PKEXEC_UID={uid}"))
                .arg(exe);
            command
        } else {
            return Err(
                "VPN mode cannot start: this RahRow binary is writable by other users (common on NTFS project disks), so pkexec refuses it. Install the RahRow package, or allow passwordless sudo for this account."
                    .to_string(),
            );
        };
        command
            .arg(HELPER_FLAG)
            .arg(sing_box)
            .arg(config_path)
            .process_group(0);
        Ok(command)
    }

    fn clear_group_other_write_bits(path: &Path) -> std::io::Result<()> {
        let metadata = fs::metadata(path)?;
        let mode = metadata.permissions().mode();
        if mode & 0o022 == 0 {
            return Ok(());
        }
        let mut permissions = metadata.permissions();
        permissions.set_mode(mode & !0o022);
        fs::set_permissions(path, permissions)
    }

    fn pkexec_safe(path: &Path) -> bool {
        let Ok(metadata) = fs::metadata(path) else {
            return false;
        };
        metadata.permissions().mode() & 0o022 == 0
    }

    /// The spawning thread lives as long as the child, so the helper's
    /// PR_SET_PDEATHSIG fires when RahRow itself exits.
    fn spawn(
        sing_box: &str,
        config_path: &Path,
        output: EngineOutputBuffer,
    ) -> Result<TunProcess, DesktopCommandError> {
        let exe = env::current_exe()
            .map_err(|error| command_error("engine_start_failed", error.to_string()))?;
        let exit = Arc::new(Mutex::new(None));
        let exit_writer = Arc::clone(&exit);
        let (sender, receiver) = mpsc::channel();
        let sing_box = sing_box.to_string();
        let config_path = config_path.to_path_buf();

        thread::Builder::new()
            .name("rahrow-tun".to_string())
            .spawn(move || {
                let spawned = match helper_command(&exe, &sing_box, &config_path) {
                    Ok(mut command) => command
                        .stdin(Stdio::null())
                        .stdout(Stdio::piped())
                        .stderr(Stdio::piped())
                        .spawn(),
                    Err(error) => {
                        let _ = fs::remove_file(&config_path);
                        let _ = sender.send(Err(error));
                        return;
                    }
                };
                let mut child = match spawned {
                    Ok(child) => child,
                    Err(error) => {
                        let _ = fs::remove_file(&config_path);
                        let _ = sender.send(Err(error.to_string()));
                        return;
                    }
                };
                attach_engine_output(&mut child, "tun", output);
                let _ = sender.send(Ok(child.id() as i32));
                let status = child.wait();
                let _ = fs::remove_file(&config_path);
                if let Ok(mut exit) = exit_writer.lock() {
                    *exit = Some(describe_exit(status.ok()));
                }
            })
            .map_err(|error| command_error("engine_start_failed", error.to_string()))?;

        let pid = receiver
            .recv()
            .map_err(|error| command_error("engine_start_failed", error.to_string()))?
            .map_err(|error| {
                command_error(
                    "engine_start_failed",
                    format!("Failed to start the VPN tunnel through pkexec: {error}"),
                )
            })?;
        Ok(TunProcess { pid, exit })
    }

    fn describe_exit(status: Option<ExitStatus>) -> String {
        match status.and_then(|status| status.code()) {
            Some(126) => "VPN permission was not granted.".to_string(),
            Some(127) => "RahRow is not authorized to create the VPN interface.".to_string(),
            Some(code) => format!("The VPN tunnel exited with status {code}."),
            None => "The VPN tunnel was stopped.".to_string(),
        }
    }

    fn wait_until_ready(
        process: &TunProcess,
        output: &EngineOutputBuffer,
    ) -> Result<(), DesktopCommandError> {
        let deadline = Instant::now() + START_TIMEOUT;
        let interface = Path::new("/sys/class/net").join(TUN_INTERFACE);
        loop {
            if let Some(exit) = process.exited() {
                return Err(start_failure(exit, output));
            }
            if interface.exists() {
                thread::sleep(Duration::from_millis(500));
                return match process.exited() {
                    Some(exit) => Err(start_failure(exit, output)),
                    None => Ok(()),
                };
            }
            if Instant::now() >= deadline {
                return Err(command_error(
                    "engine_start_failed",
                    "The VPN tunnel did not come up in time.".to_string(),
                ));
            }
            thread::sleep(Duration::from_millis(100));
        }
    }

    fn start_failure(exit: String, output: &EngineOutputBuffer) -> DesktopCommandError {
        let last_line = output_snapshot(output)
            .into_iter()
            .rev()
            .find(|line| line.source == "tun" && line.stream == "stderr")
            .map(|line| line.line);
        command_error(
            "engine_start_failed",
            match last_line {
                Some(line) => format!("{exit} {line}"),
                None => exit,
            },
        )
    }

    fn terminate(process: &TunProcess) {
        signal_and_wait(process.pid, || process.exited().is_some());
    }

    fn signal_and_wait(pid: i32, exited: impl Fn() -> bool) {
        unsafe {
            libc::kill(-pid, libc::SIGTERM);
            libc::kill(pid, libc::SIGTERM);
        }
        let deadline = Instant::now() + Duration::from_secs(5);
        while !exited() && Instant::now() < deadline {
            thread::sleep(Duration::from_millis(50));
        }
        if !exited() {
            unsafe {
                libc::kill(-pid, libc::SIGKILL);
                libc::kill(pid, libc::SIGKILL);
            }
            let deadline = Instant::now() + Duration::from_secs(1);
            while !exited() && Instant::now() < deadline {
                thread::sleep(Duration::from_millis(50));
            }
        }
    }

    /// A crashed RahRow leaves its tunnel sing-box (running as this user) holding the interface.
    fn terminate_stale_tunnels() -> Result<(), DesktopCommandError> {
        let interface = Path::new("/sys/class/net").join(TUN_INTERFACE);
        if !interface.exists() {
            return Ok(());
        }
        for entry in fs::read_dir("/proc").into_iter().flatten().flatten() {
            let Some(pid) = entry.file_name().to_str().and_then(|pid| pid.parse::<i32>().ok())
            else {
                continue;
            };
            let Ok(cmdline) = fs::read(entry.path().join("cmdline")) else {
                continue;
            };
            let is_tunnel = cmdline.split(|byte| *byte == 0).any(|arg| {
                Path::new(std::ffi::OsStr::new(&*String::from_utf8_lossy(arg)))
                    .file_name()
                    .and_then(|name| name.to_str())
                    .is_some_and(|name| name.starts_with(CONFIG_PREFIX) && name.ends_with(".json"))
            });
            if is_tunnel {
                let proc_dir = entry.path();
                signal_and_wait(pid, || !proc_dir.exists());
            }
        }
        if interface.exists() {
            return Err(command_error(
                "engine_start_failed",
                format!("Another VPN tunnel is still using the {TUN_INTERFACE} interface."),
            ));
        }
        Ok(())
    }

    pub(super) mod helper {
        use std::{
            env,
            ffi::{CString, OsString},
            os::unix::process::CommandExt,
            path::Path,
            process::{Command, Stdio},
            sync::atomic::{AtomicI32, Ordering},
            thread,
            time::{Duration, Instant},
        };

        const CAP_NET_ADMIN: u32 = 12;
        const CAP_NET_RAW: u32 = 13;
        const LINUX_CAPABILITY_VERSION_3: u32 = 0x2008_0522;
        static CHILD_PID: AtomicI32 = AtomicI32::new(0);

        #[repr(C)]
        struct CapHeader {
            version: u32,
            pid: i32,
        }

        #[repr(C)]
        #[derive(Clone, Copy, Default)]
        struct CapData {
            effective: u32,
            permitted: u32,
            inheritable: u32,
        }

        /// Stays root, forks sing-box with CAP_NET_ADMIN, then points
        /// systemd-resolved at the TUN so browsers stop using Shecan.
        pub(crate) fn run(args: &[OsString]) -> String {
            let [sing_box, config] = args else {
                return "expected <sing-box path> <config path>".to_string();
            };
            if unsafe { libc::geteuid() } != 0 {
                return "must be started through pkexec".to_string();
            }
            let Some(uid) = env::var("PKEXEC_UID")
                .ok()
                .and_then(|uid| uid.parse::<u32>().ok())
                .filter(|uid| *uid != 0)
            else {
                return "PKEXEC_UID is missing".to_string();
            };
            let sing_box = Path::new(sing_box);
            let config = Path::new(config);
            if !sing_box.is_absolute() || !config.is_absolute() {
                return "paths must be absolute".to_string();
            }
            if let Err(error) = verify_sing_box(sing_box) {
                return error;
            }
            flush_resolver_cache();
            clear_owned_routes();

            let pid = unsafe { libc::fork() };
            if pid < 0 {
                return last_os_error("fork");
            }
            if pid == 0 {
                if let Err(error) = drop_privileges(uid) {
                    eprintln!("rahrow-tun-helper: {error}");
                    unsafe { libc::_exit(1) };
                }
                // No PATH: sing-tun would otherwise call resolvectl as this user
                // and block on a polkit prompt during shutdown.
                let error = Command::new(sing_box)
                    .arg("run")
                    .arg("-c")
                    .arg(config)
                    .env_clear()
                    .exec();
                eprintln!("rahrow-tun-helper: failed to exec sing-box: {error}");
                unsafe { libc::_exit(1) };
            }

            CHILD_PID.store(pid, Ordering::SeqCst);
            unsafe {
                let handler = handle_signal as *const () as libc::sighandler_t;
                libc::signal(libc::SIGTERM, handler);
                libc::signal(libc::SIGINT, handler);
                libc::signal(libc::SIGHUP, handler);
            }

            if !wait_for_tun(Duration::from_secs(15)) {
                unsafe { libc::kill(pid, libc::SIGTERM) };
                let mut status = 0;
                unsafe { libc::waitpid(pid, &mut status, 0) };
                return format!("{} did not appear", super::super::TUN_INTERFACE);
            }
            configure_resolved();

            let mut status = 0;
            unsafe { libc::waitpid(pid, &mut status, 0) };
            revert_resolved();
            clear_owned_routes();
            CHILD_PID.store(0, Ordering::SeqCst);

            if libc::WIFEXITED(status) && libc::WEXITSTATUS(status) != 0 {
                return format!("sing-box exited with status {}", libc::WEXITSTATUS(status));
            }
            if libc::WIFSIGNALED(status) && libc::WTERMSIG(status) != libc::SIGTERM {
                return format!("sing-box exited with signal {}", libc::WTERMSIG(status));
            }
            std::process::exit(0);
        }

        extern "C" fn handle_signal(_: libc::c_int) {
            let pid = CHILD_PID.load(Ordering::SeqCst);
            if pid > 0 {
                unsafe { libc::kill(pid, libc::SIGTERM) };
            }
        }

        fn wait_for_tun(timeout: Duration) -> bool {
            let path = Path::new("/sys/class/net").join(super::super::TUN_INTERFACE);
            let deadline = Instant::now() + timeout;
            while Instant::now() < deadline {
                if path.exists() {
                    return true;
                }
                thread::sleep(Duration::from_millis(50));
            }
            path.exists()
        }

        fn clear_owned_routes() {
            let _ = Command::new("nft")
                .args(["delete", "table", "inet", "sing-box"])
                .status();
            let _ = Command::new("ip")
                .args(["link", "del", super::super::TUN_INTERFACE])
                .status();
            let _ = Command::new("ip").args(["rule", "del", "lookup", "2022"]).status();
            for preference in std::iter::once(1).chain(9000..=9010) {
                let _ = Command::new("ip")
                    .args(["rule", "del", "pref", &preference.to_string()])
                    .status();
            }
        }

        fn configure_resolved() {
            let interface = super::super::TUN_INTERFACE;
            let gateway = super::super::TUN_GATEWAY;
            resolvectl(&["dns", interface, gateway]);
            resolvectl(&["domain", interface, "~."]);
            resolvectl(&["default-route", interface, "yes"]);
            flush_resolver_cache();
        }

        fn revert_resolved() {
            resolvectl(&["revert", super::super::TUN_INTERFACE]);
            flush_resolver_cache();
        }

        fn resolvectl(args: &[&str]) {
            let resolvectl = Path::new("/usr/bin/resolvectl");
            if !resolvectl.is_file() {
                return;
            }
            let _ = Command::new(resolvectl)
                .args(args)
                .env_clear()
                .stdin(Stdio::null())
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status();
        }

        /// Answers cached before the tunnel may be censored; drop them while still root.
        fn flush_resolver_cache() {
            let resolvectl = Path::new("/usr/bin/resolvectl");
            if resolvectl.is_file() {
                let _ = Command::new(resolvectl)
                    .arg("flush-caches")
                    .env_clear()
                    .stdin(Stdio::null())
                    .stdout(Stdio::null())
                    .stderr(Stdio::null())
                    .status();
            }
        }

        fn verify_sing_box(sing_box: &Path) -> Result<(), String> {
            if cfg!(debug_assertions) {
                return if sing_box.is_file() {
                    Ok(())
                } else {
                    Err("sing-box binary not found".to_string())
                };
            }
            let expected = crate::bundled_engine_sidecar_path("sing-box")
                .ok_or_else(|| "bundled sing-box not found".to_string())?;
            let same = std::fs::canonicalize(sing_box).ok() == std::fs::canonicalize(expected).ok();
            if same {
                Ok(())
            } else {
                Err("only the bundled sing-box may be started".to_string())
            }
        }

        fn drop_privileges(uid: u32) -> Result<(), String> {
            unsafe {
                let passwd = libc::getpwuid(uid);
                if passwd.is_null() {
                    return Err(format!("unknown user {uid}"));
                }
                let gid = (*passwd).pw_gid;
                let name = CString::from(std::ffi::CStr::from_ptr((*passwd).pw_name));

                if libc::initgroups(name.as_ptr(), gid) != 0 {
                    return Err(last_os_error("initgroups"));
                }
                if libc::prctl(libc::PR_SET_KEEPCAPS, 1 as libc::c_ulong, 0, 0, 0) != 0 {
                    return Err(last_os_error("PR_SET_KEEPCAPS"));
                }
                if libc::setresgid(gid, gid, gid) != 0 {
                    return Err(last_os_error("setresgid"));
                }
                if libc::setresuid(uid, uid, uid) != 0 {
                    return Err(last_os_error("setresuid"));
                }

                let mask = (1 << CAP_NET_ADMIN) | (1 << CAP_NET_RAW);
                let mut header = CapHeader {
                    version: LINUX_CAPABILITY_VERSION_3,
                    pid: 0,
                };
                let data = [
                    CapData {
                        effective: mask,
                        permitted: mask,
                        inheritable: mask,
                    },
                    CapData::default(),
                ];
                if libc::syscall(
                    libc::SYS_capset,
                    &mut header as *mut CapHeader,
                    data.as_ptr(),
                ) != 0
                {
                    return Err(last_os_error("capset"));
                }
                for capability in [CAP_NET_ADMIN, CAP_NET_RAW] {
                    if libc::prctl(
                        libc::PR_CAP_AMBIENT,
                        libc::PR_CAP_AMBIENT_RAISE as libc::c_ulong,
                        capability as libc::c_ulong,
                        0 as libc::c_ulong,
                        0 as libc::c_ulong,
                    ) != 0
                    {
                        return Err(last_os_error("PR_CAP_AMBIENT_RAISE"));
                    }
                }
                if libc::prctl(
                    libc::PR_SET_PDEATHSIG,
                    libc::SIGTERM as libc::c_ulong,
                    0,
                    0,
                    0,
                ) != 0
                {
                    return Err(last_os_error("PR_SET_PDEATHSIG"));
                }
                if libc::getppid() == 1 {
                    return Err("RahRow exited before the tunnel started".to_string());
                }
            }
            Ok(())
        }

        fn last_os_error(operation: &str) -> String {
            format!("{operation} failed: {}", std::io::Error::last_os_error())
        }
    }
}

#[cfg(test)]
mod tests {
    use super::{bootstrap_dns_from, build_tun_config, TunConfigInput};
    use serde_json::json;
    use std::net::Ipv4Addr;

    fn config_for(host: &str, addresses: &[Ipv4Addr]) -> serde_json::Value {
        build_tun_config(&TunConfigInput {
            socks_port: 12080,
            server_host: host,
            server_addresses: addresses,
            bypass_process_paths: &["/usr/bin/xray".to_string(), "/usr/bin/sing-box".to_string()],
            bootstrap_dns: Ipv4Addr::new(178, 22, 122, 101),
        })
    }

    #[test]
    fn tun_forwards_everything_to_the_engine_socks_listener() {
        let config = config_for("proxy.example.com", &[Ipv4Addr::new(203, 0, 113, 7)]);

        assert_eq!(
            config["inbounds"][0],
            json!({
                "type": "tun",
                "tag": "tun-in",
                "interface_name": "rahrow0",
                "address": ["10.255.85.1/30"],
                "mtu": 1500,
                "auto_route": true,
                "strict_route": true,
                "auto_redirect": true,
                "stack": "gvisor",
                "route_exclude_address": ["127.0.0.1/32", "203.0.113.7/32"]
            })
        );
        assert_eq!(
            config["outbounds"][0],
            json!({
                "type": "socks",
                "tag": "proxy",
                "server": "127.0.0.1",
                "server_port": 12080,
                "version": "5",
                "udp_fragment": true,
                "domain_resolver": {
                    "server": "dns-remote",
                    "strategy": "ipv4_only"
                }
            })
        );
        assert_eq!(config["route"]["final"], "proxy");
        assert_eq!(config["route"]["default_domain_resolver"], "dns-remote");
    }

    #[test]
    fn engine_processes_bypass_the_tun_before_dns_hijack() {
        let config = config_for("proxy.example.com", &[]);
        let rules = config["route"]["rules"].as_array().unwrap();

        assert_eq!(
            rules[0],
            json!({ "process_path": ["/usr/bin/xray", "/usr/bin/sing-box"], "outbound": "direct" })
        );
        assert_eq!(
            rules[1],
            json!({ "ip_cidr": ["1.1.1.1/32"], "port": [443], "outbound": "proxy" })
        );
        assert_eq!(rules[2], json!({ "action": "sniff" }));
        assert_eq!(rules[3], json!({ "protocol": "dns", "action": "hijack-dns" }));
        assert_eq!(
            rules[4],
            json!({ "action": "resolve", "server": "dns-remote", "strategy": "ipv4_only" })
        );
        assert_eq!(
            rules[5],
            json!({ "ip_cidr": ["10.10.34.0/24"], "outbound": "proxy" })
        );
        assert_eq!(rules.len(), 6);
        assert_eq!(
            config["inbounds"][0]["route_exclude_address"],
            json!(["127.0.0.1/32"])
        );
    }

    #[test]
    fn dns_goes_through_the_proxy_except_the_server_hostname() {
        let config = config_for("proxy.example.com", &[]);

        assert_eq!(config["dns"]["final"], "dns-remote");
        assert_eq!(
            config["dns"]["servers"][0],
            json!({
                "type": "https",
                "tag": "dns-remote",
                "server": "1.1.1.1",
                "detour": "proxy"
            })
        );
        assert_eq!(
            config["dns"]["servers"][1],
            json!({
                "type": "udp",
                "tag": "dns-bootstrap",
                "server": "178.22.122.101"
            })
        );
        assert_eq!(
            config["dns"]["rules"],
            json!([{ "domain": ["proxy.example.com"], "server": "dns-bootstrap" }])
        );
    }

    #[test]
    fn ip_servers_need_no_bootstrap_dns_rule() {
        let config = config_for("203.0.113.7", &[Ipv4Addr::new(203, 0, 113, 7)]);

        assert!(config["dns"].get("rules").is_none());
    }

    #[test]
    fn bootstrap_dns_skips_loopback_stub_resolvers() {
        assert_eq!(
            bootstrap_dns_from(&[
                "nameserver 178.22.122.101\nnameserver 185.51.200.1\n",
                "nameserver 127.0.0.53\n",
            ]),
            Ipv4Addr::new(178, 22, 122, 101)
        );
        assert_eq!(
            bootstrap_dns_from(&["# stub\nnameserver 127.0.0.53\noptions edns0\n"]),
            Ipv4Addr::new(8, 8, 8, 8)
        );
    }
}
