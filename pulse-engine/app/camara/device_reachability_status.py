"""CAMARA Device Reachability Status adapter (vwip).

Implements:
- POST /retrieve
"""

from __future__ import annotations

import hashlib
import ipaddress
import re
import uuid
from datetime import UTC, datetime

import httpx

from app.camara.config import (
    CAMARA_DEVICE_REACHABILITY_STATUS_BASE_URL,
    CAMARA_DEVICE_REACHABILITY_STATUS_CLIENT_ID,
    CAMARA_DEVICE_REACHABILITY_STATUS_CLIENT_SECRET,
    CAMARA_MOCK,
)

_TIMEOUT = 10.0
_PHONE_PATTERN = re.compile(r"^\+[1-9][0-9]{4,14}$")
_SUPPORTED_DEVICE_KEYS = {"phoneNumber", "networkAccessIdentifier", "ipv4Address", "ipv6Address"}


def _now_utc() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _error(status: int, code: str, message: str) -> dict[str, object]:
    return {"error": {"status": status, "code": code, "message": message}}


def _normalize_device_for_response(device: dict[str, object] | None) -> dict[str, object] | None:
    if not device:
        return None
    for key in ("phoneNumber", "ipv4Address", "ipv6Address", "networkAccessIdentifier"):
        if key in device:
            return {key: device[key]}
    return None


def _validate_device(device: object, *, token_device_identified: bool) -> tuple[dict[str, object] | None, dict[str, object] | None]:
    if token_device_identified and device is not None:
        return None, _error(422, "UNNECESSARY_IDENTIFIER", "The device is already identified by the access token.")

    if device is None:
        if token_device_identified:
            return None, None
        return None, _error(422, "MISSING_IDENTIFIER", "The device cannot be identified.")

    if not isinstance(device, dict) or len(device) == 0:
        return None, _error(422, "UNSUPPORTED_IDENTIFIER", "The identifier provided is not supported.")

    present_keys = [k for k in _SUPPORTED_DEVICE_KEYS if k in device]
    if len(present_keys) == 0:
        return None, _error(422, "UNSUPPORTED_IDENTIFIER", "The identifier provided is not supported.")

    if "networkAccessIdentifier" in device:
        return None, _error(422, "UNSUPPORTED_IDENTIFIER", "The identifier provided is not supported.")

    phone = device.get("phoneNumber")
    if phone is not None and (not isinstance(phone, str) or _PHONE_PATTERN.fullmatch(phone) is None):
        return None, _error(400, "INVALID_ARGUMENT", "Invalid phoneNumber format.")

    ipv6 = device.get("ipv6Address")
    if ipv6 is not None:
        try:
            ipaddress.ip_address(str(ipv6))
        except ValueError:
            return None, _error(400, "INVALID_ARGUMENT", "Invalid ipv6Address format.")

    ipv4 = device.get("ipv4Address")
    if ipv4 is not None:
        if not isinstance(ipv4, dict):
            return None, _error(400, "INVALID_ARGUMENT", "ipv4Address must be an object.")
        public = ipv4.get("publicAddress")
        private = ipv4.get("privateAddress")
        public_port = ipv4.get("publicPort")
        if public is None:
            return None, _error(400, "INVALID_ARGUMENT", "ipv4Address.publicAddress is required.")
        try:
            ipaddress.ip_address(str(public))
        except ValueError:
            return None, _error(400, "INVALID_ARGUMENT", "Invalid ipv4Address.publicAddress format.")
        if private is None and public_port is None:
            return None, _error(400, "INVALID_ARGUMENT", "ipv4Address requires privateAddress or publicPort.")
        if public_port is not None and (
            not isinstance(public_port, int) or public_port < 0 or public_port > 65535
        ):
            return None, _error(400, "INVALID_ARGUMENT", "Invalid ipv4Address.publicPort.")

    return device, None


def _device_seed(device: dict[str, object] | None, token_device_identified: bool) -> str:
    if token_device_identified and device is None:
        return "token-subject"
    normalized = _normalize_device_for_response(device)
    if not normalized:
        return "unknown"
    key, value = next(iter(normalized.items()))
    return f"{key}:{value}"


def _mock_reachability(device: dict[str, object] | None, *, token_device_identified: bool) -> dict[str, object]:
    seed = _device_seed(device, token_device_identified)
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    mode = int(digest[0], 16) % 4

    out: dict[str, object] = {
        "lastStatusTime": _now_utc(),
    }
    if mode == 0:
        out["reachable"] = False
    elif mode == 1:
        out["reachable"] = True
        out["connectivity"] = ["SMS"]
    elif mode == 2:
        out["reachable"] = True
        out["connectivity"] = ["DATA"]
    else:
        out["reachable"] = True
        out["connectivity"] = ["DATA", "SMS"]

    normalized = _normalize_device_for_response(device)
    if normalized is not None:
        out["device"] = normalized
    return out


def _operator_token() -> str:
    if not CAMARA_DEVICE_REACHABILITY_STATUS_BASE_URL or not CAMARA_DEVICE_REACHABILITY_STATUS_CLIENT_ID:
        raise ValueError(
            "CAMARA_DEVICE_REACHABILITY_STATUS_BASE_URL and CAMARA_DEVICE_REACHABILITY_STATUS_CLIENT_ID are required"
        )

    token_url = f"{CAMARA_DEVICE_REACHABILITY_STATUS_BASE_URL.rstrip('/')}/oauth2/token"
    with httpx.Client(timeout=_TIMEOUT) as client:
        response = client.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": CAMARA_DEVICE_REACHABILITY_STATUS_CLIENT_ID,
                "client_secret": CAMARA_DEVICE_REACHABILITY_STATUS_CLIENT_SECRET,
                "scope": "device-reachability-status:read",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    response.raise_for_status()
    payload = response.json()
    token = payload.get("access_token")
    if not token:
        raise ValueError("Missing access_token in operator token response")
    return str(token)


def _operator_headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {_operator_token()}",
        "Content-Type": "application/json",
        "x-correlator": str(uuid.uuid4()),
    }


def _operator_base() -> str:
    return f"{CAMARA_DEVICE_REACHABILITY_STATUS_BASE_URL.rstrip('/')}/device-reachability-status/vwip"


def _parse_operator_error(response: httpx.Response) -> dict[str, object]:
    try:
        payload = response.json()
    except Exception:
        payload = {}
    return _error(
        int(response.status_code),
        str(payload.get("code", "INVALID_ARGUMENT")),
        str(payload.get("message", response.text or "Request could not be processed.")),
    )


def retrieve(payload: dict[str, object], *, token_device_identified: bool = False) -> dict[str, object]:
    device_obj = payload.get("device") if isinstance(payload.get("device"), dict) else None
    device, err = _validate_device(device_obj, token_device_identified=token_device_identified)
    if err:
        return err

    if CAMARA_MOCK or not CAMARA_DEVICE_REACHABILITY_STATUS_BASE_URL:
        return {"item": _mock_reachability(device, token_device_identified=token_device_identified), "_http_status": 200}

    try:
        body = payload if token_device_identified is False else {}
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.post(
                f"{_operator_base()}/retrieve",
                headers=_operator_headers(),
                json=body,
            )
        if response.status_code == 200:
            item = response.json() if response.content else {}
            return {"item": item if isinstance(item, dict) else {}, "_http_status": 200}
        return _parse_operator_error(response)
    except Exception as exc:
        item = _mock_reachability(device, token_device_identified=token_device_identified)
        return {"item": item, "_http_status": 200, "mock": True, "live_error": str(exc)}
