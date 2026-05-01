"""Congestion Insights CAMARA adapter.

Spec: https://camaraproject.org/connectivity-insights/
"""

import datetime

from app.camara.config import CAMARA_MOCK, nac_device

_MOCK_CONGESTION: dict[str, dict[str, object]] = {
    "good":    {"level": "LOW",       "score": 0.12},
    "fair":    {"level": "MODERATE",  "score": 0.48},
    "poor":    {"level": "HIGH",      "score": 0.81},
    "offline": {"level": "CONGESTED", "score": 0.97},
}


def get_insights(location: str, network_quality_hint: str = "fair", phone_number: str | None = None) -> dict[str, object]:
    """Retrieve network congestion insights for a location or cell area.

    Args:
        location: City or area name (used as mock lookup key).
        network_quality_hint: Hint for mock response selection when live data is unavailable.
        phone_number: Device phone number (E.164 format). Required for live calls.

    Returns:
        Congestion level and numeric score (0.0 = clear, 1.0 = fully congested).
    """
    if CAMARA_MOCK:
        congestion = _MOCK_CONGESTION.get(network_quality_hint, _MOCK_CONGESTION["fair"])
        return {
            "location": location,
            "congestion_level": congestion["level"],
            "congestion_score": congestion["score"],
            "mock": True,
        }

    if not phone_number:
        congestion = _MOCK_CONGESTION.get(network_quality_hint, _MOCK_CONGESTION["fair"])
        return {
            "location": location,
            "congestion_level": congestion["level"],
            "congestion_score": congestion["score"],
            "mock": True,
            "live_error": "phone_number required for live congestion lookup",
        }

    try:
        now = datetime.datetime.now(datetime.timezone.utc)
        results = nac_device(phone_number).get_congestion(
            start=now - datetime.timedelta(minutes=30),
            end=now,
        )
        level = results[0].level if results else "UNKNOWN"
        _score_map = {"low": 0.12, "moderate": 0.48, "high": 0.81, "congested": 0.97}
        return {
            "location": location,
            "congestion_level": level.upper(),
            "congestion_score": _score_map.get(level.lower(), 0.5),
        }
    except Exception as exc:
        congestion = _MOCK_CONGESTION.get(network_quality_hint, _MOCK_CONGESTION["fair"])
        return {
            "location": location,
            "congestion_level": congestion["level"],
            "congestion_score": congestion["score"],
            "mock": True,
            "live_error": str(exc),
        }
