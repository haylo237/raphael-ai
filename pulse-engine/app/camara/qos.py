"""QoS Profiles and QoS Provisioning CAMARA adapters.

Spec: https://camaraproject.org/quality-of-service-profiles/
      https://camaraproject.org/quality-of-service-provisioning/
"""

import uuid

from app.camara.config import CAMARA_MOCK
from app.camara.http_client import nac_delete, nac_get, nac_post

_MOCK_PROFILES: list[dict[str, object]] = [
    {
        "name": "QOS_E",
        "latency_ms": 40,
        "throughput_mbps": 10,
        "priority": "HIGH",
        "description": "Emergency interactions",
    },
    {
        "name": "QOS_S",
        "latency_ms": 80,
        "throughput_mbps": 5,
        "priority": "MEDIUM",
        "description": "Standard consultations",
    },
    {
        "name": "QOS_L",
        "latency_ms": 150,
        "throughput_mbps": 2,
        "priority": "LOW",
        "description": "Background sync",
    },
]


def list_profiles() -> dict[str, object]:
    """List available QoS profiles with target network characteristics."""
    if CAMARA_MOCK:
        return {"profiles": _MOCK_PROFILES, "mock": True}

    try:
        data = nac_get("camara/quality-of-service-profiles/v0/profiles")
        return {"profiles": data.get("qosProfiles", [])}
    except Exception as exc:
        return {"profiles": _MOCK_PROFILES, "mock": True, "live_error": str(exc)}


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
