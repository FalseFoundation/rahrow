use if_addrs::get_if_addrs;
use serde::Serialize;
use std::{collections::BTreeMap, net::IpAddr};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct NetworkIdentitySnapshot {
    pub local_addresses: Vec<String>,
}

pub(crate) fn snapshot() -> NetworkIdentitySnapshot {
    let candidates: Vec<(String, IpAddr)> = get_if_addrs()
        .map(|interfaces| {
            interfaces
                .into_iter()
                .map(|interface| {
                    let address = interface.ip();
                    (interface.name, address)
                })
                .collect()
        })
        .unwrap_or_default();

    NetworkIdentitySnapshot {
        local_addresses: select_unambiguous_addresses(candidates),
    }
}

fn select_unambiguous_addresses(
    candidates: impl IntoIterator<Item = (String, IpAddr)>,
) -> Vec<String> {
    let mut interfaces = BTreeMap::<String, Vec<IpAddr>>::new();
    for (name, address) in candidates {
        if is_physical_interface(&name) && is_usable_address(address) {
            interfaces.entry(name).or_default().push(address);
        }
    }

    if interfaces.len() != 1 {
        return Vec::new();
    }

    let mut addresses: Vec<String> = interfaces
        .into_values()
        .next()
        .unwrap_or_default()
        .into_iter()
        .map(|address| address.to_string())
        .collect();
    addresses.sort();
    addresses.dedup();
    addresses
}

fn is_usable_address(address: IpAddr) -> bool {
    match address {
        IpAddr::V4(address) => {
            !address.is_loopback()
                && !address.is_unspecified()
                && !address.is_multicast()
                && !address.is_link_local()
                && address.octets() != [255, 255, 255, 255]
        }
        IpAddr::V6(address) => {
            !address.is_loopback()
                && !address.is_unspecified()
                && !address.is_multicast()
                && !address.is_unicast_link_local()
        }
    }
}

fn is_physical_interface(name: &str) -> bool {
    let name = name.to_ascii_lowercase();
    let excluded = [
        "lo",
        "tun",
        "tap",
        "utun",
        "wg",
        "ipsec",
        "ppp",
        "tailscale",
        "zt",
        "docker",
        "veth",
        "virbr",
        "vmnet",
        "bridge",
        "br-",
        "awdl",
        "llw",
        "anpi",
        "gif",
        "stf",
    ];
    if excluded.iter().any(|prefix| name.starts_with(prefix)) {
        return false;
    }

    #[cfg(target_os = "macos")]
    return name.strip_prefix("en").is_some_and(|suffix| {
        !suffix.is_empty() && suffix.chars().all(|char| char.is_ascii_digit())
    });

    #[cfg(target_os = "linux")]
    return ["en", "eth", "wl", "wlan", "wwan", "usb"]
        .iter()
        .any(|prefix| name.starts_with(prefix));

    #[cfg(not(any(target_os = "macos", target_os = "linux")))]
    true
}

#[cfg(test)]
mod tests {
    use super::select_unambiguous_addresses;
    use std::net::{IpAddr, Ipv4Addr, Ipv6Addr};

    fn candidate(name: &str, address: IpAddr) -> (String, IpAddr) {
        (name.to_string(), address)
    }

    #[test]
    fn returns_ipv4_and_ipv6_from_one_physical_interface() {
        let interface = if cfg!(target_os = "macos") {
            "en0"
        } else {
            "wlan0"
        };
        let addresses = select_unambiguous_addresses([
            candidate(interface, IpAddr::V4(Ipv4Addr::new(192, 168, 1, 20))),
            candidate(
                interface,
                IpAddr::V6("fd00::20".parse::<Ipv6Addr>().unwrap()),
            ),
        ]);

        assert_eq!(addresses, vec!["192.168.1.20", "fd00::20"]);
    }

    #[test]
    fn excludes_loopback_unspecified_link_local_and_tunnel_addresses() {
        let interface = if cfg!(target_os = "macos") {
            "en0"
        } else {
            "eth0"
        };
        let addresses = select_unambiguous_addresses([
            candidate("lo0", IpAddr::V4(Ipv4Addr::LOCALHOST)),
            candidate("utun4", IpAddr::V4(Ipv4Addr::new(10, 0, 0, 2))),
            candidate(interface, IpAddr::V4(Ipv4Addr::UNSPECIFIED)),
            candidate(interface, IpAddr::V4(Ipv4Addr::new(169, 254, 1, 2))),
            candidate(interface, IpAddr::V4(Ipv4Addr::new(10, 0, 0, 8))),
        ]);

        assert_eq!(addresses, vec!["10.0.0.8"]);
    }

    #[test]
    fn omits_addresses_when_multiple_physical_interfaces_are_usable() {
        let first = if cfg!(target_os = "macos") {
            "en0"
        } else {
            "eth0"
        };
        let second = if cfg!(target_os = "macos") {
            "en1"
        } else {
            "wlan0"
        };
        let addresses = select_unambiguous_addresses([
            candidate(first, IpAddr::V4(Ipv4Addr::new(10, 0, 0, 8))),
            candidate(second, IpAddr::V4(Ipv4Addr::new(192, 168, 1, 8))),
        ]);

        assert!(addresses.is_empty());
    }
}
