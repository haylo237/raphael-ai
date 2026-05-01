"""Region Device Count CAMARA adapter.

Spec: https://camaraproject.org/RegionDeviceCount/ (vwip)
"""

import math
import uuid
from datetime import datetime

import httpx

from app.camara.config import (
    CAMARA_MOCK,
    CAMARA_REGION_DEVICE_COUNT_BASE_URL,
    CAMARA_REGION_DEVICE_COUNT_CLIENT_ID,
    CAMARA_REGION_DEVICE_COUNT_CLIENT_SECRET,
)

_TIMEOUT = 10.0
_VALID_ROAMING = {"roaming", "non-roaming"}
_VALID_DEVICE_TYPES = {"human device", "IoT device", "other"}
_VALID_STATUSES = {
    "SUPPORTED_AREA",
    "PART_OF_AREA_NOT_SUPPORTED",
    "AREA_NOT_SUPPORTED",
    "DENSITY_BELOW_PRIVACY_THRESHOLD",
    "TIME_INTERVAL_NO_DATA_FOUND",
}


def _parse_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def _validate_area(area: dict[str, object]) -> dict[str, object] | None:
    area_type = area.get("areaType")
    if area_type == "CIRCLE":
        center = area.get("center")
        radius = area.get("radius")
        if not isinstance(center, dict) or radius is None:
            return {
                "status": 400,
                "code": "REGION_DEVICE_COUNT.INVALID_CIRCLE_AREA",
                "message": "Missing circle center or radius.",
            }
        lat = center.get("latitude")
        lon = center.get("longitude")
        if (
            not isinstance(lat, (int, float))
            or not isinstance(lon, (int, float))
            or not isinstance(radius, (int, float))
            or radius <= 0
            or lat < -90
            or lat > 90
            or lon < -180
            or lon > 180
        ):
            return {
                "status": 400,
                "code": "REGION_DEVICE_COUNT.INVALID_CIRCLE_AREA",
                "message": "Missing circle center or radius.",
            }
        return None

    if area_type == "POLYGON":
        boundary = area.get("boundary")
        if not isinstance(boundary, list) or len(boundary) < 3 or len(boundary) > 15:
            return {
                "status": 400,
                "code": "REGION_DEVICE_COUNT.INVALID_POLYGON_AREA",
                "message": "The area is not a polygon shape or has an arbitrary complexity.",
            }
        for point in boundary:
            if not isinstance(point, dict):
                return {
                    "status": 400,
                    "code": "REGION_DEVICE_COUNT.INVALID_POLYGON_AREA",
                    "message": "The area is not a polygon shape or has an arbitrary complexity.",
                }
            lat = point.get("latitude")
            lon = point.get("longitude")
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
                    "code": "REGION_DEVICE_COUNT.INVALID_POLYGON_AREA",
                    "message": "The area is not a polygon shape or has an arbitrary complexity.",
                }
        return None

    return {
        "status": 400,
        "code": "INVALID_ARGUMENT",
        "message": "area.areaType must be CIRCLE or POLYGON.",
    }


def _validate_filter(filter_data: dict[str, object] | None) -> dict[str, object] | None:
    if filter_data is None:
        return None

    roaming_values = filter_data.get("roamingStatus")
    device_values = filter_data.get("deviceType")
    if roaming_values is None and device_values is None:
        return {
            "status": 400,
            "code": "INVALID_ARGUMENT",
            "message": "filter must include at least one criterion: roamingStatus or deviceType.",
        }

    if roaming_values is not None:
        if not isinstance(roaming_values, list) or len(roaming_values) == 0:
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "filter.roamingStatus must be a non-empty array.",
            }
        if any(v not in _VALID_ROAMING for v in roaming_values):
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "filter.roamingStatus supports only 'roaming' and 'non-roaming'.",
            }

    if device_values is not None:
        if not isinstance(device_values, list) or len(device_values) == 0:
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "filter.deviceType must be a non-empty array.",
            }
        if any(v not in _VALID_DEVICE_TYPES for v in device_values):
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "filter.deviceType supports only 'human device', 'IoT device', and 'other'.",
            }

    return None


def _validate_request(body: dict[str, object]) -> dict[str, object] | None:
    area = body.get("area")
    if not isinstance(area, dict):
        return {
            "status": 400,
            "code": "INVALID_ARGUMENT",
            "message": "Missing area object.",
        }

    area_error = _validate_area(area)
    if area_error:
        return area_error

    starttime = body.get("starttime")
    endtime = body.get("endtime")
    if (starttime and not endtime) or (endtime and not starttime):
        return {
            "status": 400,
            "code": "REGION_DEVICE_COUNT.TIME_INVALID_ARGUMENT",
            "message": "starttime and endtime cannot be passed separately. Either both are passed or neither is passed.",
        }
    if starttime and endtime:
        try:
            start_dt = _parse_datetime(str(starttime))
            end_dt = _parse_datetime(str(endtime))
        except ValueError:
            return {
                "status": 400,
                "code": "REGION_DEVICE_COUNT.TIME_INVALID_ARGUMENT",
                "message": "starttime and endtime must be valid RFC3339 timestamps.",
            }
        if end_dt < start_dt:
            return {
                "status": 400,
                "code": "REGION_DEVICE_COUNT.INVALID_END_DATE",
                "message": "Indicated endTime is earlier than the startTime.",
            }

    filter_error = _validate_filter(body.get("filter") if isinstance(body.get("filter"), dict) else body.get("filter"))
    if filter_error:
        return filter_error

    sink_credential = body.get("sinkCredential")
    if isinstance(sink_credential, dict):
        credential_type = sink_credential.get("credentialType")
        if credential_type != "ACCESSTOKEN":
            return {
                "status": 400,
                "code": "INVALID_CREDENTIAL",
                "message": "Only Access token is supported",
            }
        token_type = sink_credential.get("accessTokenType")
        if token_type and str(token_type).lower() != "bearer":
            return {
                "status": 400,
                "code": "INVALID_TOKEN",
                "message": "Only bearer token is supported",
            }

    return None


def _mock_estimate_count(area: dict[str, object], filter_data: dict[str, object] | None) -> int:
    area_type = area.get("areaType")
    if area_type == "CIRCLE":
        radius = float(area.get("radius", 1))
        # Scale count by circle area with a stable divisor for deterministic behavior.
        estimated = max(0, int(math.pi * radius * radius / 20000))
    else:
        boundary = area.get("boundary", [])
        estimated = max(0, len(boundary) * 25)

    if isinstance(filter_data, dict):
        if "roamingStatus" in filter_data:
            if "roaming" in filter_data["roamingStatus"] and "non-roaming" not in filter_data["roamingStatus"]:
                estimated = max(0, int(estimated * 0.25))
            elif "non-roaming" in filter_data["roamingStatus"] and "roaming" not in filter_data["roamingStatus"]:
                estimated = max(0, int(estimated * 0.75))
        if "deviceType" in filter_data and isinstance(filter_data["deviceType"], list):
            ratio = min(1.0, max(0.2, len(filter_data["deviceType"]) / 3.0))
            estimated = max(0, int(estimated * ratio))

    return estimated


def _operator_token() -> str:
    if not CAMARA_REGION_DEVICE_COUNT_BASE_URL or not CAMARA_REGION_DEVICE_COUNT_CLIENT_ID:
        raise ValueError("CAMARA_REGION_DEVICE_COUNT_BASE_URL and CAMARA_REGION_DEVICE_COUNT_CLIENT_ID are required")

    token_url = f"{CAMARA_REGION_DEVICE_COUNT_BASE_URL.rstrip('/')}/oauth2/token"
    with httpx.Client(timeout=_TIMEOUT) as client:
        resp = client.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": CAMARA_REGION_DEVICE_COUNT_CLIENT_ID,
                "client_secret": CAMARA_REGION_DEVICE_COUNT_CLIENT_SECRET,
                "scope": "region-device-count:count",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    resp.raise_for_status()
    return resp.json()["access_token"]


def _operator_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {_operator_token()}",
        "Content-Type": "application/json",
        "x-correlator": str(uuid.uuid4()),
    }


def _operator_count_url() -> str:
    base = CAMARA_REGION_DEVICE_COUNT_BASE_URL.rstrip("/")
    return f"{base}/region-device-count/vwip/count"


def count_devices(body: dict[str, object]) -> dict[str, object]:
    """Count devices in a region for a time interval.

    Accepts and returns CAMARA Region Device Count (vwip) payloads.
    """
    validation_error = _validate_request(body)
    if validation_error:
        return {"error": validation_error}

    area = body["area"]
    filter_data = body.get("filter") if isinstance(body.get("filter"), dict) else None

    if CAMARA_MOCK or not CAMARA_REGION_DEVICE_COUNT_BASE_URL:
        mock_count = _mock_estimate_count(area, filter_data)
        status = "SUPPORTED_AREA" if mock_count > 0 else "TIME_INTERVAL_NO_DATA_FOUND"
        return {
            "count": mock_count,
            "status": status,
            "mock": True,
        }

    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            resp = client.post(_operator_count_url(), json=body, headers=_operator_headers())

        if resp.status_code in (200, 202):
            payload = resp.json() if resp.content else {}
            status = payload.get("status")
            count = payload.get("count")
            if status in _VALID_STATUSES and isinstance(count, (int, float)):
                return {"count": count, "status": status}
            if status in _VALID_STATUSES:
                return {"status": status}
            return payload

        try:
            err = resp.json()
            code = err.get("code", "INVALID_ARGUMENT")
            message = err.get("message", resp.text)
        except Exception:
            code = "INVALID_ARGUMENT"
            message = resp.text
        return {
            "error": {
                "status": resp.status_code,
                "code": code,
                "message": message,
            },
        }
    except Exception as exc:
        mock_count = _mock_estimate_count(area, filter_data)
        status = "SUPPORTED_AREA" if mock_count > 0 else "TIME_INTERVAL_NO_DATA_FOUND"
        return {
            "count": mock_count,
            "status": status,
            "mock": True,
            "live_error": str(exc),
        }
