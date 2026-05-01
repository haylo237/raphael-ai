"""CAMARA Quality-On-Demand adapter (vwip).

Implements:
- POST /sessions
- GET /sessions/{sessionId}
- DELETE /sessions/{sessionId}
- POST /sessions/{sessionId}/extend
- POST /retrieve-sessions
"""

from __future__ import annotations

import ipaddress
import re
import uuid
from datetime import UTC, datetime, timedelta

import httpx

from app.camara.config import (
    CAMARA_MOCK,
    CAMARA_QOD_BASE_URL,
    CAMARA_QOD_CLIENT_ID,
    CAMARA_QOD_CLIENT_SECRET,
)

_TIMEOUT = 10.0
_QOS_PROFILE_PATTERN = re.compile(r"^[a-zA-Z0-9_.-]+$")
_PHONE_PATTERN = re.compile(r"^\+[1-9][0-9]{4,14}$")
_SUPPORTED_DEVICE_KEYS = {"phoneNumber", "networkAccessIdentifier", "ipv4Address", "ipv6Address"}
_QOS_NOT_APPLICABLE = {"QOS_L"}
_MAX_DURATION_BY_PROFILE = {
    "QOS_E": 7200,
    "QOS_S": 5400,
    "QOS_M": 3600,
    "QOS_L": 3600,
    "voice": 3600,
}

_MOCK_SESSIONS: dict[str, dict[str, object]] = {}


def _now_utc() -> datetime:
    return datetime.now(UTC).replace(microsecond=0)


def _as_rfc3339(ts: datetime) -> str:
    return ts.isoformat().replace("+00:00", "Z")


def _normalize_device_for_response(device: dict[str, object] | None) -> dict[str, object] | None:
    if not device:
        return None
    for key in ("phoneNumber", "ipv4Address", "ipv6Address", "networkAccessIdentifier"):
        if key in device:
            return {key: device[key]}
    return None


def _validate_qos_profile_name(name: object) -> dict[str, object] | None:
    if not isinstance(name, str):
        return {"status": 400, "code": "INVALID_ARGUMENT", "message": "qosProfile must be a string."}
    if len(name) < 3 or len(name) > 256 or _QOS_PROFILE_PATTERN.fullmatch(name) is None:
        return {
            "status": 400,
            "code": "INVALID_ARGUMENT",
            "message": "qosProfile must be a valid QosProfileName.",
        }
    return None


def _validate_ports_spec(name: str, spec: object) -> dict[str, object] | None:
    if spec is None:
        return None
    if not isinstance(spec, dict):
        return {"status": 400, "code": "INVALID_ARGUMENT", "message": f"{name} must be an object."}

    ranges = spec.get("ranges")
    ports = spec.get("ports")
    if ranges is None and ports is None:
        return {
            "status": 400,
            "code": "INVALID_ARGUMENT",
            "message": f"{name} requires ranges and/or ports.",
        }

    if ports is not None:
        if not isinstance(ports, list) or len(ports) == 0:
            return {"status": 400, "code": "INVALID_ARGUMENT", "message": f"{name}.ports must be a non-empty list."}
        for p in ports:
            if not isinstance(p, int) or p < 0 or p > 65535:
                return {"status": 400, "code": "OUT_OF_RANGE", "message": f"{name}.ports contains an invalid port."}

    if ranges is not None:
        if not isinstance(ranges, list) or len(ranges) == 0:
            return {"status": 400, "code": "INVALID_ARGUMENT", "message": f"{name}.ranges must be a non-empty list."}
        for item in ranges:
            if not isinstance(item, dict) or "from" not in item or "to" not in item:
                return {
                    "status": 400,
                    "code": "INVALID_ARGUMENT",
                    "message": f"{name}.ranges entries require from and to.",
                }
            p_from = item["from"]
            p_to = item["to"]
            if not isinstance(p_from, int) or not isinstance(p_to, int) or p_from < 0 or p_to > 65535:
                return {"status": 400, "code": "OUT_OF_RANGE", "message": f"{name}.ranges contains out-of-range ports."}
            if p_from > p_to:
                return {"status": 400, "code": "OUT_OF_RANGE", "message": f"{name}.ranges has from greater than to."}

    return None


def _validate_application_server(server: object) -> dict[str, object] | None:
    if not isinstance(server, dict) or len(server) == 0:
        return {
            "status": 400,
            "code": "INVALID_ARGUMENT",
            "message": "applicationServer must include ipv4Address and/or ipv6Address.",
        }

    ipv4 = server.get("ipv4Address")
    ipv6 = server.get("ipv6Address")
    if ipv4 is None and ipv6 is None:
        return {
            "status": 400,
            "code": "INVALID_ARGUMENT",
            "message": "applicationServer requires ipv4Address and/or ipv6Address.",
        }

    try:
        if ipv4 is not None:
            ipaddress.ip_network(str(ipv4), strict=False)
        if ipv6 is not None:
            ipaddress.ip_network(str(ipv6), strict=False)
    except ValueError:
        return {
            "status": 400,
            "code": "INVALID_ARGUMENT",
            "message": "Invalid applicationServer IP address or CIDR.",
        }

    return None


def _validate_sink_and_credentials(payload: dict[str, object]) -> dict[str, object] | None:
    sink = payload.get("sink")
    sink_credential = payload.get("sinkCredential")

    if sink is not None:
        if not isinstance(sink, str) or not sink.startswith("https://"):
            return {
                "status": 400,
                "code": "INVALID_SINK",
                "message": "sink not valid for the specified protocol",
            }

    if sink_credential is None:
        return None

    if not isinstance(sink_credential, dict):
        return {
            "status": 400,
            "code": "INVALID_CREDENTIAL",
            "message": "sinkCredential must be an object",
        }

    ctype = sink_credential.get("credentialType")
    if ctype != "ACCESSTOKEN":
        return {
            "status": 400,
            "code": "INVALID_CREDENTIAL",
            "message": "Only Access token is supported",
        }

    token_type = sink_credential.get("accessTokenType")
    if token_type != "bearer":
        return {
            "status": 400,
            "code": "INVALID_TOKEN",
            "message": "Only bearer token is supported",
        }

    for field in ("accessToken", "accessTokenExpiresUtc"):
        if not sink_credential.get(field):
            return {
                "status": 400,
                "code": "INVALID_CREDENTIAL",
                "message": f"sinkCredential.{field} is required",
            }

    return None


def _validate_device(device: object, *, required: bool) -> dict[str, object] | None:
    if device is None:
        if required:
            return {
                "status": 422,
                "code": "MISSING_IDENTIFIER",
                "message": "The device cannot be identified.",
            }
        return None

    if not isinstance(device, dict) or len(device) == 0:
        return {
            "status": 422,
            "code": "UNSUPPORTED_IDENTIFIER",
            "message": "The identifier provided is not supported.",
        }

    present_keys = [k for k in _SUPPORTED_DEVICE_KEYS if k in device]
    if len(present_keys) == 0:
        return {
            "status": 422,
            "code": "UNSUPPORTED_IDENTIFIER",
            "message": "The identifier provided is not supported.",
        }

    if "networkAccessIdentifier" in device:
        return {
            "status": 422,
            "code": "UNSUPPORTED_IDENTIFIER",
            "message": "The identifier provided is not supported.",
        }

    phone = device.get("phoneNumber")
    if phone is not None and (not isinstance(phone, str) or _PHONE_PATTERN.fullmatch(phone) is None):
        return {
            "status": 400,
            "code": "INVALID_ARGUMENT",
            "message": "Invalid phoneNumber format.",
        }

    ipv6 = device.get("ipv6Address")
    if ipv6 is not None:
        try:
            ipaddress.ip_address(str(ipv6))
        except ValueError:
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "Invalid ipv6Address format.",
            }

    ipv4 = device.get("ipv4Address")
    if ipv4 is not None:
        if not isinstance(ipv4, dict):
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "ipv4Address must be an object.",
            }
        public = ipv4.get("publicAddress")
        private = ipv4.get("privateAddress")
        public_port = ipv4.get("publicPort")
        if public is None:
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "ipv4Address.publicAddress is required.",
            }
        try:
            ipaddress.ip_address(str(public))
        except ValueError:
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "Invalid ipv4Address.publicAddress format.",
            }
        if private is None and public_port is None:
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "ipv4Address requires privateAddress or publicPort.",
            }

    return None


def _device_key(device: dict[str, object] | None) -> str:
    if not device:
        return ""
    normalized = _normalize_device_for_response(device)
    if not normalized:
        return ""
    k, v = next(iter(normalized.items()))
    return f"{k}:{v}"


def _flow_key(device: dict[str, object] | None, application_server: dict[str, object]) -> str:
    return f"{_device_key(device)}|{application_server.get('ipv4Address','')}|{application_server.get('ipv6Address','')}"


def _operator_token() -> str:
    if not CAMARA_QOD_BASE_URL or not CAMARA_QOD_CLIENT_ID:
        raise ValueError("CAMARA_QOD_BASE_URL and CAMARA_QOD_CLIENT_ID are required")

    token_url = f"{CAMARA_QOD_BASE_URL.rstrip('/')}/oauth2/token"
    with httpx.Client(timeout=_TIMEOUT) as client:
        response = client.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": CAMARA_QOD_CLIENT_ID,
                "client_secret": CAMARA_QOD_CLIENT_SECRET,
                "scope": (
                    "quality-on-demand:sessions:create "
                    "quality-on-demand:sessions:read "
                    "quality-on-demand:sessions:delete "
                    "quality-on-demand:sessions:update "
                    "quality-on-demand:sessions:retrieve-by-device"
                ),
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


def _operator_base() -> str:
    return f"{CAMARA_QOD_BASE_URL.rstrip('/')}/quality-on-demand/vwip"


def _parse_operator_error(response: httpx.Response, default_code: str) -> dict[str, object]:
    try:
        payload = response.json()
        code = payload.get("code", default_code)
        message = payload.get("message", response.text)
    except Exception:
        code = default_code
        message = response.text
    return {
        "error": {
            "status": int(response.status_code),
            "code": code,
            "message": message or "Request could not be processed.",
        }
    }


def create_session(payload: dict[str, object]) -> dict[str, object]:
    """Create a QoD session."""
    err = _validate_device(payload.get("device"), required=True)
    if err:
        return {"error": err}

    err = _validate_application_server(payload.get("applicationServer"))
    if err:
        return {"error": err}

    err = _validate_qos_profile_name(payload.get("qosProfile"))
    if err:
        return {"error": err}

    duration = payload.get("duration")
    if not isinstance(duration, int) or duration < 1:
        return {
            "error": {
                "status": 400,
                "code": "OUT_OF_RANGE",
                "message": "duration must be an integer >= 1.",
            }
        }

    qos_profile = str(payload["qosProfile"])
    max_duration = _MAX_DURATION_BY_PROFILE.get(qos_profile, 3600)
    if duration > max_duration:
        return {
            "error": {
                "status": 400,
                "code": "QUALITY_ON_DEMAND.DURATION_OUT_OF_RANGE",
                "message": "The requested duration is out of the allowed range for the specific QoS profile",
            }
        }

    if qos_profile in _QOS_NOT_APPLICABLE:
        return {
            "error": {
                "status": 422,
                "code": "QUALITY_ON_DEMAND.QOS_PROFILE_NOT_APPLICABLE",
                "message": "The requested QoS Profile is currently not available for session creation.",
            }
        }

    err = _validate_ports_spec("devicePorts", payload.get("devicePorts"))
    if err:
        return {"error": err}

    err = _validate_ports_spec("applicationServerPorts", payload.get("applicationServerPorts"))
    if err:
        return {"error": err}

    err = _validate_sink_and_credentials(payload)
    if err:
        return {"error": err}

    device = payload.get("device") if isinstance(payload.get("device"), dict) else None
    app_server = payload.get("applicationServer") if isinstance(payload.get("applicationServer"), dict) else {}
    flow_key = _flow_key(device, app_server)
    for sess in _MOCK_SESSIONS.values():
        if sess.get("_flow_key") == flow_key and sess.get("qosStatus") in {"REQUESTED", "AVAILABLE"}:
            return {
                "error": {
                    "status": 409,
                    "code": "CONFLICT",
                    "message": "Conflict with an existing session for the same device.",
                }
            }

    if CAMARA_MOCK or not CAMARA_QOD_BASE_URL:
        session_id = str(uuid.uuid4())
        started = _now_utc()
        expires = started + timedelta(seconds=duration)
        item: dict[str, object] = {
            "sessionId": session_id,
            "duration": duration,
            "qosStatus": "AVAILABLE",
            "startedAt": _as_rfc3339(started),
            "expiresAt": _as_rfc3339(expires),
            "applicationServer": app_server,
            "qosProfile": qos_profile,
            "_flow_key": flow_key,
        }
        normalized = _normalize_device_for_response(device)
        if normalized:
            item["device"] = normalized
        if "devicePorts" in payload:
            item["devicePorts"] = payload["devicePorts"]
        if "applicationServerPorts" in payload:
            item["applicationServerPorts"] = payload["applicationServerPorts"]
        if "sink" in payload:
            item["sink"] = payload["sink"]
        if "sinkCredential" in payload:
            item["sinkCredential"] = payload["sinkCredential"]
        _MOCK_SESSIONS[session_id] = item

        out = dict(item)
        out.pop("_flow_key", None)
        return {"_http_status": 201, "item": out, "mock": True}

    try:
        url = f"{_operator_base()}/sessions"
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.post(url, json=payload, headers=_operator_headers())

        if response.status_code == 201:
            body = response.json() if response.content else {}
            return {"_http_status": 201, "item": body}
        return _parse_operator_error(response, default_code="INVALID_ARGUMENT")
    except Exception as exc:
        session_id = str(uuid.uuid4())
        started = _now_utc()
        expires = started + timedelta(seconds=duration)
        item = {
            "sessionId": session_id,
            "duration": duration,
            "qosStatus": "AVAILABLE",
            "startedAt": _as_rfc3339(started),
            "expiresAt": _as_rfc3339(expires),
            "applicationServer": app_server,
            "qosProfile": qos_profile,
            "_flow_key": flow_key,
        }
        normalized = _normalize_device_for_response(device)
        if normalized:
            item["device"] = normalized
        if "devicePorts" in payload:
            item["devicePorts"] = payload["devicePorts"]
        if "applicationServerPorts" in payload:
            item["applicationServerPorts"] = payload["applicationServerPorts"]
        if "sink" in payload:
            item["sink"] = payload["sink"]
        if "sinkCredential" in payload:
            item["sinkCredential"] = payload["sinkCredential"]
        _MOCK_SESSIONS[session_id] = item

        out = dict(item)
        out.pop("_flow_key", None)
        return {"_http_status": 201, "item": out, "mock": True, "live_error": str(exc)}


def get_session(session_id: str) -> dict[str, object]:
    """Get one QoD session by sessionId."""
    try:
        uuid.UUID(session_id)
    except ValueError:
        return {
            "error": {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "sessionId must be a valid UUID.",
            }
        }

    if CAMARA_MOCK or not CAMARA_QOD_BASE_URL:
        item = _MOCK_SESSIONS.get(session_id)
        if not item:
            return {
                "error": {
                    "status": 404,
                    "code": "NOT_FOUND",
                    "message": "The specified resource is not found.",
                }
            }
        out = dict(item)
        out.pop("_flow_key", None)
        return {"_http_status": 200, "item": out, "mock": True}

    try:
        url = f"{_operator_base()}/sessions/{session_id}"
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.get(url, headers=_operator_headers())

        if response.status_code == 200:
            body = response.json() if response.content else {}
            return {"_http_status": 200, "item": body}
        return _parse_operator_error(response, default_code="NOT_FOUND")
    except Exception:
        item = _MOCK_SESSIONS.get(session_id)
        if not item:
            return {
                "error": {
                    "status": 404,
                    "code": "NOT_FOUND",
                    "message": "The specified resource is not found.",
                }
            }
        out = dict(item)
        out.pop("_flow_key", None)
        return {"_http_status": 200, "item": out, "mock": True}


def delete_session(session_id: str) -> dict[str, object]:
    """Delete a QoD session by sessionId."""
    try:
        uuid.UUID(session_id)
    except ValueError:
        return {
            "error": {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "sessionId must be a valid UUID.",
            }
        }

    if CAMARA_MOCK or not CAMARA_QOD_BASE_URL:
        if session_id not in _MOCK_SESSIONS:
            return {
                "error": {
                    "status": 404,
                    "code": "NOT_FOUND",
                    "message": "The specified resource is not found.",
                }
            }
        _MOCK_SESSIONS.pop(session_id, None)
        return {"_http_status": 204, "mock": True}

    try:
        url = f"{_operator_base()}/sessions/{session_id}"
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.delete(url, headers=_operator_headers())

        if response.status_code == 204:
            return {"_http_status": 204}
        return _parse_operator_error(response, default_code="NOT_FOUND")
    except Exception:
        if session_id not in _MOCK_SESSIONS:
            return {
                "error": {
                    "status": 404,
                    "code": "NOT_FOUND",
                    "message": "The specified resource is not found.",
                }
            }
        _MOCK_SESSIONS.pop(session_id, None)
        return {"_http_status": 204, "mock": True}


def extend_session(session_id: str, payload: dict[str, object]) -> dict[str, object]:
    """Extend an active QoD session duration."""
    try:
        uuid.UUID(session_id)
    except ValueError:
        return {
            "error": {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "sessionId must be a valid UUID.",
            }
        }

    additional = payload.get("requestedAdditionalDuration")
    if not isinstance(additional, int) or additional < 1:
        return {
            "error": {
                "status": 400,
                "code": "OUT_OF_RANGE",
                "message": "requestedAdditionalDuration must be an integer >= 1.",
            }
        }

    if CAMARA_MOCK or not CAMARA_QOD_BASE_URL:
        item = _MOCK_SESSIONS.get(session_id)
        if not item:
            return {
                "error": {
                    "status": 404,
                    "code": "NOT_FOUND",
                    "message": "The specified resource is not found.",
                }
            }
        if item.get("qosStatus") != "AVAILABLE":
            return {
                "error": {
                    "status": 409,
                    "code": "QUALITY_ON_DEMAND.SESSION_EXTENSION_NOT_ALLOWED",
                    "message": "Extending the session duration is not allowed in the current state (qosStatus). The session must be in the AVAILABLE state.",
                }
            }

        current_duration = int(item.get("duration", 1))
        profile = str(item.get("qosProfile", "QOS_M"))
        cap = _MAX_DURATION_BY_PROFILE.get(profile, current_duration + additional)
        new_duration = min(current_duration + additional, cap)
        item["duration"] = new_duration

        started_at = item.get("startedAt")
        if isinstance(started_at, str):
            started = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
        else:
            started = _now_utc()
        item["expiresAt"] = _as_rfc3339(started + timedelta(seconds=new_duration))

        out = dict(item)
        out.pop("_flow_key", None)
        return {"_http_status": 200, "item": out, "mock": True}

    try:
        url = f"{_operator_base()}/sessions/{session_id}/extend"
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.post(url, json=payload, headers=_operator_headers())

        if response.status_code == 200:
            body = response.json() if response.content else {}
            return {"_http_status": 200, "item": body}
        return _parse_operator_error(response, default_code="INVALID_ARGUMENT")
    except Exception as exc:
        item = _MOCK_SESSIONS.get(session_id)
        if not item:
            return {
                "error": {
                    "status": 404,
                    "code": "NOT_FOUND",
                    "message": "The specified resource is not found.",
                }
            }
        if item.get("qosStatus") != "AVAILABLE":
            return {
                "error": {
                    "status": 409,
                    "code": "QUALITY_ON_DEMAND.SESSION_EXTENSION_NOT_ALLOWED",
                    "message": "Extending the session duration is not allowed in the current state (qosStatus). The session must be in the AVAILABLE state.",
                }
            }
        current_duration = int(item.get("duration", 1))
        profile = str(item.get("qosProfile", "QOS_M"))
        cap = _MAX_DURATION_BY_PROFILE.get(profile, current_duration + additional)
        new_duration = min(current_duration + additional, cap)
        item["duration"] = new_duration
        started_at = item.get("startedAt")
        if isinstance(started_at, str):
            started = datetime.fromisoformat(started_at.replace("Z", "+00:00"))
        else:
            started = _now_utc()
        item["expiresAt"] = _as_rfc3339(started + timedelta(seconds=new_duration))
        out = dict(item)
        out.pop("_flow_key", None)
        return {"_http_status": 200, "item": out, "mock": True, "live_error": str(exc)}


def retrieve_sessions(payload: dict[str, object]) -> dict[str, object]:
    """Retrieve sessions for a device."""
    err = _validate_device(payload.get("device"), required=True)
    if err:
        return {"error": err}

    if CAMARA_MOCK or not CAMARA_QOD_BASE_URL:
        device_key = _device_key(payload.get("device") if isinstance(payload.get("device"), dict) else None)
        items: list[dict[str, object]] = []
        for item in _MOCK_SESSIONS.values():
            if _device_key(item.get("device") if isinstance(item.get("device"), dict) else None) == device_key:
                out = dict(item)
                out.pop("_flow_key", None)
                items.append(out)
        return {"_http_status": 200, "items": items, "mock": True}

    try:
        url = f"{_operator_base()}/retrieve-sessions"
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.post(url, json=payload, headers=_operator_headers())

        if response.status_code == 200:
            body = response.json() if response.content else []
            return {"_http_status": 200, "items": body}
        return _parse_operator_error(response, default_code="NOT_FOUND")
    except Exception:
        device_key = _device_key(payload.get("device") if isinstance(payload.get("device"), dict) else None)
        items: list[dict[str, object]] = []
        for item in _MOCK_SESSIONS.values():
            if _device_key(item.get("device") if isinstance(item.get("device"), dict) else None) == device_key:
                out = dict(item)
                out.pop("_flow_key", None)
                items.append(out)
        return {"_http_status": 200, "items": items, "mock": True}


def request_priority(phone_number: str, profile: str = "QOS_E") -> dict[str, object]:
    """Backward-compatible helper used by decision logic."""
    payload = {
        "device": {"phoneNumber": phone_number},
        "applicationServer": {"ipv4Address": "0.0.0.0/0"},
        "qosProfile": profile,
        "duration": 3600,
    }
    result = create_session(payload)
    if "error" in result:
        return {
            "session_id": str(uuid.uuid4()),
            "status": "REQUESTED",
            "profile": profile,
            "phone_number": phone_number,
            "mock": True,
            "error": result["error"],
        }
    item = result.get("item", {})
    return {
        "session_id": item.get("sessionId", str(uuid.uuid4())),
        "status": item.get("qosStatus", "REQUESTED"),
        "profile": profile,
        "phone_number": phone_number,
        "mock": bool(result.get("mock", False)),
    }


def release_session(session_id: str) -> dict[str, object]:
    """Backward-compatible helper used by older call sites."""
    result = delete_session(session_id)
    if "error" in result:
        return {
            "session_id": session_id,
            "status": "RELEASE_FAILED",
            "error": result["error"],
        }
    return {"session_id": session_id, "status": "RELEASED", "mock": bool(result.get("mock", False))}
