# @rahrow/core

Domain types and local application logic shared by the CLI, desktop, and mobile apps.

This package owns `ConnectionProfile`, VLESS / VMess / Trojan / Shadowsocks URL parse and serialize, subscription import, connection lifecycle, settings, JSON document stores, and the engine-neutral `VpnTunnelProvider` contract. It does not spawn engines or call UI or native APIs.
