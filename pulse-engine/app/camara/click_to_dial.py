"""Click to Dial CAMARA adapter.

Spec: https://github.com/camaraproject/ClickToDial (vwip)
"""

import base64
import re
import uuid
from datetime import UTC, datetime

import httpx

from app.camara.config import (
    CAMARA_CLICK_TO_DIAL_BASE_URL,
    CAMARA_CLICK_TO_DIAL_CLIENT_ID,
    CAMARA_CLICK_TO_DIAL_CLIENT_SECRET,
    CAMARA_MOCK,
)

_TIMEOUT = 10.0
_E164_PATTERN = re.compile(r"^\+[1-9]\d{1,14}$")

# Lightweight in-process mock state for call lifecycle operations.
_MOCK_CALLS: dict[str, dict[str, object]] = {}
_MOCK_RECORDINGS: dict[str, dict[str, object]] = {}


def _now_iso() -> str:
    return datetime.now(tz=UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def _validate_number(number: str) -> bool:
    return bool(_E164_PATTERN.match(number))


def _validate_sink_credential(sink_credential: dict[str, object] | None) -> dict[str, object] | None:
    if sink_credential is None:
        return None

    credential_type = sink_credential.get("credentialType")
    if credential_type != "ACCESSTOKEN":
        return {
            "status": 422,
            "code": "INVALID_ARGUMENT",
            "message": "sinkCredential.credentialType MUST be ACCESSTOKEN.",
        }

    access_token = sink_credential.get("accessToken")
    expires_utc = sink_credential.get("accessTokenExpiresUtc")
    access_token_type = sink_credential.get("accessTokenType")
    if not access_token or not expires_utc or not access_token_type:
        return {
            "status": 422,
            "code": "INVALID_ARGUMENT",
            "message": "sinkCredential accessToken, accessTokenExpiresUtc and accessTokenType are required.",
        }
    if str(access_token_type).lower() != "bearer":
        return {
            "status": 422,
            "code": "INVALID_ARGUMENT",
            "message": "sinkCredential.accessTokenType MUST be bearer.",
        }
    return None


def _operator_token() -> str:
    if not CAMARA_CLICK_TO_DIAL_BASE_URL or not CAMARA_CLICK_TO_DIAL_CLIENT_ID:
        raise ValueError("CAMARA_CLICK_TO_DIAL_BASE_URL and CAMARA_CLICK_TO_DIAL_CLIENT_ID are required")

    token_url = f"{CAMARA_CLICK_TO_DIAL_BASE_URL.rstrip('/')}/oauth2/token"
    with httpx.Client(timeout=_TIMEOUT) as client:
        response = client.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": CAMARA_CLICK_TO_DIAL_CLIENT_ID,
                "client_secret": CAMARA_CLICK_TO_DIAL_CLIENT_SECRET,
                "scope": "click-to-dial:calls:create click-to-dial:calls:read click-to-dial:calls:delete click-to-dial:recordings:read",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    response.raise_for_status()
    return response.json()["access_token"]


def _operator_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {_operator_token()}",
        "Content-Type": "application/json",
        "x-correlator": str(uuid.uuid4()),
    }


def _calls_url() -> str:
    return f"{CAMARA_CLICK_TO_DIAL_BASE_URL.rstrip('/')}/click-to-dial/vwip/calls"


def _call_url(call_id: str) -> str:
    return f"{_calls_url()}/{call_id}"


def _recording_url(call_id: str) -> str:
    return f"{_call_url(call_id)}/recording"


def _create_mock_call(caller_number: str, callee_number: str, recording_enabled: bool) -> dict[str, object]:
    for call in _MOCK_CALLS.values():
        if call["status"] in ("initiating", "callingCaller", "callingCallee", "connected") and call["caller"]["number"] == caller_number and call["callee"]["number"] == callee_number:
            return {
                "error": {
                    "status": 409,
                    "code": "CALL_ALREADY_ACTIVE",
                    "message": "An active call already exists for the given caller and callee.",
                }
            }

    call_id = f"call_{uuid.uuid4()}"
    call_obj: dict[str, object] = {
        "callId": call_id,
        "caller": {"number": caller_number},
        "callee": {"number": callee_number},
        "status": "connected",
        "createdAt": _now_iso(),
        "recordingEnabled": recording_enabled,
        "mock": True,
    }
    _MOCK_CALLS[call_id] = call_obj

    if recording_enabled:
        _MOCK_RECORDINGS[call_id] = {
            "callId": call_id,
            "content": base64.b64encode(b"mock-recording-bytes").decode("ascii"),
            "contentType": "audio/wav",
            "generatedAt": _now_iso(),
            "mock": True,
        }

    return call_obj


def create_call(payload: dict[str, object]) -> dict[str, object]:
    """Create a click-to-dial call session."""
    caller = payload.get("caller") if isinstance(payload.get("caller"), dict) else None
    callee = payload.get("callee") if isinstance(payload.get("callee"), dict) else None
    caller_number = str(caller.get("number")) if caller else ""
    callee_number = str(callee.get("number")) if callee else ""

    if not caller or not callee:
        return {"error": {"status": 400, "code": "INVALID_ARGUMENT", "message": "caller and callee are required."}}

    if not _validate_number(caller_number) or not _validate_number(callee_number):
        return {
            "error": {
                "status": 422,
                "code": "INVALID_PHONE_NUMBER",
                "message": "Caller or callee number is not a valid E.164 phone number.",
            }
        }

    if caller_number == callee_number:
        return {
            "error": {
                "status": 422,
                "code": "SAME_CALLER_CALLEE",
                "message": "Caller and callee cannot be the same number.",
            }
        }

    sink_credential_error = _validate_sink_credential(payload.get("sinkCredential") if isinstance(payload.get("sinkCredential"), dict) else None)
    if sink_credential_error:
        return {"error": sink_credential_error}

    recording_enabled = bool(payload.get("recordingEnabled", False))

    if CAMARA_MOCK or not CAMARA_CLICK_TO_DIAL_BASE_URL:
        return _create_mock_call(caller_number, callee_number, recording_enabled)

    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.post(_calls_url(), json=payload, headers=_operator_headers())

        if response.status_code == 201:
            data = response.json() if response.content else {}
            return data

        try:
            err = response.json()
        except Exception:
            err = {"status": response.status_code, "code": "INVALID_ARGUMENT", "message": response.text}
        return {"error": err}
    except Exception as exc:
        fallback = _create_mock_call(caller_number, callee_number, recording_enabled)
        if "error" in fallback:
            return fallback
        fallback["live_error"] = str(exc)
        return fallback


def get_call(call_id: str) -> dict[str, object]:
    """Get call details."""
    if CAMARA_MOCK or not CAMARA_CLICK_TO_DIAL_BASE_URL:
        call = _MOCK_CALLS.get(call_id)
        if call:
            return call
        return {"error": {"status": 404, "code": "NOT_FOUND", "message": "The specified resource is not found."}}

    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.get(_call_url(call_id), headers=_operator_headers())
        if response.status_code == 200:
            return response.json() if response.content else {}
        try:
            err = response.json()
        except Exception:
            err = {"status": response.status_code, "code": "NOT_FOUND", "message": response.text}
        return {"error": err}
    except Exception as exc:
        return {"error": {"status": 502, "code": "BAD_GATEWAY", "message": str(exc)}}


def terminate_call(call_id: str) -> dict[str, object]:
    """Terminate an active call."""
    if CAMARA_MOCK or not CAMARA_CLICK_TO_DIAL_BASE_URL:
        call = _MOCK_CALLS.get(call_id)
        if not call:
            return {"error": {"status": 404, "code": "NOT_FOUND", "message": "The specified resource is not found."}}
        if call.get("status") == "disconnected":
            return {"error": {"status": 409, "code": "CALL_ALREADY_TERMINATED", "message": "Call is already terminated."}}
        call["status"] = "disconnected"
        return {}

    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.delete(_call_url(call_id), headers=_operator_headers())
        if response.status_code == 204:
            return {}
        try:
            err = response.json()
        except Exception:
            err = {"status": response.status_code, "code": "INVALID_ARGUMENT", "message": response.text}
        return {"error": err}
    except Exception as exc:
        return {"error": {"status": 502, "code": "BAD_GATEWAY", "message": str(exc)}}


def get_recording(call_id: str) -> dict[str, object]:
    """Get call recording by call ID."""
    if CAMARA_MOCK or not CAMARA_CLICK_TO_DIAL_BASE_URL:
        recording = _MOCK_RECORDINGS.get(call_id)
        if recording:
            return recording
        return {"error": {"status": 404, "code": "NOT_FOUND", "message": "The specified resource is not found."}}

    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.get(_recording_url(call_id), headers=_operator_headers())
        if response.status_code == 200:
            return response.json() if response.content else {}
        try:
            err = response.json()
        except Exception:
            err = {"status": response.status_code, "code": "NOT_FOUND", "message": response.text}
        return {"error": err}
    except Exception as exc:
        return {"error": {"status": 502, "code": "BAD_GATEWAY", "message": str(exc)}}
