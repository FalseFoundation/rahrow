# Third-party notices

RahRow release artifacts bundle independent proxy engine executables. The exact
versions and SHA-256 checksums are pinned in `engines/*/runtime.json`.

## sing-box

- Project: https://github.com/SagerNet/sing-box
- License: GNU General Public License v3.0 or later, including the additional
  terms in the upstream `LICENSE` file.
- Bundled version: see `engines/sing-box/runtime.json`.
- Corresponding source: the tagged upstream release linked by that manifest.

The complete upstream license is included beside the executable as
`LICENSE-sing-box`.

## Xray-core

- Project: https://github.com/XTLS/Xray-core
- License: Mozilla Public License 2.0.
- Bundled version: see `engines/xray/runtime.json`.
- Corresponding source: the tagged upstream release linked by that manifest.

The complete upstream license is included beside the executable as
`LICENSE-xray`.

## Wintun

- Project: https://www.wintun.net/
- Copyright: WireGuard LLC.
- Distribution: the unmodified, signed `wintun.dll` shipped inside the official
  Xray Windows archive.

Windows packages include the upstream redistribution terms as `LICENSE-Wintun`.

## HEV SOCKS5 Tunnel

- Project: https://github.com/heiher/hev-socks5-tunnel
- Copyright: Copyright (c) 2022 hev.
- License: MIT.
- Bundled Android version and complete source/submodule revisions: see
  `apps/mobile/native-runtime-pins.json`.

RahRow uses HEV as a TUN-to-SOCKS provider, not as a proxy protocol engine. The
upstream copyright and MIT permission notice must accompany distributed HEV
artifacts. Release SBOM generation must also retain the notices for HEV's pinned
`hev-socks5-core`, `hev-task-system`, lwIP, and YAML submodules.
