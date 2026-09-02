use serde::{Deserialize, Serialize};
use serde_json::Value;

pub(crate) const VPN_IPC_PROTOCOL_VERSION: u16 = 1;
const MAX_CONFIG_BYTES: usize = 1024 * 1024;

#[derive(Clone, Copy, Debug, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum EngineId {
    Xray,
    SingBox,
}

#[derive(Debug, Deserialize, Serialize)]
#[serde(tag = "command", rename_all = "kebab-case")]
pub(crate) enum VpnRequest {
    Start {
        profile_id: String,
        engine: EngineId,
        config: Value,
    },
    Stop,
    Status,
}

#[derive(Debug, Deserialize, Serialize)]
pub(crate) struct VpnRequestEnvelope {
    pub protocol_version: u16,
    pub request_id: String,
    pub request: VpnRequest,
}

impl VpnRequestEnvelope {
    pub(crate) fn validate(&self) -> Result<(), &'static str> {
        if self.protocol_version != VPN_IPC_PROTOCOL_VERSION {
            return Err("unsupported VPN IPC protocol version");
        }
        validate_identifier(&self.request_id, 128, "invalid request id")?;

        if let VpnRequest::Start {
            profile_id, config, ..
        } = &self.request
        {
            validate_identifier(profile_id, 256, "invalid profile id")?;
            if !config.is_object() {
                return Err("engine config must be a JSON object");
            }
            if serde_json::to_vec(config)
                .map_err(|_| "engine config is not serializable")?
                .len()
                > MAX_CONFIG_BYTES
            {
                return Err("engine config exceeds one MiB");
            }
        }

        Ok(())
    }
}

fn validate_identifier(
    value: &str,
    max_length: usize,
    error: &'static str,
) -> Result<(), &'static str> {
    let value = value.trim();
    if value.is_empty()
        || value.len() > max_length
        || !value
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_' | b'.' | b':'))
    {
        return Err(error);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{EngineId, VpnRequest, VpnRequestEnvelope, VPN_IPC_PROTOCOL_VERSION};
    use serde_json::json;

    #[test]
    fn accepts_typed_start_stop_and_status_requests() {
        let start = VpnRequestEnvelope {
            protocol_version: VPN_IPC_PROTOCOL_VERSION,
            request_id: "req-1".to_string(),
            request: VpnRequest::Start {
                profile_id: "profile-1".to_string(),
                engine: EngineId::Xray,
                config: json!({ "inbounds": [{ "type": "tun" }] }),
            },
        };

        assert!(start.validate().is_ok());
        assert!(VpnRequestEnvelope {
            protocol_version: VPN_IPC_PROTOCOL_VERSION,
            request_id: "req-2".to_string(),
            request: VpnRequest::Stop,
        }
        .validate()
        .is_ok());
        assert!(VpnRequestEnvelope {
            protocol_version: VPN_IPC_PROTOCOL_VERSION,
            request_id: "req-3".to_string(),
            request: VpnRequest::Status,
        }
        .validate()
        .is_ok());
    }

    #[test]
    fn rejects_unversioned_empty_or_oversized_requests() {
        let invalid_version = VpnRequestEnvelope {
            protocol_version: 0,
            request_id: "req-1".to_string(),
            request: VpnRequest::Status,
        };
        let empty_profile = VpnRequestEnvelope {
            protocol_version: VPN_IPC_PROTOCOL_VERSION,
            request_id: "req-2".to_string(),
            request: VpnRequest::Start {
                profile_id: " ".to_string(),
                engine: EngineId::SingBox,
                config: json!({}),
            },
        };
        let oversized_config = VpnRequestEnvelope {
            protocol_version: VPN_IPC_PROTOCOL_VERSION,
            request_id: "req-3".to_string(),
            request: VpnRequest::Start {
                profile_id: "profile-1".to_string(),
                engine: EngineId::Xray,
                config: json!({ "padding": "x".repeat(1_048_577) }),
            },
        };

        assert!(invalid_version.validate().is_err());
        assert!(empty_profile.validate().is_err());
        assert!(oversized_config.validate().is_err());
    }
}
