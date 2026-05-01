"""Region Device Count CAMARA adapter.

Spec: https://camaraproject.org/region-device-count/
"""

from app.camara.config import CAMARA_MOCK
from app.camara.http_client import nac_post


def get_device_count(
    center_latitude: float,
    center_longitude: float,
    radius_meters: float,
    interval_start_iso: str,
    interval_end_iso: str,
    roaming: bool | None = None,
    device_type: str | None = None,
) -> dict[str, object]:
    """Return number of devices in an area and time interval.

    Args:
        center_latitude: Circle center latitude.
        center_longitude: Circle center longitude.
        radius_meters: Query radius in meters.
        interval_start_iso: ISO8601 start timestamp.
        interval_end_iso: ISO8601 end timestamp.
        roaming: Optional roaming filter.
        device_type: Optional device category filter.

    Returns:
        Device count for the region query.
    """
    if CAMARA_MOCK:
        base_count = max(8, int(radius_meters // 20))
        if roaming is True:
            base_count = max(1, base_count // 3)
        if device_type == "smartphone":
            base_count = int(base_count * 0.8)
        return {
            "query": {
                "center": {
                    "latitude": center_latitude,
                    "longitude": center_longitude,
                },
                "radius_meters": radius_meters,
                "interval_start": interval_start_iso,
                "interval_end": interval_end_iso,
                "roaming": roaming,
                "device_type": device_type,
            },
            "device_count": base_count,
            "mock": True,
        }

    body: dict = {
        "area": {
            "areaType": "CIRCLE",
            "center": {"latitude": center_latitude, "longitude": center_longitude},
            "radius": radius_meters,
        },
        "interval": {"start": interval_start_iso, "end": interval_end_iso},
    }
    if roaming is not None:
        body["roaming"] = roaming
    if device_type is not None:
        body["deviceType"] = device_type
    try:
        data = nac_post("camara/region-device-count/v0/retrieve", body)
        return {
            "query": {
                "center": {"latitude": center_latitude, "longitude": center_longitude},
                "radius_meters": radius_meters,
                "interval_start": interval_start_iso,
                "interval_end": interval_end_iso,
                "roaming": roaming,
                "device_type": device_type,
            },
            "device_count": data.get("deviceCount", 0),
        }
    except Exception as exc:
        base_count = max(8, int(radius_meters // 20))
        if roaming is True:
            base_count = max(1, base_count // 3)
        if device_type == "smartphone":
            base_count = int(base_count * 0.8)
        return {
            "query": {
                "center": {"latitude": center_latitude, "longitude": center_longitude},
                "radius_meters": radius_meters,
                "interval_start": interval_start_iso,
                "interval_end": interval_end_iso,
                "roaming": roaming,
                "device_type": device_type,
            },
            "device_count": base_count,
            "mock": True,
            "live_error": str(exc),
        }
