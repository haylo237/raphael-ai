"""QoS Booking and Assignment CAMARA adapter.

Spec: https://github.com/camaraproject/QoSBooking (vwip)
"""

from __future__ import annotations

import json
import re
import uuid
from datetime import UTC, datetime, timedelta

import httpx

from app.camara.config import (
    CAMARA_MOCK,
    CAMARA_QOS_BOOKING_BASE_URL,
    CAMARA_QOS_BOOKING_CLIENT_ID,
    CAMARA_QOS_BOOKING_CLIENT_SECRET,
)

_TIMEOUT = 10.0
_QOS_PROFILE_PATTERN = re.compile(r"^[a-zA-Z0-9_.-]{3,256}$")
_E164_PATTERN = re.compile(r"^\+[1-9][0-9]{4,14}$")

_BOOKINGS: dict[str, dict[str, object]] = {}


def _now() -> datetime:
    return datetime.now(tz=UTC)


def _parse_time(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _jsonable_device_key(device: dict[str, object]) -> str:
    return json.dumps(device, sort_keys=True, separators=(",", ":"))


def _validate_sink_credential(sink_credential: dict[str, object] | None) -> dict[str, object] | None:
    if sink_credential is None:
        return None

    credential_type = sink_credential.get("credentialType")
    if credential_type != "ACCESSTOKEN":
        return {
            "status": 400,
            "code": "INVALID_CREDENTIAL",
            "message": "Only Access token is supported",
        }

    token_type = str(sink_credential.get("accessTokenType", "")).lower()
    if token_type and token_type != "bearer":
        return {
            "status": 400,
            "code": "INVALID_TOKEN",
            "message": "Only bearer token is supported",
        }

    if not sink_credential.get("accessToken") or not sink_credential.get("accessTokenExpiresUtc"):
        return {
            "status": 400,
            "code": "INVALID_ARGUMENT",
            "message": "sinkCredential requires accessToken and accessTokenExpiresUtc",
        }

    return None


def _validate_area(area: dict[str, object] | None) -> dict[str, object] | None:
    if not isinstance(area, dict):
        return {
            "status": 400,
            "code": "INVALID_ARGUMENT",
            "message": "serviceArea is required.",
        }

    area_type = area.get("areaType")
    if area_type == "CIRCLE":
        center = area.get("center")
        radius = area.get("radius")
        if not isinstance(center, dict) or not isinstance(radius, (int, float)) or radius <= 0:
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "CIRCLE area requires center and positive radius.",
            }
        lat = center.get("latitude")
        lon = center.get("longitude")
        if (
            not isinstance(lat, (int, float))
            or not isinstance(lon, (int, float))
            or lat < -90
            or lat > 90
            or lon < -180
            or lon > 180
        ):
            return {
                "status": 400,
                "code": "OUT_OF_RANGE",
                "message": "Invalid circle center coordinates.",
            }
        return None

    if area_type == "POLYGON":
        boundary = area.get("boundary")
        if not isinstance(boundary, list) or len(boundary) < 3 or len(boundary) > 15:
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "POLYGON area requires 3 to 15 boundary points.",
            }
        for p in boundary:
            if not isinstance(p, dict):
                return {
                    "status": 400,
                    "code": "INVALID_ARGUMENT",
                    "message": "POLYGON boundary points must be objects with latitude and longitude.",
                }
            lat = p.get("latitude")
            lon = p.get("longitude")
            if (
                not isinstance(lat, (int, float))
                or not isinstance(lon, (int, float))
                or lat < -90
                or lat > 90
                or lon < -180
                or lon > 180
            ):
                return {
                    "status": 400,
                    "code": "OUT_OF_RANGE",
                    "message": "Invalid polygon coordinates.",
                }
        return None

    return {
        "status": 400,
        "code": "INVALID_ARGUMENT",
        "message": "serviceArea.areaType must be CIRCLE or POLYGON.",
    }


def _validate_device(device: dict[str, object] | None) -> dict[str, object] | None:
    if not isinstance(device, dict) or len(device) == 0:
        return {
            "status": 422,
            "code": "MISSING_IDENTIFIER",
            "message": "The device cannot be identified.",
        }

    if "phoneNumber" in device:
        phone = device.get("phoneNumber")
        if not isinstance(phone, str) or not _E164_PATTERN.match(phone):
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "Invalid phoneNumber format.",
            }

    return None


def _validate_devices(devices: list[dict[str, object]] | None) -> dict[str, object] | None:
    if not isinstance(devices, list) or len(devices) == 0:
        return {
            "status": 422,
            "code": "MISSING_IDENTIFIER",
            "message": "At least one device is required.",
        }

    for d in devices:
        err = _validate_device(d if isinstance(d, dict) else None)
        if err:
            return err
    return None


def _booking_details(booking: dict[str, object]) -> dict[str, object]:
    return {
        "bookingId": booking["bookingId"],
        "totalDevices": booking["totalDevices"],
        "remainingDevices": booking["remainingDevices"],
        "qosProfile": booking["qosProfile"],
        "startTime": booking["startTime"],
        "duration": booking["duration"],
        "serviceArea": booking["serviceArea"],
    }


def _operator_token() -> str:
    if not CAMARA_QOS_BOOKING_BASE_URL or not CAMARA_QOS_BOOKING_CLIENT_ID:
        raise ValueError("CAMARA_QOS_BOOKING_BASE_URL and CAMARA_QOS_BOOKING_CLIENT_ID are required")

    token_url = f"{CAMARA_QOS_BOOKING_BASE_URL.rstrip('/')}/oauth2/token"
    with httpx.Client(timeout=_TIMEOUT) as client:
        response = client.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": CAMARA_QOS_BOOKING_CLIENT_ID,
                "client_secret": CAMARA_QOS_BOOKING_CLIENT_SECRET,
                "scope": "qos-booking-and-assignment:qos-bookings:create qos-booking-and-assignment:qos-bookings:read qos-booking-and-assignment:qos-bookings:delete qos-booking-and-assignment:qos-bookings:devices:create qos-booking-and-assignment:qos-bookings:devices:read qos-booking-and-assignment:qos-bookings:devices:delete qos-booking-and-assignment:qos-bookings:retrieve-by-device",
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
    return f"{CAMARA_QOS_BOOKING_BASE_URL.rstrip('/')}/qos-booking-and-assignment/vwip"


def _operator_call(method: str, path: str, payload: dict[str, object] | None = None) -> dict[str, object]:
    url = f"{_operator_base()}{path}"
    with httpx.Client(timeout=_TIMEOUT) as client:
        response = client.request(method, url, json=payload, headers=_operator_headers())

    if response.status_code in (200, 201, 202):
        data = response.json() if response.content else {}
        return {"_http_status": response.status_code, **data}

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
        }
    }


def create_booking(payload: dict[str, object]) -> dict[str, object]:
    qos_profile = payload.get("qosProfile")
    start_time = payload.get("startTime")
    duration = payload.get("duration")
    num_devices = int(payload.get("numDevices", 1))
    service_area = payload.get("serviceArea")
    sink = payload.get("sink")
    sink_credential = payload.get("sinkCredential") if isinstance(payload.get("sinkCredential"), dict) else None

    if not isinstance(qos_profile, str) or not _QOS_PROFILE_PATTERN.match(qos_profile):
        return {
            "error": {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "Invalid qosProfile format.",
            }
        }

    if not isinstance(start_time, str):
        return {
            "error": {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "startTime is required and must be RFC3339 date-time.",
            }
        }

    try:
        parsed_start = _parse_time(start_time)
    except Exception:
        return {
            "error": {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "startTime is required and must be RFC3339 date-time.",
            }
        }

    if not isinstance(duration, int) or duration < 1:
        return {
            "error": {
                "status": 400,
                "code": "OUT_OF_RANGE",
                "message": "duration must be >= 1.",
            }
        }

    if num_devices < 1:
        return {
            "error": {
                "status": 400,
                "code": "OUT_OF_RANGE",
                "message": "numDevices must be >= 1.",
            }
        }

    area_error = _validate_area(service_area if isinstance(service_area, dict) else None)
    if area_error:
        return {"error": area_error}

    if sink is not None:
        if not isinstance(sink, str) or not sink.startswith("https://"):
            return {
                "error": {
                    "status": 400,
                    "code": "INVALID_SINK",
                    "message": "sink not valid for the specified protocol",
                }
            }

    sink_credential_error = _validate_sink_credential(sink_credential)
    if sink_credential_error:
        return {"error": sink_credential_error}

    if not CAMARA_MOCK and CAMARA_QOS_BOOKING_BASE_URL:
        try:
            return _operator_call("POST", "/qos-bookings", payload)
        except Exception as exc:
            fallback = create_booking({**payload})
            if "error" not in fallback:
                fallback["live_error"] = str(exc)
            return fallback

    booking_id = str(uuid.uuid4())
    booking = {
        "bookingId": booking_id,
        "totalDevices": num_devices,
        "remainingDevices": num_devices,
        "qosProfile": qos_profile,
        "startTime": start_time,
        "duration": duration,
        "serviceArea": service_area,
        "assignedDevices": [],
        "status": "SUCCESSFUL",
        "statusInfo": "BOOKING_ACCEPTED",
        "createdAt": _now(),
        "expiresAt": parsed_start + timedelta(seconds=duration),
        "mock": True,
    }
    _BOOKINGS[booking_id] = booking

    return {
        "_http_status": 201,
        "bookingId": booking_id,
        "totalDevices": num_devices,
        "remainingDevices": num_devices,
        "qosProfile": qos_profile,
        "startTime": start_time,
        "duration": duration,
        "serviceArea": service_area,
        "status": "SUCCESSFUL",
        "statusInfo": "BOOKING_ACCEPTED",
        "mock": True,
    }


def get_booking(booking_id: str) -> dict[str, object]:
    if not CAMARA_MOCK and CAMARA_QOS_BOOKING_BASE_URL:
        return _operator_call("GET", f"/qos-bookings/{booking_id}")

    booking = _BOOKINGS.get(booking_id)
    if not booking:
        return {
            "error": {
                "status": 404,
                "code": "NOT_FOUND",
                "message": "The specified resource is not found.",
            }
        }

    return {
        "_http_status": 200,
        **_booking_details(booking),
        "status": booking["status"],
        "statusInfo": booking["statusInfo"],
        "mock": True,
    }


def delete_booking(booking_id: str) -> dict[str, object]:
    if not CAMARA_MOCK and CAMARA_QOS_BOOKING_BASE_URL:
        return _operator_call("DELETE", f"/qos-bookings/{booking_id}")

    booking = _BOOKINGS.get(booking_id)
    if not booking:
        return {
            "error": {
                "status": 404,
                "code": "NOT_FOUND",
                "message": "The specified resource is not found.",
            }
        }

    booking["status"] = "SUCCESSFUL"
    booking["statusInfo"] = "BOOKING_CANCELLED"
    return {
        "_http_status": 200,
        **_booking_details(booking),
        "status": "SUCCESSFUL",
        "statusInfo": "BOOKING_CANCELLED",
        "mock": True,
    }


def assign_devices(booking_id: str, payload: dict[str, object]) -> dict[str, object]:
    devices = payload.get("devices")
    sink = payload.get("sink")
    sink_credential = payload.get("sinkCredential") if isinstance(payload.get("sinkCredential"), dict) else None

    if sink is not None and (not isinstance(sink, str) or not sink.startswith("https://")):
        return {
            "error": {
                "status": 400,
                "code": "INVALID_SINK",
                "message": "sink not valid for the specified protocol",
            }
        }

    sink_credential_error = _validate_sink_credential(sink_credential)
    if sink_credential_error:
        return {"error": sink_credential_error}

    if not CAMARA_MOCK and CAMARA_QOS_BOOKING_BASE_URL:
        return _operator_call("POST", f"/qos-bookings/{booking_id}/devices/assign", payload)

    booking = _BOOKINGS.get(booking_id)
    if not booking:
        return {
            "_http_status": 201,
            "status": "FAILURE",
            "statusInfo": "BOOKING_INVALID",
            "mock": True,
        }

    device_error = _validate_devices(devices if isinstance(devices, list) else None)
    if device_error:
        return {"error": device_error}

    remaining = int(booking["remainingDevices"])
    requested = devices
    to_assign = requested[:remaining]

    assigned_keys = {_jsonable_device_key(d) for d in booking["assignedDevices"]}
    actually_assigned: list[dict[str, object]] = []
    for d in to_assign:
        key = _jsonable_device_key(d)
        if key not in assigned_keys:
            booking["assignedDevices"].append(d)
            assigned_keys.add(key)
            actually_assigned.append(d)

    booking["remainingDevices"] = max(0, int(booking["totalDevices"]) - len(booking["assignedDevices"]))

    if len(actually_assigned) == 0:
        status = "FAILURE"
        status_info = "DEVICE_UNKNOWN_ERROR"
    elif len(actually_assigned) < len(requested):
        status = "PARTIAL_SUCCESS"
        status_info = "QUOTA_EXCEEDED"
    else:
        status = "SUCCESSFUL"
        status_info = "ASSIGNMENT_COMPLETED"

    return {
        "_http_status": 201,
        "bookingDetails": _booking_details(booking),
        "devices": actually_assigned if actually_assigned else None,
        "status": status,
        "statusInfo": status_info,
        "mock": True,
    }


def get_assigned_devices(booking_id: str) -> dict[str, object]:
    if not CAMARA_MOCK and CAMARA_QOS_BOOKING_BASE_URL:
        return _operator_call("GET", f"/qos-bookings/{booking_id}/devices")

    booking = _BOOKINGS.get(booking_id)
    if not booking:
        return {
            "error": {
                "status": 404,
                "code": "NOT_FOUND",
                "message": "The specified resource is not found.",
            }
        }

    payload: dict[str, object] = {
        "_http_status": 200,
        "bookingDetails": _booking_details(booking),
        "status": "SUCCESSFUL",
        "statusInfo": "ASSIGNMENT_COMPLETED",
        "mock": True,
    }
    if booking["assignedDevices"]:
        payload["devices"] = booking["assignedDevices"]
    return payload


def release_devices(booking_id: str, payload: dict[str, object]) -> dict[str, object]:
    devices = payload.get("devices")
    if not CAMARA_MOCK and CAMARA_QOS_BOOKING_BASE_URL:
        return _operator_call("POST", f"/qos-bookings/{booking_id}/devices/release", payload)

    booking = _BOOKINGS.get(booking_id)
    if not booking:
        return {
            "_http_status": 200,
            "status": "FAILURE",
            "statusInfo": "BOOKING_INVALID",
            "mock": True,
        }

    device_error = _validate_devices(devices if isinstance(devices, list) else None)
    if device_error:
        return {"error": device_error}

    assigned = booking["assignedDevices"]
    requested_keys = {_jsonable_device_key(d) for d in devices}
    released: list[dict[str, object]] = []
    kept: list[dict[str, object]] = []
    for d in assigned:
        key = _jsonable_device_key(d)
        if key in requested_keys:
            released.append(d)
        else:
            kept.append(d)

    booking["assignedDevices"] = kept
    booking["remainingDevices"] = max(0, int(booking["totalDevices"]) - len(kept))

    if len(released) == 0:
        status = "FAILURE"
        status_info = "DEVICE_NOT_FOUND"
    elif len(released) < len(devices):
        status = "PARTIAL_SUCCESS"
        status_info = "RELEASE_PENDING"
    else:
        status = "SUCCESSFUL"
        status_info = "ASSIGNMENT_COMPLETED"

    response: dict[str, object] = {
        "_http_status": 200,
        "bookingDetails": _booking_details(booking),
        "status": status,
        "statusInfo": status_info,
        "mock": True,
    }
    if released:
        response["devices"] = released
    return response


def retrieve_bookings_by_device(payload: dict[str, object]) -> dict[str, object]:
    device = payload.get("device")
    if not CAMARA_MOCK and CAMARA_QOS_BOOKING_BASE_URL:
        return _operator_call("POST", "/qos-bookings/retrieve", payload)

    device_error = _validate_device(device if isinstance(device, dict) else None)
    if device_error:
        return {"error": device_error}

    target_key = _jsonable_device_key(device)
    items: list[dict[str, object]] = []
    for booking in _BOOKINGS.values():
        assigned_keys = {_jsonable_device_key(d) for d in booking["assignedDevices"]}
        if target_key in assigned_keys:
            items.append(_booking_details(booking))

    return {
        "_http_status": 200,
        "items": items,
        "mock": True,
    }
