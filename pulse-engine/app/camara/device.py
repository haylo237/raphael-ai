"""Device Reachability, Status, and Identifier CAMARA adapters.

Spec: https://camaraproject.org/device-reachability-status/
      https://camaraproject.org/device-status/
    https://camaraproject.org/device-identifier/
"""

import uuid

from app.camara.config import CAMARA_MOCK, nac_device
from app.camara.http_client import nac_post


def get_reachability(phone_number: str) -> dict[str, object]:
    """Check whether a device is reachable on the network.

    Args:
        phone_number: Device phone number (E.164 format).

    Returns:
        Reachability status and connectivity type.
    """
    if CAMARA_MOCK:
        return {
            "phone_number": phone_number,
            "reachable": True,
            "connectivity": ["DATA"],
            "mock": True,
        }

    try:
        status = nac_device(phone_number).get_reachability()
        return {
            "phone_number": phone_number,
            "reachable": status.reachable,
            "connectivity": status.connectivity or [],
        }
    except Exception as exc:
        return {
            "phone_number": phone_number,
            "reachable": True,
            "connectivity": ["DATA"],
            "mock": True,
            "live_error": str(exc),
        }


def get_status(phone_number: str) -> dict[str, object]:
    """Retrieve roaming and country status of a device.

    Args:
        phone_number: Device phone number (E.164 format).

    Returns:
        Device roaming and country information.
    """
    if CAMARA_MOCK:
        return {
            "phone_number": phone_number,
            "roaming": False,
            "country_code": None,
            "country_name": None,
            "mock": True,
        }

    try:
        status = nac_device(phone_number).get_roaming()
        return {
            "phone_number": phone_number,
            "roaming": status.roaming,
            "country_code": status.country_code,
            "country_name": status.country_name,
        }
    except Exception as exc:
        return {
            "phone_number": phone_number,
            "roaming": False,
            "country_code": None,
            "country_name": None,
            "mock": True,
            "live_error": str(exc),
        }


def get_roaming_status(phone_number: str) -> dict[str, object]:
    """Retrieve roaming status for fraud/compliance and territory logic."""
    return get_status(phone_number)


def get_identifier(phone_number: str) -> dict[str, object]:
    """Return physical device identifiers for a subscriber.

    Args:
        phone_number: Device phone number (E.164 format).

    Returns:
        Device identifier metadata (IMEI family and model information).
    """
    if CAMARA_MOCK:
        return {
            "phone_number": phone_number,
            "imei": "352099001761481",
            "imei_sv": "3520990017614813",
            "tac": "35209900",
            "manufacturer": "MockTech",
            "model": "HealthLink X1",
            "mock": True,
        }

    try:
        data = nac_post(
            "camara/device-identifier/v0/retrieve",
            {"device": {"phoneNumber": phone_number}},
        )
        return {
            "phone_number": phone_number,
            "imei": data.get("imei"),
            "imei_sv": data.get("imeiSv"),
            "tac": data.get("tac"),
            "manufacturer": data.get("manufacturer"),
            "model": data.get("model"),
        }
    except Exception as exc:
        return {
            "phone_number": phone_number,
            "imei": "352099001761481",
            "imei_sv": "3520990017614813",
            "tac": "35209900",
            "manufacturer": "MockTech",
            "model": "HealthLink X1",
            "mock": True,
            "live_error": str(exc),
        }


def subscribe_reachability(phone_number: str, callback_url: str) -> dict[str, object]:
    """Subscribe to reachability status changes for SMS/data connectivity.

    Args:
        phone_number: Device phone number (E.164 format).
        callback_url: Webhook endpoint for notifications.

    Returns:
        Subscription reference.
    """
    if CAMARA_MOCK:
        return {
            "subscription_id": str(uuid.uuid4()),
            "phone_number": phone_number,
            "callback_url": callback_url,
            "status": "ACTIVE",
            "mock": True,
        }

    try:
        data = nac_post(
            "camara/device-reachability-status-subscriptions/v0/subscriptions",
            {
                "sink": callback_url,
                "protocol": "HTTP",
                "types": ["org.camaraproject.device-reachability-status-subscriptions.v0.reachability-data"],
                "config": {
                    "subscriptionDetail": {
                        "device": {"phoneNumber": phone_number},
                    },
                    "subscriptionMaxEvents": 5,
                    "initialEvent": True,
                },
            },
        )
        return {
            "subscription_id": data.get("id") or data.get("subscriptionId"),
            "phone_number": phone_number,
            "callback_url": callback_url,
            "status": data.get("status", "ACTIVE"),
        }
    except Exception as exc:
        return {
            "subscription_id": str(uuid.uuid4()),
            "phone_number": phone_number,
            "callback_url": callback_url,
            "status": "ACTIVE",
            "mock": True,
            "live_error": str(exc),
        }
