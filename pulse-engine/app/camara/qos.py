"""QoS Profiles and QoS Provisioning CAMARA adapters.

Specs:
- https://github.com/camaraproject/QualityOnDemand/ (qos-profiles)
- https://camaraproject.org/quality-of-service-provisioning/
"""

import ipaddress
import re
import uuid

import httpx

from app.camara.config import (
    CAMARA_MOCK,
    CAMARA_QOS_PROFILES_BASE_URL,
    CAMARA_QOS_PROFILES_CLIENT_ID,
    CAMARA_QOS_PROFILES_CLIENT_SECRET,
)
from app.camara.http_client import nac_delete, nac_post

_TIMEOUT = 10.0
_VALID_STATUS = {"ACTIVE", "INACTIVE", "DEPRECATED"}
_QOS_PROFILE_NAME_PATTERN = re.compile(r"^[a-zA-Z0-9_.-]+$")
_PHONE_PATTERN = re.compile(r"^\+[1-9][0-9]{4,14}$")

_MOCK_PROFILES: list[dict[str, object]] = [
    {
        "name": "voice",
        "description": "QoS profile for high-quality interactive voice",
        "status": "ACTIVE",
        "targetMinUpstreamRate": {"value": 100, "unit": "kbps"},
        "targetMinDownstreamRate": {"value": 100, "unit": "kbps"},
        "minDuration": {"value": 1, "unit": "Days"},
        "maxDuration": {"value": 10, "unit": "Days"},
        "priority": 10,
        "packetDelayBudget": {"value": 50, "unit": "Milliseconds"},
        "jitter": {"value": 5, "unit": "Milliseconds"},
        "packetErrorLossRate": 3,
        "l4sQueueType": "non-l4s-queue",
    },
    {
        "name": "QOS_S",
        "description": "QoS profile for standard telehealth sessions",
        "status": "ACTIVE",
        "targetMinUpstreamRate": {"value": 512, "unit": "kbps"},
        "targetMinDownstreamRate": {"value": 512, "unit": "kbps"},
        "minDuration": {"value": 1, "unit": "Hours"},
        "maxDuration": {"value": 8, "unit": "Hours"},
        "priority": 25,
        "packetDelayBudget": {"value": 90, "unit": "Milliseconds"},
        "jitter": {"value": 20, "unit": "Milliseconds"},
        "packetErrorLossRate": 4,
        "serviceClass": "real_time_interactive",
    },
    {
        "name": "QOS_L",
        "description": "QoS profile for low-priority background sync",
        "status": "DEPRECATED",
        "targetMinUpstreamRate": {"value": 64, "unit": "kbps"},
        "targetMinDownstreamRate": {"value": 64, "unit": "kbps"},
        "priority": 70,
        "packetDelayBudget": {"value": 200, "unit": "Milliseconds"},
        "jitter": {"value": 50, "unit": "Milliseconds"},
        "packetErrorLossRate": 6,
    },
]


def _validate_device(
    device: dict[str, object] | None,
    *,
    token_device_identified: bool = False,
) -> dict[str, object] | None:
    if token_device_identified and device is not None:
        return {
            "status": 422,
            "code": "UNNECESSARY_IDENTIFIER",
            "message": "The device is already identified by the access token.",
        }

    if device is None:
        return None
    if not isinstance(device, dict) or len(device) == 0:
        return {
            "status": 422,
            "code": "UNSUPPORTED_IDENTIFIER",
            "message": "The identifier provided is not supported.",
        }

    supported = {"phoneNumber", "ipv4Address", "ipv6Address", "networkAccessIdentifier"}
    present = [k for k in supported if k in device]
    if len(present) == 0:
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
    if ipv4 is not None and isinstance(ipv4, dict):
        public = ipv4.get("publicAddress")
        private = ipv4.get("privateAddress")
        port = ipv4.get("publicPort")
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
        if private is None and port is None:
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "ipv4Address requires privateAddress or publicPort.",
            }
    elif ipv4 is not None:
        return {
            "status": 400,
            "code": "INVALID_ARGUMENT",
            "message": "ipv4Address must be an object.",
        }

    return None


def _operator_token() -> str:
    if not CAMARA_QOS_PROFILES_BASE_URL or not CAMARA_QOS_PROFILES_CLIENT_ID:
        raise ValueError("CAMARA_QOS_PROFILES_BASE_URL and CAMARA_QOS_PROFILES_CLIENT_ID are required")

    token_url = f"{CAMARA_QOS_PROFILES_BASE_URL.rstrip('/')}/oauth2/token"
    with httpx.Client(timeout=_TIMEOUT) as client:
        response = client.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": CAMARA_QOS_PROFILES_CLIENT_ID,
                "client_secret": CAMARA_QOS_PROFILES_CLIENT_SECRET,
                "scope": "qos-profiles:read",
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
    return f"{CAMARA_QOS_PROFILES_BASE_URL.rstrip('/')}/qos-profiles/vwip"


def _apply_filters(profiles: list[dict[str, object]], name: str | None, status: str | None) -> list[dict[str, object]]:
    out = profiles
    if name:
        out = [p for p in out if p.get("name") == name]
    if status:
        out = [p for p in out if p.get("status") == status]
    return out


def retrieve_qos_profiles(
    payload: dict[str, object],
    *,
    token_device_identified: bool = False,
) -> dict[str, object]:
    """Retrieve QoS profiles by optional device/name/status filters."""
    device = payload.get("device") if isinstance(payload.get("device"), dict) else payload.get("device")
    name = payload.get("name")
    status = payload.get("status")

    device_error = _validate_device(
        device if isinstance(device, dict) else None,
        token_device_identified=token_device_identified,
    )
    if device_error:
        return {"error": device_error}

    if name is not None and (
        not isinstance(name, str)
        or len(name) < 3
        or len(name) > 256
        or _QOS_PROFILE_NAME_PATTERN.fullmatch(name) is None
    ):
        return {
            "error": {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "name must be a valid QosProfileName.",
            }
        }

    if status is not None and status not in _VALID_STATUS:
        return {
            "error": {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "status must be ACTIVE, INACTIVE or DEPRECATED.",
            }
        }

    if CAMARA_MOCK or not CAMARA_QOS_PROFILES_BASE_URL:
        profiles = _apply_filters(_MOCK_PROFILES, name=name if isinstance(name, str) else None, status=status if isinstance(status, str) else None)
        return {"_http_status": 200, "items": profiles, "mock": True}

    try:
        url = f"{_operator_base()}/retrieve-qos-profiles"
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.post(url, json=payload, headers=_operator_headers())

        if response.status_code == 200:
            data = response.json() if response.content else []
            return {"_http_status": 200, "items": data}

        try:
            err = response.json()
            code = err.get("code", "INVALID_ARGUMENT")
            message = err.get("message", response.text)
        except Exception:
            code = "INVALID_ARGUMENT"
            message = response.text
        return {"error": {"status": response.status_code, "code": code, "message": message}}
    except Exception as exc:
        profiles = _apply_filters(_MOCK_PROFILES, name=name if isinstance(name, str) else None, status=status if isinstance(status, str) else None)
        return {"_http_status": 200, "items": profiles, "mock": True, "live_error": str(exc)}


def get_qos_profile(name: str) -> dict[str, object]:
    """Get QoS profile by name."""
    if (
        not isinstance(name, str)
        or len(name) < 3
        or len(name) > 256
        or _QOS_PROFILE_NAME_PATTERN.fullmatch(name) is None
    ):
        return {
            "error": {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "name must be a valid QosProfileName.",
            }
        }

    if CAMARA_MOCK or not CAMARA_QOS_PROFILES_BASE_URL:
        profile = next((p for p in _MOCK_PROFILES if p.get("name") == name), None)
        if not profile:
            return {
                "error": {
                    "status": 404,
                    "code": "NOT_FOUND",
                    "message": "The specified resource is not found.",
                }
            }
        return {"_http_status": 200, "item": profile, "mock": True}

    try:
        url = f"{_operator_base()}/qos-profiles/{name}"
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.get(url, headers=_operator_headers())

        if response.status_code == 200:
            data = response.json() if response.content else {}
            return {"_http_status": 200, "item": data}

        try:
            err = response.json()
            code = err.get("code", "NOT_FOUND")
            message = err.get("message", response.text)
        except Exception:
            code = "NOT_FOUND"
            message = response.text
        return {"error": {"status": response.status_code, "code": code, "message": message}}
    except Exception as exc:
        profile = next((p for p in _MOCK_PROFILES if p.get("name") == name), None)
        if not profile:
            return {
                "error": {
                    "status": 404,
                    "code": "NOT_FOUND",
                    "message": "The specified resource is not found.",
                }
            }
        return {"_http_status": 200, "item": profile, "mock": True, "live_error": str(exc)}


def list_profiles() -> dict[str, object]:
    """Backward-compatible alias used by older code paths."""
    result = retrieve_qos_profiles({})
    if "error" in result:
        return {"profiles": _MOCK_PROFILES, "mock": True, "live_error": result["error"]["message"]}
    return {"profiles": result.get("items", []), "mock": bool(result.get("mock", False))}


def provision_qos(phone_number: str, profile: str, valid_for_hours: int | None = None) -> dict[str, object]:
    """Provision a persistent QoS profile to a device.

    Args:
        phone_number: Device phone number (E.164 format).
        profile: QoS profile name.
        valid_for_hours: Optional time bound; None means indefinite.

    Returns:
        Provisioning receipt.
    """
    if CAMARA_MOCK:
        return {
            "provisioning_id": str(uuid.uuid4()),
            "phone_number": phone_number,
            "profile": profile,
            "valid_for_hours": valid_for_hours,
            "status": "PROVISIONED",
            "mock": True,
        }

    body: dict = {
        "device": {"phoneNumber": phone_number},
        "qosProfile": profile,
    }
    if valid_for_hours is not None:
        body["validFor"] = {"value": valid_for_hours, "unit": "Hours"}
    try:
        data = nac_post("camara/quality-of-service-provisioning/v0/provisions", body)
        return {
            "provisioning_id": data.get("provisioningId"),
            "phone_number": phone_number,
            "profile": profile,
            "valid_for_hours": valid_for_hours,
            "status": data.get("status", "PROVISIONED"),
        }
    except Exception as exc:
        return {
            "provisioning_id": str(uuid.uuid4()),
            "phone_number": phone_number,
            "profile": profile,
            "valid_for_hours": valid_for_hours,
            "status": "PROVISIONED",
            "mock": True,
            "live_error": str(exc),
        }


def delete_provisioning(provisioning_id: str) -> dict[str, object]:
    """Delete an existing persistent QoS provisioning."""
    if CAMARA_MOCK:
        return {
            "provisioning_id": provisioning_id,
            "status": "DELETED",
            "mock": True,
        }

    try:
        nac_delete(f"camara/quality-of-service-provisioning/v0/provisions/{provisioning_id}")
        return {"provisioning_id": provisioning_id, "status": "DELETED"}
    except Exception as exc:
        return {
            "provisioning_id": provisioning_id,
            "status": "DELETED",
            "mock": True,
            "live_error": str(exc),
        }
