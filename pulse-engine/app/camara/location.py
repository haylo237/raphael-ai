"""Location Retrieval and Verification CAMARA adapters.

Spec: https://camaraproject.org/location-retrieval/  (vwip)
      https://camaraproject.org/location-verification/
"""

import math
from datetime import datetime, timezone

from app.camara.config import CAMARA_MOCK, nac_device

_MOCK_LOCATIONS: dict[str, dict[str, object]] = {
    "Lagos":    {"latitude": 6.5244,   "longitude": 3.3792,   "accuracy_meters": 50},
    "Kampala":  {"latitude": 0.3476,   "longitude": 32.5825,  "accuracy_meters": 80},
    "Nairobi":  {"latitude": -1.2921,  "longitude": 36.8219,  "accuracy_meters": 60},
    "Accra":    {"latitude": 5.6037,   "longitude": -0.1870,  "accuracy_meters": 70},
    "Dakar":    {"latitude": 14.7167,  "longitude": -17.4677, "accuracy_meters": 90},
    "Kinshasa": {"latitude": -4.3217,  "longitude": 15.3222,  "accuracy_meters": 100},
}

_DEFAULT_LOCATION: dict[str, object] = {"latitude": 0.0, "longitude": 0.0, "accuracy_meters": 999}


def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _circle_area(latitude: float, longitude: float, radius: float) -> dict[str, object]:
    """Build a CAMARA Circle area object."""
    return {
        "areaType": "CIRCLE",
        "center": {"latitude": latitude, "longitude": longitude},
        "radius": radius,
    }


def _surface_ok(radius: float, max_surface: int | None) -> bool:
    """Check whether the circle's surface is within the requested max."""
    if max_surface is None:
        return True
    surface = math.pi * radius ** 2
    return surface <= max_surface


def get_location(
    phone_number: str,
    hint: str = "unknown",
    max_age: int | None = None,
    max_surface: int | None = None,
) -> dict[str, object]:
    """Retrieve the current location of a device.

    Returns a CAMARA Location Retrieval-spec-compliant response:
    ``{lastLocationTime, area: {areaType, center, radius}}``.

    Args:
        phone_number: Device phone number (E.164 format).
        hint: City or region hint used for mock resolution.
        max_age: Maximum acceptable age of location data in seconds.
            None means any age is acceptable. 0 forces a fresh read.
        max_surface: Maximum acceptable area surface in square meters.
            None means any surface size is acceptable.

    Returns:
        CAMARA Location object (lastLocationTime + area).
    """
    if CAMARA_MOCK:
        coords = _MOCK_LOCATIONS.get(hint, _DEFAULT_LOCATION)
        lat = float(coords["latitude"])
        lon = float(coords["longitude"])
        radius = float(coords["accuracy_meters"])
        return {
            "lastLocationTime": _now_iso(),
            "area": _circle_area(lat, lon, radius),
            "mock": True,
        }

    effective_max_age = max_age if max_age is not None else 60
    try:
        loc = nac_device(phone_number).location(max_age=effective_max_age)
        radius = float(loc.radius or 999)

        if not _surface_ok(radius, max_surface):
            return {
                "error": "LOCATION_RETRIEVAL.UNABLE_TO_FULFILL_MAX_SURFACE",
                "message": "Unable to provide accurate acceptable surface for location",
                "area": _circle_area(loc.latitude, loc.longitude, radius),
            }

        return {
            "lastLocationTime": _now_iso(),
            "area": _circle_area(loc.latitude, loc.longitude, radius),
        }
    except Exception as exc:
        coords = _MOCK_LOCATIONS.get(hint, _DEFAULT_LOCATION)
        lat = float(coords["latitude"])
        lon = float(coords["longitude"])
        radius = float(coords["accuracy_meters"])
        return {
            "lastLocationTime": _now_iso(),
            "area": _circle_area(lat, lon, radius),
            "mock": True,
            "live_error": str(exc),
        }


def verify_location(
    phone_number: str,
    center_latitude: float,
    center_longitude: float,
    radius_meters: float,
    max_age_seconds: int = 120,
) -> dict[str, object]:
    """Verify whether a device is within a target circular area.

    Args:
        phone_number: Device phone number (E.164 format).
        center_latitude: Circle center latitude.
        center_longitude: Circle center longitude.
        radius_meters: Circle radius in meters.
        max_age_seconds: Maximum acceptable age of location sample.

    Returns:
        Verification result with resolved geometry.
    """
    if CAMARA_MOCK:
        # A deterministic mock: smaller radii are treated as stricter checks.
        inside = radius_meters >= 75
        return {
            "phone_number": phone_number,
            "inside_area": inside,
            "requested_area": {
                "shape": "CIRCLE",
                "center": {
                    "latitude": center_latitude,
                    "longitude": center_longitude,
                },
                "radius_meters": radius_meters,
            },
            "max_age_seconds": max_age_seconds,
            "mock": True,
        }

    try:
        result = nac_device(phone_number).verify_location(
            longitude=center_longitude,
            latitude=center_latitude,
            radius=radius_meters,
            max_age=max_age_seconds,
        )
        inside = result.result_type == "TRUE"
        return {
            "phone_number": phone_number,
            "inside_area": inside,
            "requested_area": {
                "shape": "CIRCLE",
                "center": {"latitude": center_latitude, "longitude": center_longitude},
                "radius_meters": radius_meters,
            },
            "max_age_seconds": max_age_seconds,
        }
    except Exception as exc:
        inside = radius_meters >= 75
        return {
            "phone_number": phone_number,
            "inside_area": inside,
            "requested_area": {
                "shape": "CIRCLE",
                "center": {
                    "latitude": center_latitude,
                    "longitude": center_longitude,
                },
                "radius_meters": radius_meters,
            },
            "max_age_seconds": max_age_seconds,
            "mock": True,
            "live_error": str(exc),
        }


def check_geofence(phone_number: str, area: dict[str, object]) -> dict[str, object]:
    """Backward-compatible alias for older geofence checks.

    Args:
        phone_number: Device phone number (E.164 format).
        area: Area payload with optional center/radius.

    Returns:
        Same structure as verify_location.
    """
    center = area.get("center", {}) if isinstance(area, dict) else {}
    return verify_location(
        phone_number=phone_number,
        center_latitude=float(center.get("latitude", 0.0)),
        center_longitude=float(center.get("longitude", 0.0)),
        radius_meters=float(area.get("radius_meters", 100.0)) if isinstance(area, dict) else 100.0,
        max_age_seconds=int(area.get("max_age_seconds", 120)) if isinstance(area, dict) else 120,
    )
