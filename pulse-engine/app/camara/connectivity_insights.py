"""Connectivity Insights CAMARA adapter.

Spec: https://github.com/camaraproject/ConnectivityInsights (vwip)
"""

import ipaddress
import uuid
from datetime import datetime

import httpx

from app.camara.config import (
    CAMARA_CONNECTIVITY_INSIGHTS_BASE_URL,
    CAMARA_CONNECTIVITY_INSIGHTS_CLIENT_ID,
    CAMARA_CONNECTIVITY_INSIGHTS_CLIENT_SECRET,
    CAMARA_MOCK,
)

_TIMEOUT = 10.0
_MEETS = "meets the application requirements"
_UNABLE = "unable to meet the application requirements"


def _is_uuid(value: str) -> bool:
    try:
        uuid.UUID(str(value))
        return True
    except Exception:
        return False


def _validate_ip_or_cidr(value: str, version: int) -> bool:
    try:
        network = ipaddress.ip_network(value, strict=False)
        if version == 4:
            return network.version == 4
        return network.version == 6
    except ValueError:
        try:
            ip = ipaddress.ip_address(value)
            if version == 4:
                return ip.version == 4
            return ip.version == 6
        except ValueError:
            return False


def _validate_device(device: dict[str, object] | None) -> dict[str, object] | None:
    if not device or not isinstance(device, dict):
        return {
            "status": 422,
            "code": "MISSING_IDENTIFIER",
            "message": "The device cannot be identified.",
        }

    # Require at least one of CAMARA supported identifiers
    keys = {"phoneNumber", "ipv4Address", "ipv6Address", "networkAccessIdentifier"}
    provided = [k for k in keys if device.get(k) is not None]
    if len(provided) == 0:
        return {
            "status": 422,
            "code": "MISSING_IDENTIFIER",
            "message": "The device cannot be identified.",
        }

    return None


def _validate_ports_spec(ports_spec: dict[str, object] | None) -> dict[str, object] | None:
    if ports_spec is None:
        return None
    if not isinstance(ports_spec, dict):
        return {"status": 400, "code": "INVALID_ARGUMENT", "message": "applicationServerPorts must be an object."}

    ranges = ports_spec.get("ranges")
    ports = ports_spec.get("ports")
    if ranges is None and ports is None:
        return {"status": 400, "code": "INVALID_ARGUMENT", "message": "applicationServerPorts must include ports or ranges."}

    if ports is not None:
        if not isinstance(ports, list) or len(ports) == 0:
            return {"status": 400, "code": "INVALID_ARGUMENT", "message": "applicationServerPorts.ports must be a non-empty list."}
        for p in ports:
            if not isinstance(p, int) or p < 0 or p > 65535:
                return {"status": 400, "code": "OUT_OF_RANGE", "message": "Port values must be in range 0..65535."}

    if ranges is not None:
        if not isinstance(ranges, list) or len(ranges) == 0:
            return {"status": 400, "code": "INVALID_ARGUMENT", "message": "applicationServerPorts.ranges must be a non-empty list."}
        for item in ranges:
            if not isinstance(item, dict) or "from" not in item or "to" not in item:
                return {"status": 400, "code": "INVALID_ARGUMENT", "message": "Each range must include from and to."}
            start = item["from"]
            end = item["to"]
            if not isinstance(start, int) or not isinstance(end, int) or start < 0 or end < 0 or start > 65535 or end > 65535 or start > end:
                return {"status": 400, "code": "OUT_OF_RANGE", "message": "Port range values must be valid and from <= to."}

    return None


def _validate_request(payload: dict[str, object]) -> dict[str, object] | None:
    app_profile_id = payload.get("applicationProfileId")
    if not app_profile_id or not isinstance(app_profile_id, str) or not _is_uuid(app_profile_id):
        return {
            "status": 400,
            "code": "INVALID_ARGUMENT",
            "message": "applicationProfileId must be a valid UUID.",
        }

    device_error = _validate_device(payload.get("device") if isinstance(payload.get("device"), dict) else None)
    if device_error:
        return device_error

    app_server = payload.get("applicationServer")
    if app_server is not None:
        if not isinstance(app_server, dict):
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "applicationServer must be an object.",
            }
        ipv4 = app_server.get("ipv4Address")
        ipv6 = app_server.get("ipv6Address")
        if ipv4 is None and ipv6 is None:
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "applicationServer must include ipv4Address or ipv6Address.",
            }
        if ipv4 is not None and (not isinstance(ipv4, str) or not _validate_ip_or_cidr(ipv4, 4)):
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "applicationServer.ipv4Address is invalid.",
            }
        if ipv6 is not None and (not isinstance(ipv6, str) or not _validate_ip_or_cidr(ipv6, 6)):
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "applicationServer.ipv6Address is invalid.",
            }

    monitoring_ts = payload.get("monitoringTimeStamp")
    if monitoring_ts is not None:
        if not isinstance(monitoring_ts, str):
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "monitoringTimeStamp must be RFC3339 date-time string.",
            }
        try:
            datetime.fromisoformat(monitoring_ts.replace("Z", "+00:00"))
        except ValueError:
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "monitoringTimeStamp must be RFC3339 date-time string.",
            }

    ports_error = _validate_ports_spec(payload.get("applicationServerPorts") if isinstance(payload.get("applicationServerPorts"), dict) else payload.get("applicationServerPorts"))
    if ports_error:
        return ports_error

    return None


def _confidence_for_profile(profile_id: str) -> str:
    # deterministic pseudo-random quality based on UUID integer parity
    value = uuid.UUID(profile_id).int
    return _MEETS if value % 2 == 0 else _UNABLE


def _mock_response(payload: dict[str, object]) -> dict[str, object]:
    profile_id = str(payload.get("applicationProfileId"))
    confidence = _confidence_for_profile(profile_id)
    device = payload.get("device") if isinstance(payload.get("device"), dict) else {}

    # Return one resolved identifier in response (CAMARA DeviceResponse behavior)
    device_response: dict[str, object] = {}
    for key in ["phoneNumber", "ipv4Address", "ipv6Address", "networkAccessIdentifier"]:
        if key in device:
            device_response[key] = device[key]
            break

    return {
        "packetDelayBudget": confidence,
        "targetMinDownstreamRate": confidence,
        "targetMinUpstreamRate": confidence,
        "packetlossErrorRate": confidence,
        "jitter": confidence,
        "additionalKPIs": {
            "signalStrength": "good" if confidence == _MEETS else "fair",
            "connectivityType": "4G" if confidence == _MEETS else "3G",
        },
        "device": device_response,
        "mock": True,
    }


def _operator_token() -> str:
    if not CAMARA_CONNECTIVITY_INSIGHTS_BASE_URL or not CAMARA_CONNECTIVITY_INSIGHTS_CLIENT_ID:
        raise ValueError(
            "CAMARA_CONNECTIVITY_INSIGHTS_BASE_URL and CAMARA_CONNECTIVITY_INSIGHTS_CLIENT_ID are required"
        )

    token_url = f"{CAMARA_CONNECTIVITY_INSIGHTS_BASE_URL.rstrip('/')}/oauth2/token"
    with httpx.Client(timeout=_TIMEOUT) as client:
        response = client.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": CAMARA_CONNECTIVITY_INSIGHTS_CLIENT_ID,
                "client_secret": CAMARA_CONNECTIVITY_INSIGHTS_CLIENT_SECRET,
                "scope": "connectivity-insights:check",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    response.raise_for_status()
    return response.json()["access_token"]


def _operator_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {_operator_token()}",
        "Content-Type": "application/json",
        "x-correlator": str(uuid.uuid4()),
    }


def _operator_url() -> str:
    base = CAMARA_CONNECTIVITY_INSIGHTS_BASE_URL.rstrip("/")
    return f"{base}/connectivity-insights/vwip/check-network-quality"


def check_network_quality(payload: dict[str, object]) -> dict[str, object]:
    """Check network quality confidence for an application profile and device."""
    validation_error = _validate_request(payload)
    if validation_error:
        return {"error": validation_error}

    if CAMARA_MOCK or not CAMARA_CONNECTIVITY_INSIGHTS_BASE_URL:
        return _mock_response(payload)

    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.post(_operator_url(), json=payload, headers=_operator_headers())

        if response.status_code == 200:
            data = response.json() if response.content else {}
            return data

        try:
            err = response.json()
            code = err.get("code", "INVALID_ARGUMENT")
            message = err.get("message", response.text)
        except Exception:
            code = "INVALID_ARGUMENT"
            message = response.text
        return {
            "error": {
                "status": response.status_code,
                "code": code,
                "message": message,
            },
        }
    except Exception as exc:
        fallback = _mock_response(payload)
        fallback["live_error"] = str(exc)
        return fallback
