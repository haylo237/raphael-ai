"""CAMARA QoS Provisioning adapter (vwip).

Implements:
- POST /qos-assignments
- GET /qos-assignments/{assignmentId}
- DELETE /qos-assignments/{assignmentId}
- POST /retrieve-qos-assignment
"""

from __future__ import annotations

import ipaddress
import re
import uuid
from datetime import UTC, datetime

import httpx

from app.camara.config import (
    CAMARA_MOCK,
    CAMARA_QOS_PROVISIONING_BASE_URL,
    CAMARA_QOS_PROVISIONING_CLIENT_ID,
    CAMARA_QOS_PROVISIONING_CLIENT_SECRET,
)

_TIMEOUT = 10.0
_QOS_PROFILE_PATTERN = re.compile(r"^[a-zA-Z0-9_.-]+$")
_PHONE_PATTERN = re.compile(r"^\+[1-9][0-9]{4,14}$")

_SUPPORTED_DEVICE_KEYS = {"phoneNumber", "networkAccessIdentifier", "ipv4Address", "ipv6Address"}

# Minimal catalog for applicability checks in mock mode.
# Profiles that are not ACTIVE are not applicable for provisioning.
_PROFILE_STATUS = {
    "voice": "ACTIVE",
    "QOS_E": "ACTIVE",
    "QOS_S": "ACTIVE",
    "QOS_M": "ACTIVE",
    "QOS_L": "DEPRECATED",
}

_MOCK_ASSIGNMENTS: dict[str, dict[str, object]] = {}


def _now_utc() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _normalize_device_for_response(device: dict[str, object] | None) -> dict[str, object] | None:
    if not device:
        return None
    for key in ("phoneNumber", "ipv4Address", "ipv6Address", "networkAccessIdentifier"):
        if key in device:
            return {key: device[key]}
    return None


def _validate_qos_profile_name(name: object) -> dict[str, object] | None:
    if not isinstance(name, str):
        return {
            "status": 400,
            "code": "INVALID_ARGUMENT",
            "message": "qosProfile must be a string.",
        }
    if len(name) < 3 or len(name) > 256 or _QOS_PROFILE_PATTERN.fullmatch(name) is None:
        return {
            "status": 400,
            "code": "INVALID_ARGUMENT",
            "message": "qosProfile must be a valid QosProfileName.",
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


def _validate_device(
    device: object,
    *,
    required: bool,
    token_device_identified: bool = False,
) -> dict[str, object] | None:
    if token_device_identified and device is not None:
        return {
            "status": 422,
            "code": "UNNECESSARY_IDENTIFIER",
            "message": "The device is already identified by the access token.",
        }

    if device is None:
        if token_device_identified:
            return None
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
    if phone is not None:
        if not isinstance(phone, str) or _PHONE_PATTERN.fullmatch(phone) is None:
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


def _base_assignment(payload: dict[str, object]) -> dict[str, object]:
    assignment: dict[str, object] = {
        "assignmentId": str(uuid.uuid4()),
        "qosProfile": payload["qosProfile"],
        "status": "REQUESTED",
    }

    device = _normalize_device_for_response(payload.get("device") if isinstance(payload.get("device"), dict) else None)
    if device:
        assignment["device"] = device

    sink = payload.get("sink")
    if sink is not None:
        assignment["sink"] = sink

    sink_credential = payload.get("sinkCredential")
    if isinstance(sink_credential, dict):
        assignment["sinkCredential"] = sink_credential

    return assignment


def _mark_created_status(assignment: dict[str, object]) -> None:
    qos_profile = str(assignment.get("qosProfile", ""))
    profile_status = _PROFILE_STATUS.get(qos_profile, "ACTIVE")

    if profile_status == "ACTIVE":
        assignment["status"] = "AVAILABLE"
        assignment["startedAt"] = _now_utc()
    elif profile_status in {"INACTIVE", "DEPRECATED"}:
        assignment["status"] = "UNAVAILABLE"
        assignment["statusInfo"] = "NETWORK_TERMINATED"


def _operator_token() -> str:
    if not CAMARA_QOS_PROVISIONING_BASE_URL or not CAMARA_QOS_PROVISIONING_CLIENT_ID:
        raise ValueError(
            "CAMARA_QOS_PROVISIONING_BASE_URL and CAMARA_QOS_PROVISIONING_CLIENT_ID are required"
        )

    token_url = f"{CAMARA_QOS_PROVISIONING_BASE_URL.rstrip('/')}/oauth2/token"
    with httpx.Client(timeout=_TIMEOUT) as client:
        response = client.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": CAMARA_QOS_PROVISIONING_CLIENT_ID,
                "client_secret": CAMARA_QOS_PROVISIONING_CLIENT_SECRET,
                "scope": (
                    "qos-provisioning:qos-assignments:create "
                    "qos-provisioning:qos-assignments:read "
                    "qos-provisioning:qos-assignments:read-by-device "
                    "qos-provisioning:qos-assignments:delete"
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
    return f"{CAMARA_QOS_PROVISIONING_BASE_URL.rstrip('/')}/qos-provisioning/vwip"


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


def create_qos_assignment(
    payload: dict[str, object],
    *,
    token_device_identified: bool = False,
) -> dict[str, object]:
    """Create a persistent QoS assignment for a device."""
    err = _validate_qos_profile_name(payload.get("qosProfile"))
    if err:
        return {"error": err}

    err = _validate_device(
        payload.get("device"),
        required=True,
        token_device_identified=token_device_identified,
    )
    if err:
        return {"error": err}

    err = _validate_sink_and_credentials(payload)
    if err:
        return {"error": err}

    profile_name = str(payload["qosProfile"])
    profile_status = _PROFILE_STATUS.get(profile_name, "ACTIVE")
    if profile_status in {"INACTIVE", "DEPRECATED"}:
        return {
            "error": {
                "status": 422,
                "code": "QOS_PROVISIONING.QOS_PROFILE_NOT_APPLICABLE",
                "message": "The requested QoS Profile is not compatible with the QoS Provisioning service.",
            }
        }

    device = payload.get("device") if isinstance(payload.get("device"), dict) else None
    key = _device_key(device)
    if key:
        for assignment in _MOCK_ASSIGNMENTS.values():
            if assignment.get("_device_key") == key and assignment.get("status") in {"REQUESTED", "AVAILABLE"}:
                return {
                    "error": {
                        "status": 409,
                        "code": "CONFLICT",
                        "message": "There is another existing provisioning for the same device",
                    }
                }

    if CAMARA_MOCK or not CAMARA_QOS_PROVISIONING_BASE_URL:
        assignment = _base_assignment(payload)
        _mark_created_status(assignment)
        assignment["_device_key"] = key
        _MOCK_ASSIGNMENTS[str(assignment["assignmentId"])] = assignment
        out = dict(assignment)
        out.pop("_device_key", None)
        return {"_http_status": 201, "item": out, "mock": True}

    try:
        url = f"{_operator_base()}/qos-assignments"
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.post(url, json=payload, headers=_operator_headers())

        if response.status_code == 201:
            body = response.json() if response.content else {}
            return {"_http_status": 201, "item": body}
        return _parse_operator_error(response, default_code="INVALID_ARGUMENT")
    except Exception as exc:
        assignment = _base_assignment(payload)
        _mark_created_status(assignment)
        assignment["_device_key"] = key
        _MOCK_ASSIGNMENTS[str(assignment["assignmentId"])] = assignment
        out = dict(assignment)
        out.pop("_device_key", None)
        return {"_http_status": 201, "item": out, "mock": True, "live_error": str(exc)}


def get_qos_assignment_by_id(assignment_id: str) -> dict[str, object]:
    """Get assignment details by assignment id."""
    try:
        uuid.UUID(assignment_id)
    except ValueError:
        return {
            "error": {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "assignmentId must be a valid UUID.",
            }
        }

    if CAMARA_MOCK or not CAMARA_QOS_PROVISIONING_BASE_URL:
        assignment = _MOCK_ASSIGNMENTS.get(assignment_id)
        if not assignment:
            return {
                "error": {
                    "status": 404,
                    "code": "NOT_FOUND",
                    "message": "The specified resource is not found.",
                }
            }
        out = dict(assignment)
        out.pop("_device_key", None)
        return {"_http_status": 200, "item": out, "mock": True}

    try:
        url = f"{_operator_base()}/qos-assignments/{assignment_id}"
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.get(url, headers=_operator_headers())

        if response.status_code == 200:
            body = response.json() if response.content else {}
            return {"_http_status": 200, "item": body}
        return _parse_operator_error(response, default_code="NOT_FOUND")
    except Exception as exc:
        assignment = _MOCK_ASSIGNMENTS.get(assignment_id)
        if not assignment:
            return {
                "error": {
                    "status": 404,
                    "code": "NOT_FOUND",
                    "message": "The specified resource is not found.",
                }
            }
        out = dict(assignment)
        out.pop("_device_key", None)
        return {"_http_status": 200, "item": out, "mock": True, "live_error": str(exc)}


def retrieve_qos_assignment_by_device(
    payload: dict[str, object],
    *,
    token_device_identified: bool = False,
) -> dict[str, object]:
    """Retrieve assignment details by device identifiers."""
    err = _validate_device(
        payload.get("device"),
        required=True,
        token_device_identified=token_device_identified,
    )
    if err:
        return {"error": err}

    if CAMARA_MOCK or not CAMARA_QOS_PROVISIONING_BASE_URL:
        key = _device_key(payload.get("device") if isinstance(payload.get("device"), dict) else None)
        for assignment in _MOCK_ASSIGNMENTS.values():
            if assignment.get("_device_key") == key:
                out = dict(assignment)
                out.pop("_device_key", None)
                return {"_http_status": 200, "item": out, "mock": True}
        return {
            "error": {
                "status": 404,
                "code": "NOT_FOUND",
                "message": "The specified resource is not found.",
            }
        }

    try:
        url = f"{_operator_base()}/retrieve-qos-assignment"
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.post(url, json=payload, headers=_operator_headers())

        if response.status_code == 200:
            body = response.json() if response.content else {}
            return {"_http_status": 200, "item": body}
        return _parse_operator_error(response, default_code="NOT_FOUND")
    except Exception as exc:
        key = _device_key(payload.get("device") if isinstance(payload.get("device"), dict) else None)
        for assignment in _MOCK_ASSIGNMENTS.values():
            if assignment.get("_device_key") == key:
                out = dict(assignment)
                out.pop("_device_key", None)
                return {"_http_status": 200, "item": out, "mock": True, "live_error": str(exc)}
        return {
            "error": {
                "status": 404,
                "code": "NOT_FOUND",
                "message": "The specified resource is not found.",
            }
        }


def revoke_qos_assignment(assignment_id: str) -> dict[str, object]:
    """Revoke a QoS assignment by assignment id."""
    try:
        uuid.UUID(assignment_id)
    except ValueError:
        return {
            "error": {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "assignmentId must be a valid UUID.",
            }
        }

    if CAMARA_MOCK or not CAMARA_QOS_PROVISIONING_BASE_URL:
        assignment = _MOCK_ASSIGNMENTS.get(assignment_id)
        if not assignment:
            return {
                "error": {
                    "status": 404,
                    "code": "NOT_FOUND",
                    "message": "The specified resource is not found.",
                }
            }

        current_status = assignment.get("status")
        if current_status == "AVAILABLE":
            assignment["statusInfo"] = "DELETE_REQUESTED"
            out = dict(assignment)
            out.pop("_device_key", None)
            return {"_http_status": 202, "item": out, "mock": True}

        _MOCK_ASSIGNMENTS.pop(assignment_id, None)
        return {"_http_status": 204, "mock": True}

    try:
        url = f"{_operator_base()}/qos-assignments/{assignment_id}"
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.delete(url, headers=_operator_headers())

        if response.status_code == 204:
            return {"_http_status": 204}
        if response.status_code == 202:
            body = response.json() if response.content else {}
            return {"_http_status": 202, "item": body}
        return _parse_operator_error(response, default_code="NOT_FOUND")
    except Exception:
        assignment = _MOCK_ASSIGNMENTS.get(assignment_id)
        if not assignment:
            return {
                "error": {
                    "status": 404,
                    "code": "NOT_FOUND",
                    "message": "The specified resource is not found.",
                }
            }
        current_status = assignment.get("status")
        if current_status == "AVAILABLE":
            assignment["statusInfo"] = "DELETE_REQUESTED"
            out = dict(assignment)
            out.pop("_device_key", None)
            return {"_http_status": 202, "item": out, "mock": True}
        _MOCK_ASSIGNMENTS.pop(assignment_id, None)
        return {"_http_status": 204, "mock": True}
