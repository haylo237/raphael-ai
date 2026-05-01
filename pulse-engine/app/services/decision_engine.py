"""Core decision logic for Raphael Pulse."""

from typing import Any


def choose_communication_mode(urgency: str, network_quality: str, reachable: bool) -> str:
    """Pick a communication channel based on urgency and network conditions."""
    if not reachable:
        return "sms-fallback"

    if urgency == "emergency":
        if network_quality == "good":
            return "video"
        if network_quality == "fair":
            return "audio"
        return "chat"

    if network_quality == "good":
        return "video"
    if network_quality in {"fair", "poor"}:
        return "chat"
    return "async-message"


def should_request_qod(urgency: str, network_quality: str) -> bool:
    """Enable QoD primarily for emergency and degraded links."""
    return urgency == "emergency" or network_quality in {"poor", "offline"}


def emergency_actions(payload: dict[str, Any]) -> list[str]:
    """Build emergency action plan for critical scenarios."""
    actions = [
        "retrieve-patient-location",
        "route-to-nearest-facility",
        "trigger-emergency-alert",
    ]

    if payload.get("network_quality") in {"poor", "offline"}:
        actions.append("request-network-priority")

    if not payload.get("device_reachable", True):
        actions.append("notify-community-health-worker")

    return actions
