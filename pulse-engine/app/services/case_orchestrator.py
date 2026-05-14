"""Case orchestrator for the /decide endpoint.

Owns the end-to-end flow that used to live in `app.main.decide`:
    routes -> orchestrator service -> decision engine -> CAMARA adapters

The orchestrator is responsible for:
    * calling CAMARA adapters and assembling context blocks
    * invoking the pure decision engine
    * producing an event timeline for traceability
    * producing a human-readable decision explanation

It deliberately does not import FastAPI; routes pass plain dicts in and get
plain dicts out so the orchestrator stays easy to unit-test.
"""

from datetime import datetime, timezone
from typing import Any

from app.camara import congestion, device, identity, location, qod
from app.services.decision_engine import (
    choose_communication_mode,
    emergency_actions,
    nearest_hospital,
    should_request_qod,
)


def _now_iso() -> str:
    return datetime.now(tz=timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%fZ")


def _event(name: str, detail: dict[str, Any] | None = None) -> dict[str, Any]:
    """Build a single timeline event entry."""
    entry: dict[str, Any] = {"event": name, "timestamp": _now_iso()}
    if detail:
        entry["detail"] = detail
    return entry


def handle_case(case: dict[str, Any]) -> dict[str, Any]:
    """Run the full /decide pipeline for a single case payload.

    Args:
        case: Validated case payload as a dict (from `CaseInput.model_dump()`).

    Returns:
        Decision response dict including timeline and explanation.
    """
    timeline: list[dict[str, Any]] = []
    explanation: list[str] = []

    patient_id = str(case.get("patient_id", ""))
    case_location = str(case.get("location", "unknown"))
    urgency_level = str(case.get("urgency", "")).strip().upper()
    network_level = str(case.get("network_quality", "")).strip().upper()
    case_reachable = bool(case.get("device_reachable", True))

    phone_ref = patient_id  # device identifier in CAMARA calls

    timeline.append(_event("CASE_CREATED", {
        "patient_id": patient_id,
        "urgency": urgency_level,
        "network_quality": network_level,
        "location": case_location,
    }))

    # --- CAMARA: Device reachability ---
    reachability = device.get_reachability(phone_ref)
    roaming_status = device.get_roaming_status(phone_ref)
    api_reachable = bool(reachability.get("reachable", case_reachable))
    effective_reachable: bool = api_reachable and case_reachable
    timeline.append(_event("REACHABILITY_CHECKED", {
        "reachable": effective_reachable,
        "api_reachable": api_reachable,
    }))

    # --- CAMARA: Number ownership / SIM trust ---
    number_verification = identity.verify_number(phone_ref)
    sim_swap_status = identity.check_sim_swap(phone_ref)
    timeline.append(_event("IDENTITY_VERIFIED", {
        "verified": bool(number_verification.get("verified", False)),
        "sim_swapped": bool(sim_swap_status.get("swapped", False)),
    }))

    # --- CAMARA: Congestion insights ---
    congestion_data = congestion.get_insights(
        case_location, network_level, phone_number=phone_ref,
    )
    timeline.append(_event("CONGESTION_RETRIEVED", {
        "congestion_level": congestion_data.get("congestion_level"),
    }))

    communication_mode = choose_communication_mode(
        urgency=urgency_level,
        network_quality=network_level,
        reachable=effective_reachable,
    )

    is_emergency = urgency_level == "EMERGENCY"
    needs_qod = should_request_qod(urgency_level, network_level)

    # --- Build human-readable explanation ---
    if is_emergency:
        explanation.append("Emergency urgency detected")
    elif urgency_level == "HIGH":
        explanation.append("High urgency case")
    elif urgency_level == "LOW":
        explanation.append("Low urgency case")
    else:
        explanation.append("Routine urgency case")

    explanation.append(
        "Patient reachable" if effective_reachable else "Patient unreachable"
    )

    if network_level in {"GOOD"}:
        explanation.append("Good network detected")
    elif network_level in {"MODERATE", "FAIR", "AVERAGE"}:
        explanation.append("Moderate network detected")
    elif network_level in {"POOR", "OFFLINE", "BAD", "WEAK"}:
        explanation.append("Poor network detected")

    explanation.append(f"Communication mode selected: {communication_mode}")

    if needs_qod:
        explanation.append("QoD priority session requested")

    if sim_swap_status.get("swapped"):
        explanation.append("Recent SIM swap detected — proceed with caution")
    if not number_verification.get("verified", True):
        explanation.append("Number ownership could not be verified")

    decision_actions: list[str] = []
    if is_emergency:
        decision_priority = "HIGH"
        decision_actions = emergency_actions({
            **case,
            "device_reachable": effective_reachable,
        })
        timeline.append(_event("EMERGENCY_DETECTED"))
    else:
        decision_priority = "NORMAL"
        if not effective_reachable:
            decision_actions.append("Send fallback notification")
        decision_actions.append(f"Use {communication_mode} communication")

    timeline.append(_event("DECISION_COMPUTED", {
        "mode": communication_mode,
        "priority": decision_priority,
    }))

    response: dict[str, Any] = {
        "patient_id": patient_id,
        "is_emergency": is_emergency,
        "communication_mode": communication_mode,
        "decision": {
            "mode": communication_mode,
            "priority": decision_priority,
            "actions": decision_actions,
        },
        "request_qod": needs_qod,
        "input_summary": {
            "urgency": urgency_level,
            "network": network_level,
            "reachable": effective_reachable,
            "location": case_location,
        },
        "network_context": {
            "quality": network_level,
            "device_reachable": effective_reachable,
            "reachability_detail": reachability,
            "roaming": roaming_status,
            "congestion": congestion_data,
        },
        "identity_context": {
            "number_verification": number_verification,
            "sim_swap": sim_swap_status,
        },
    }

    # --- CAMARA: QoD priority session (if warranted) ---
    if needs_qod:
        response["qod_session"] = qod.request_priority(phone_ref, profile="QOS_E")
        timeline.append(_event("QOD_REQUESTED", {
            "profile": "QOS_E",
            "session_id": response["qod_session"].get("sessionId"),
        }))

    # --- CAMARA: Location + emergency actions ---
    if is_emergency:
        location_data = location.get_location(phone_ref, hint=case_location)
        response["patient_location"] = location_data
        timeline.append(_event("LOCATION_RETRIEVED", {
            "last_location_time": location_data.get("lastLocationTime"),
        }))

        hospital = nearest_hospital(case_location)
        response["assigned_hospital"] = hospital
        timeline.append(_event("HOSPITAL_ASSIGNED", {"hospital": hospital}))

        response["emergency_actions"] = decision_actions

    response["explanation"] = explanation
    response["timeline"] = timeline
    return response
