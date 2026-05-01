"""Quality on Demand (QoD) CAMARA adapter.

Spec: https://camaraproject.org/quality-on-demand/
Profiles: QOS_E (emergency), QOS_S (standard), QOS_M (medium), QOS_L (low).
"""

import uuid

from app.camara.config import CAMARA_MOCK, get_nac_client, nac_device


def request_priority(phone_number: str, profile: str = "QOS_E") -> dict[str, object]:
    """Request a QoD priority session for a device.

    Args:
        phone_number: Device phone number (E.164 format).
        profile: QoS profile identifier. QOS_E is highest priority.

    Returns:
        Session object with status and session_id.
    """
    if CAMARA_MOCK:
        return {
            "session_id": str(uuid.uuid4()),
            "status": "REQUESTED",
            "profile": profile,
            "phone_number": phone_number,
            "mock": True,
        }

    try:
        session = nac_device(phone_number).create_qod_session(
            profile=profile,
            duration=3600,
            service_ipv4="8.8.8.8",
        )
        return {
            "session_id": session.id,
            "status": session.status or "REQUESTED",
            "profile": profile,
            "phone_number": phone_number,
        }
    except Exception as exc:
        return {
            "session_id": str(uuid.uuid4()),
            "status": "REQUESTED",
            "profile": profile,
            "phone_number": phone_number,
            "mock": True,
            "live_error": str(exc),
        }


def release_session(session_id: str) -> dict[str, object]:
    """Release an active QoD priority session.

    Args:
        session_id: Session ID returned from request_priority.

    Returns:
        Confirmation of session release.
    """
    if CAMARA_MOCK:
        return {"session_id": session_id, "status": "RELEASED", "mock": True}

    try:
        session = get_nac_client().sessions.get(session_id)
        session.delete()
        return {"session_id": session_id, "status": "RELEASED"}
    except Exception as exc:
        return {
            "session_id": session_id,
            "status": "RELEASED",
            "mock": True,
            "live_error": str(exc),
        }
