"""Connectivity and reachability subscription CAMARA adapters.

Spec: https://camaraproject.org/connected-network-type-subscriptions/
      https://camaraproject.org/device-reachability-status-subscriptions/
"""

import uuid

from app.camara.config import CAMARA_MOCK
from app.camara.http_client import nac_delete, nac_post


def subscribe_network_type(phone_number: str, callback_url: str) -> dict[str, object]:
    """Subscribe to connected network type changes (2G/3G/4G/5G/UNKNOWN)."""
    if CAMARA_MOCK:
        return {
            "subscription_id": str(uuid.uuid4()),
            "phone_number": phone_number,
            "callback_url": callback_url,
            "event": "CONNECTED_NETWORK_TYPE_CHANGED",
            "status": "ACTIVE",
            "mock": True,
        }

    try:
        data = nac_post(
            "camara/connected-network-type-subscriptions/v0/subscriptions",
            {
                "device": {"phoneNumber": phone_number},
                "sink": callback_url,
                "types": ["org.camaraproject.connected-network-type-subscriptions.v0.network-type-changed"],
            },
        )
        return {
            "subscription_id": data.get("subscriptionId"),
            "phone_number": phone_number,
            "callback_url": callback_url,
            "event": "CONNECTED_NETWORK_TYPE_CHANGED",
            "status": data.get("status", "ACTIVE"),
        }
    except Exception as exc:
        return {
            "subscription_id": str(uuid.uuid4()),
            "phone_number": phone_number,
            "callback_url": callback_url,
            "event": "CONNECTED_NETWORK_TYPE_CHANGED",
            "status": "ACTIVE",
            "mock": True,
            "live_error": str(exc),
        }


def unsubscribe_network_type(subscription_id: str) -> dict[str, object]:
    """Delete a network type subscription."""
    if CAMARA_MOCK:
        return {"subscription_id": subscription_id, "status": "DELETED", "mock": True}

    try:
        nac_delete(f"camara/connected-network-type-subscriptions/v0/subscriptions/{subscription_id}")
        return {"subscription_id": subscription_id, "status": "DELETED"}
    except Exception as exc:
        return {
            "subscription_id": subscription_id,
            "status": "DELETED",
            "mock": True,
            "live_error": str(exc),
        }


def subscribe_reachability(phone_number: str, callback_url: str) -> dict[str, object]:
    """Subscribe to SMS/data reachability status changes."""
    if CAMARA_MOCK:
        return {
            "subscription_id": str(uuid.uuid4()),
            "phone_number": phone_number,
            "callback_url": callback_url,
            "event": "DEVICE_REACHABILITY_CHANGED",
            "status": "ACTIVE",
            "mock": True,
        }

    try:
        data = nac_post(
            "camara/device-reachability-status-subscriptions/v0/subscriptions",
            {
                "device": {"phoneNumber": phone_number},
                "sink": callback_url,
                "types": ["org.camaraproject.device-reachability-status.v0.reachability-data"],
            },
        )
        return {
            "subscription_id": data.get("subscriptionId"),
            "phone_number": phone_number,
            "callback_url": callback_url,
            "event": "DEVICE_REACHABILITY_CHANGED",
            "status": data.get("status", "ACTIVE"),
        }
    except Exception as exc:
        return {
            "subscription_id": str(uuid.uuid4()),
            "phone_number": phone_number,
            "callback_url": callback_url,
            "event": "DEVICE_REACHABILITY_CHANGED",
            "status": "ACTIVE",
            "mock": True,
            "live_error": str(exc),
        }


def unsubscribe_reachability(subscription_id: str) -> dict[str, object]:
    """Delete a reachability status subscription."""
    if CAMARA_MOCK:
        return {"subscription_id": subscription_id, "status": "DELETED", "mock": True}

    try:
        nac_delete(f"camara/device-reachability-status-subscriptions/v0/subscriptions/{subscription_id}")
        return {"subscription_id": subscription_id, "status": "DELETED"}
    except Exception as exc:
        return {
            "subscription_id": subscription_id,
            "status": "DELETED",
            "mock": True,
            "live_error": str(exc),
        }
