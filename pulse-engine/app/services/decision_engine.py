"""Core decision logic for Raphael Pulse."""

from typing import Any


_HOSPITAL_BY_LOCATION = {
    "lagos": "Lagos University Teaching Hospital",
    "kampala": "Mulago National Referral Hospital",
    "nairobi": "Kenyatta National Hospital",
    "accra": "Korle-Bu Teaching Hospital",
    "dakar": "Hopital Principal de Dakar",
    "kinshasa": "Hopital General de Reference de Kinshasa",
    "yaounde": "Hopital Central de Yaounde",
}


def _normalize_urgency(urgency: str) -> str:
    value = urgency.strip().upper()
    if value in {"EMERGENCY", "HIGH", "MEDIUM", "LOW"}:
        return value
    if value in {"CRITICAL", "SEVERE"}:
        return "EMERGENCY"
    if value in {"NORMAL", "DEFAULT"}:
        return "MEDIUM"
    return "LOW"


def _normalize_network_quality(network_quality: str) -> str:
    value = network_quality.strip().upper()
    if value in {"GOOD", "MODERATE", "POOR"}:
        return value
    if value in {"FAIR", "AVERAGE"}:
        return "MODERATE"
    if value in {"OFFLINE", "BAD", "WEAK"}:
        return "POOR"
    return "MODERATE"


def nearest_hospital(location_hint: str) -> str:
    """Resolve a nearest hospital name using a simple city-to-hospital mapping."""
    key = (location_hint or "").strip().lower()
    if key in _HOSPITAL_BY_LOCATION:
        return _HOSPITAL_BY_LOCATION[key]
    return "Nearest Available Emergency Hospital"


def choose_communication_mode(urgency: str, network_quality: str, reachable: bool) -> str:
    """Pick a communication mode from normalized urgency/network inputs."""
    urgency_level = _normalize_urgency(urgency)
    network = _normalize_network_quality(network_quality)

    if urgency_level == "EMERGENCY":
        return "PRIORITY"

    if urgency_level == "LOW":
        return "CHAT"

    if network == "GOOD":
        return "VIDEO"
    if network == "MODERATE":
        return "AUDIO"
    return "CHAT"


def should_request_qod(urgency: str, network_quality: str) -> bool:
    """Enable QoD for emergency traffic only."""
    del network_quality
    return _normalize_urgency(urgency) == "EMERGENCY"


def emergency_actions(payload: dict[str, Any]) -> list[str]:
    """Build emergency action plan for critical scenarios."""
    location_hint = str(payload.get("location", "unknown"))
    hospital = nearest_hospital(location_hint)
    reachable = bool(payload.get("device_reachable", True))

    actions = [
        "Retrieve location via CAMARA",
        f"Route to nearest hospital ({hospital})",
        "Request QoD (priority network)",
    ]

    if reachable:
        actions.append("Initiate emergency communication")
        actions.append("Emergency alert sent")
    else:
        actions.append("Trigger fallback alert (SMS/notification)")

    return actions
