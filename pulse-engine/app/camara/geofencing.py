"""Geofencing Subscriptions CAMARA adapter.

Spec: https://camaraproject.org/DeviceLocation/  (geofencing-subscriptions vwip)

Managed via the Nokia NaC SDK `client.geofencing` namespace:
  - subscribe()   → POST   /geofencing-subscriptions/vwip/subscriptions
  - get()         → GET    /geofencing-subscriptions/vwip/subscriptions/{id}
  - get_all()     → GET    /geofencing-subscriptions/vwip/subscriptions
  - sub.delete()  → DELETE /geofencing-subscriptions/vwip/subscriptions/{id}

Event types:
  org.camaraproject.geofencing-subscriptions.v0.area-entered
  org.camaraproject.geofencing-subscriptions.v0.area-left
"""

import uuid
from datetime import datetime, timezone

from app.camara.config import CAMARA_MOCK, get_nac_client, nac_device

_AREA_ENTERED = "org.camaraproject.geofencing-subscriptions.v0.area-entered"
_AREA_LEFT = "org.camaraproject.geofencing-subscriptions.v0.area-left"

_VALID_TYPES = {_AREA_ENTERED, _AREA_LEFT}


def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _sub_to_dict(sub) -> dict[str, object]:
    """Map a NaC GeofencingSubscription model to a CAMARA-spec-aligned dict."""
    area: dict[str, object] = {"areaType": "CIRCLE"}
    if sub.area:
        area["center"] = {
            "latitude": sub.area.center.latitude,
            "longitude": sub.area.center.longitude,
        }
        area["radius"] = sub.area.radius

    result: dict[str, object] = {
        "id": sub.event_subscription_id,
        "protocol": sub.protocol or "HTTP",
        "sink": sub.sink,
        "types": sub.types,
        "config": {
            "subscriptionDetail": {"area": area},
        },
        "startsAt": sub.starts_at.isoformat() if sub.starts_at else _now_iso(),
        "status": "ACTIVE",
    }
    return result


def create_subscription(
    phone_number: str,
    sink: str,
    event_types: list[str],
    center_latitude: float,
    center_longitude: float,
    radius: float,
    subscription_expire_time: str | None = None,
    subscription_max_events: int | None = None,
    initial_event: bool | None = None,
) -> dict[str, object]:
    """Create a geofencing subscription via CAMARA / Nokia NaC SDK.

    Args:
        phone_number: Device phone number (E.164).
        sink: HTTPS callback URL for CloudEvent notifications.
        event_types: List with one of ``area-entered`` or ``area-left`` event type URNs.
        center_latitude: Circle center latitude.
        center_longitude: Circle center longitude.
        radius: Circle radius in meters (minimum 1).
        subscription_expire_time: Optional ISO-8601 expiry datetime string.
        subscription_max_events: Optional cap on how many events to deliver.
        initial_event: If True, trigger immediately if device is already inside/outside.

    Returns:
        CAMARA Subscription object (id, protocol, sink, types, config, startsAt).
    """
    invalid = [t for t in event_types if t not in _VALID_TYPES]
    if invalid:
        return {
            "error": "INVALID_ARGUMENT",
            "message": f"Unsupported event types: {invalid}. Use one of {sorted(_VALID_TYPES)}",
        }

    if CAMARA_MOCK:
        sub_id = str(uuid.uuid4())
        return {
            "id": sub_id,
            "protocol": "HTTP",
            "sink": sink,
            "types": event_types,
            "config": {
                "subscriptionDetail": {
                    "device": {"phoneNumber": phone_number},
                    "area": {
                        "areaType": "CIRCLE",
                        "center": {"latitude": center_latitude, "longitude": center_longitude},
                        "radius": radius,
                    },
                },
                "subscriptionMaxEvents": subscription_max_events,
                "initialEvent": initial_event,
                "subscriptionExpireTime": subscription_expire_time,
            },
            "startsAt": _now_iso(),
            "status": "ACTIVE",
            "mock": True,
        }

    try:
        from network_as_code.models.geofencing import Circle, Center, EventType  # noqa: PLC0415

        device = nac_device(phone_number)
        area = Circle(
            area_type="CIRCLE",
            center=Center(latitude=center_latitude, longitude=center_longitude),
            radius=radius,
        )

        # Map CAMARA event type strings to NaC EventType enum values
        nac_types = []
        for t in event_types:
            if t == _AREA_ENTERED:
                nac_types.append(EventType.AREA_ENTERED)
            elif t == _AREA_LEFT:
                nac_types.append(EventType.AREA_LEFT)

        # Parse optional expire time
        expire_dt: datetime | None = None
        if subscription_expire_time:
            try:
                expire_dt = datetime.fromisoformat(subscription_expire_time.replace("Z", "+00:00"))
            except ValueError:
                pass

        sub = get_nac_client().geofencing.subscribe(
            device=device,
            sink=sink,
            types=nac_types,
            area=area,
            subscription_expire_time=expire_dt,
            subscription_max_events=subscription_max_events,
            initial_event=initial_event,
        )
        return _sub_to_dict(sub)

    except Exception as exc:
        err_str = str(exc)
        # Surface CAMARA-specific 422 error codes
        if "AREA_NOT_COVERED" in err_str:
            return {"error": "GEOFENCING_SUBSCRIPTIONS.AREA_NOT_COVERED", "message": err_str}
        if "INVALID_AREA" in err_str:
            return {"error": "GEOFENCING_SUBSCRIPTIONS.INVALID_AREA", "message": err_str}
        # Graceful mock fallback so the rest of the app stays usable
        sub_id = str(uuid.uuid4())
        return {
            "id": sub_id,
            "protocol": "HTTP",
            "sink": sink,
            "types": event_types,
            "config": {
                "subscriptionDetail": {
                    "device": {"phoneNumber": phone_number},
                    "area": {
                        "areaType": "CIRCLE",
                        "center": {"latitude": center_latitude, "longitude": center_longitude},
                        "radius": radius,
                    },
                },
            },
            "startsAt": _now_iso(),
            "status": "ACTIVE",
            "mock": True,
            "live_error": err_str,
        }


def get_subscription(subscription_id: str) -> dict[str, object]:
    """Retrieve a geofencing subscription by ID.

    Args:
        subscription_id: Subscription ID returned by create_subscription.

    Returns:
        CAMARA Subscription object or an error dict.
    """
    if CAMARA_MOCK:
        return {
            "id": subscription_id,
            "status": "ACTIVE",
            "mock": True,
        }

    try:
        sub = get_nac_client().geofencing.get(subscription_id)
        return _sub_to_dict(sub)
    except Exception as exc:
        err_str = str(exc)
        if "404" in err_str or "not found" in err_str.lower():
            return {"error": "NOT_FOUND", "message": f"Subscription {subscription_id} not found."}
        return {"error": "UNKNOWN", "message": err_str}


def list_subscriptions() -> list[dict[str, object]]:
    """Retrieve all active geofencing subscriptions.

    Returns:
        List of CAMARA Subscription objects.
    """
    if CAMARA_MOCK:
        return []

    try:
        subs = get_nac_client().geofencing.get_all()
        return [_sub_to_dict(s) for s in subs]
    except Exception as exc:
        return [{"error": "UNKNOWN", "message": str(exc), "mock": True}]


def delete_subscription(subscription_id: str) -> dict[str, object]:
    """Delete a geofencing subscription.

    Returns an empty dict on success (caller maps to HTTP 204).
    Returns an error dict if the subscription is not found.

    Args:
        subscription_id: Subscription ID to delete.
    """
    if CAMARA_MOCK:
        return {}

    try:
        sub = get_nac_client().geofencing.get(subscription_id)
        sub.delete()
        return {}
    except Exception as exc:
        err_str = str(exc)
        if "404" in err_str or "not found" in err_str.lower():
            return {"error": "NOT_FOUND", "message": f"Subscription {subscription_id} not found."}
        return {"error": "UNKNOWN", "message": err_str}
