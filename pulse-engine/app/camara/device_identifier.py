"""CAMARA Device Identifier adapter (vwip).

Implements:
- POST /retrieve-identifier
- POST /retrieve-type
- POST /retrieve-ppid
- POST /match-identifier
"""

from __future__ import annotations

import hashlib
import ipaddress
import re
import uuid
from datetime import UTC, datetime

import httpx

from app.camara.config import (
    CAMARA_DEVICE_IDENTIFIER_BASE_URL,
    CAMARA_DEVICE_IDENTIFIER_CLIENT_ID,
    CAMARA_DEVICE_IDENTIFIER_CLIENT_SECRET,
    CAMARA_MOCK,
)

_TIMEOUT = 10.0
_PHONE_PATTERN = re.compile(r"^\+[1-9][0-9]{4,14}$")


def _now_utc() -> str:
    return datetime.now(UTC).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def _validate_device(
    device: object,
    *,
    required: bool,
    token_device_identified: bool,
) -> dict[str, object] | None:
    if token_device_identified and device is not None:
        return {
            "status": 422,
            "code": "UNNECESSARY_IDENTIFIER",
            "message": "An explicit identifier has been provided for the device when this is already identified by the access token",
        }

    if device is None:
        if token_device_identified:
            return None
        if required:
            return {
                "status": 422,
                "code": "MISSING_IDENTIFIER",
                "message": "An identifier is not included in the request and the device cannot be identified from the 2-legged access token",
            }
        return None

    if not isinstance(device, dict) or len(device) == 0:
        return {
            "status": 422,
            "code": "UNSUPPORTED_IDENTIFIER",
            "message": "None of the provided identifiers is supported by the implementation.",
        }

    supported = {"phoneNumber", "networkAccessIdentifier", "ipv4Address", "ipv6Address"}
    present = [k for k in supported if k in device]
    if len(present) == 0:
        return {
            "status": 422,
            "code": "UNSUPPORTED_IDENTIFIER",
            "message": "None of the provided identifiers is supported by the implementation.",
        }

    # As per commonalities note, NAI is not supported in this API release.
    if "networkAccessIdentifier" in device:
        return {
            "status": 422,
            "code": "UNSUPPORTED_IDENTIFIER",
            "message": "None of the provided identifiers is supported by the implementation.",
        }

    phone = device.get("phoneNumber")
    if phone is not None and (not isinstance(phone, str) or _PHONE_PATTERN.fullmatch(phone) is None):
        return {
            "status": 400,
            "code": "INVALID_ARGUMENT",
            "message": "Invalid format: phoneNumber",
        }

    ipv6 = device.get("ipv6Address")
    if ipv6 is not None:
        try:
            ipaddress.ip_address(str(ipv6))
        except ValueError:
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "Invalid format: ipv6Address",
            }

    ipv4 = device.get("ipv4Address")
    if ipv4 is not None:
        if not isinstance(ipv4, dict):
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "Invalid format: ipv4Address",
            }
        public = ipv4.get("publicAddress")
        private = ipv4.get("privateAddress")
        public_port = ipv4.get("publicPort")
        if public is None:
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "Invalid format: ipv4Address",
            }
        try:
            ipaddress.ip_address(str(public))
        except ValueError:
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "Invalid format: ipv4Address",
            }
        if private is None and public_port is None:
            return {
                "status": 400,
                "code": "INVALID_ARGUMENT",
                "message": "Invalid format: ipv4Address",
            }
        if public_port is not None and (not isinstance(public_port, int) or public_port < 0 or public_port > 65535):
            return {
                "status": 400,
                "code": "OUT_OF_RANGE",
                "message": "Invalid value: ipv4Address.publicPort",
            }

    return None


def _normalize_device_for_response(device: dict[str, object] | None) -> dict[str, object] | None:
    if not device:
        return None
    for key in ("phoneNumber", "ipv4Address", "ipv6Address", "networkAccessIdentifier"):
        if key in device:
            return {key: device[key]}
    return None


def _device_seed(device: dict[str, object] | None, token_device_identified: bool) -> str:
    if token_device_identified and device is None:
        return "token-subject"
    normalized = _normalize_device_for_response(device)
    if not normalized:
        return "unknown"
    k, v = next(iter(normalized.items()))
    return f"{k}:{v}"


def _mock_device_record(device: dict[str, object] | None, token_device_identified: bool) -> dict[str, object]:
    seed = _device_seed(device, token_device_identified)
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    numeric = "".join(str(int(ch, 16) % 10) for ch in digest)
    tac = numeric[:8]
    serial = numeric[8:14]
    check = numeric[14]
    imei = f"{tac}{serial}{check}"
    imeisv = f"{tac}{serial}{numeric[15:17]}"
    ppid = hashlib.sha256(f"ppid:{seed}".encode("utf-8")).hexdigest()

    return {
        "lastChecked": _now_utc(),
        "imei": imei,
        "imeisv": imeisv,
        "tac": tac,
        "model": "MockDevice X",
        "manufacturer": "MockTech",
        "ppid": ppid,
    }


def _operator_token() -> str:
    if not CAMARA_DEVICE_IDENTIFIER_BASE_URL or not CAMARA_DEVICE_IDENTIFIER_CLIENT_ID:
        raise ValueError(
            "CAMARA_DEVICE_IDENTIFIER_BASE_URL and CAMARA_DEVICE_IDENTIFIER_CLIENT_ID are required"
        )

    token_url = f"{CAMARA_DEVICE_IDENTIFIER_BASE_URL.rstrip('/')}/oauth2/token"
    with httpx.Client(timeout=_TIMEOUT) as client:
        response = client.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": CAMARA_DEVICE_IDENTIFIER_CLIENT_ID,
                "client_secret": CAMARA_DEVICE_IDENTIFIER_CLIENT_SECRET,
                "scope": (
                    "device-identifier:retrieve-identifier "
                    "device-identifier:retrieve-type "
                    "device-identifier:retrieve-ppid "
                    "device-identifier:match-identifier"
                ),
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


def _operator_base() -> str:
    return f"{CAMARA_DEVICE_IDENTIFIER_BASE_URL.rstrip('/')}/device-identifier/vwip"


def _parse_operator_error(response: httpx.Response, default_code: str) -> dict[str, object]:
    try:
        payload = response.json()
        code = payload.get("code", default_code)
        message = payload.get("message", response.text)
    except Exception:
        code = default_code
        message = response.text
    return {
        "error": {
            "status": int(response.status_code),
            "code": code,
            "message": message or "Request could not be processed.",
        }
    }


def _base_validate(payload: dict[str, object], token_device_identified: bool) -> tuple[dict[str, object] | None, dict[str, object] | None]:
    device = payload.get("device") if isinstance(payload.get("device"), dict) else None
    err = _validate_device(
        device,
        required=True,
        token_device_identified=token_device_identified,
    )
    if err:
        return None, {"error": err}
    return device, None


def retrieve_identifier(payload: dict[str, object], *, token_device_identified: bool = False) -> dict[str, object]:
    device, err = _base_validate(payload, token_device_identified)
    if err:
        return err

    if CAMARA_MOCK or not CAMARA_DEVICE_IDENTIFIER_BASE_URL:
        data = _mock_device_record(device, token_device_identified)
        out = {
            "lastChecked": data["lastChecked"],
            "imei": data["imei"],
            "imeisv": data["imeisv"],
            "tac": data["tac"],
            "model": data["model"],
            "manufacturer": data["manufacturer"],
        }
        normalized = _normalize_device_for_response(device)
        if normalized is not None:
            out["device"] = normalized
        return {"_http_status": 200, "item": out, "mock": True}

    try:
        url = f"{_operator_base()}/retrieve-identifier"
        body = payload if token_device_identified is False else {}
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.post(url, json=body, headers=_operator_headers())
        if response.status_code == 200:
            return {"_http_status": 200, "item": response.json() if response.content else {}}
        return _parse_operator_error(response, default_code="INVALID_ARGUMENT")
    except Exception as exc:
        data = _mock_device_record(device, token_device_identified)
        out = {
            "lastChecked": data["lastChecked"],
            "imei": data["imei"],
            "imeisv": data["imeisv"],
            "tac": data["tac"],
            "model": data["model"],
            "manufacturer": data["manufacturer"],
        }
        normalized = _normalize_device_for_response(device)
        if normalized is not None:
            out["device"] = normalized
        return {"_http_status": 200, "item": out, "mock": True, "live_error": str(exc)}


def retrieve_type(payload: dict[str, object], *, token_device_identified: bool = False) -> dict[str, object]:
    device, err = _base_validate(payload, token_device_identified)
    if err:
        return err

    if CAMARA_MOCK or not CAMARA_DEVICE_IDENTIFIER_BASE_URL:
        data = _mock_device_record(device, token_device_identified)
        out = {
            "lastChecked": data["lastChecked"],
            "tac": data["tac"],
            "model": data["model"],
            "manufacturer": data["manufacturer"],
        }
        normalized = _normalize_device_for_response(device)
        if normalized is not None:
            out["device"] = normalized
        return {"_http_status": 200, "item": out, "mock": True}

    try:
        url = f"{_operator_base()}/retrieve-type"
        body = payload if token_device_identified is False else {}
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.post(url, json=body, headers=_operator_headers())
        if response.status_code == 200:
            return {"_http_status": 200, "item": response.json() if response.content else {}}
        return _parse_operator_error(response, default_code="INVALID_ARGUMENT")
    except Exception as exc:
        data = _mock_device_record(device, token_device_identified)
        out = {
            "lastChecked": data["lastChecked"],
            "tac": data["tac"],
            "model": data["model"],
            "manufacturer": data["manufacturer"],
        }
        normalized = _normalize_device_for_response(device)
        if normalized is not None:
            out["device"] = normalized
        return {"_http_status": 200, "item": out, "mock": True, "live_error": str(exc)}


def retrieve_ppid(payload: dict[str, object], *, token_device_identified: bool = False) -> dict[str, object]:
    device, err = _base_validate(payload, token_device_identified)
    if err:
        return err

    if CAMARA_MOCK or not CAMARA_DEVICE_IDENTIFIER_BASE_URL:
        data = _mock_device_record(device, token_device_identified)
        out = {
            "lastChecked": data["lastChecked"],
            "ppid": data["ppid"],
        }
        normalized = _normalize_device_for_response(device)
        if normalized is not None:
            out["device"] = normalized
        return {"_http_status": 200, "item": out, "mock": True}

    try:
        url = f"{_operator_base()}/retrieve-ppid"
        body = payload if token_device_identified is False else {}
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.post(url, json=body, headers=_operator_headers())
        if response.status_code == 200:
            return {"_http_status": 200, "item": response.json() if response.content else {}}
        return _parse_operator_error(response, default_code="INVALID_ARGUMENT")
    except Exception as exc:
        data = _mock_device_record(device, token_device_identified)
        out = {
            "lastChecked": data["lastChecked"],
            "ppid": data["ppid"],
        }
        normalized = _normalize_device_for_response(device)
        if normalized is not None:
            out["device"] = normalized
        return {"_http_status": 200, "item": out, "mock": True, "live_error": str(exc)}


def _validate_provided_identifier(identifier_type: object, identifier_value: object) -> dict[str, object] | None:
    if identifier_type not in {"IMEI", "IMEISV", "TAC"}:
        return {
            "status": 400,
            "code": "INVALID_ARGUMENT",
            "message": "providedIdentifierType must be one of IMEI, IMEISV, TAC.",
        }
    if not isinstance(identifier_value, str):
        return {
            "status": 400,
            "code": "INVALID_ARGUMENT",
            "message": "providedIdentifier must be a string.",
        }

    patterns = {
        "IMEI": r"^[0-9]{15}$",
        "IMEISV": r"^[0-9]{16}$",
        "TAC": r"^[0-9]{8}$",
    }
    if re.fullmatch(patterns[str(identifier_type)], identifier_value) is None:
        return {
            "status": 400,
            "code": "INVALID_ARGUMENT",
            "message": "providedIdentifier format does not match providedIdentifierType.",
        }
    return None


def match_identifier(payload: dict[str, object], *, token_device_identified: bool = False) -> dict[str, object]:
    device, err = _base_validate(payload, token_device_identified)
    if err:
        return err

    err = _validate_provided_identifier(
        payload.get("providedIdentifierType"),
        payload.get("providedIdentifier"),
    )
    if err:
        return {"error": err}

    if CAMARA_MOCK or not CAMARA_DEVICE_IDENTIFIER_BASE_URL:
        data = _mock_device_record(device, token_device_identified)
        id_type = str(payload.get("providedIdentifierType"))
        provided = str(payload.get("providedIdentifier"))
        actual = {
            "IMEI": data["imei"],
            "IMEISV": data["imeisv"],
            "TAC": data["tac"],
        }[id_type]

        out = {
            "lastChecked": data["lastChecked"],
            "match": provided == actual,
        }
        normalized = _normalize_device_for_response(device)
        if normalized is not None:
            out["device"] = normalized
        return {"_http_status": 200, "item": out, "mock": True}

    try:
        url = f"{_operator_base()}/match-identifier"
        body = payload if token_device_identified is False else {
            "providedIdentifierType": payload.get("providedIdentifierType"),
            "providedIdentifier": payload.get("providedIdentifier"),
        }
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.post(url, json=body, headers=_operator_headers())
        if response.status_code == 200:
            return {"_http_status": 200, "item": response.json() if response.content else {}}
        return _parse_operator_error(response, default_code="INVALID_ARGUMENT")
    except Exception as exc:
        data = _mock_device_record(device, token_device_identified)
        id_type = str(payload.get("providedIdentifierType"))
        provided = str(payload.get("providedIdentifier"))
        actual = {
            "IMEI": data["imei"],
            "IMEISV": data["imeisv"],
            "TAC": data["tac"],
        }[id_type]
        out = {
            "lastChecked": data["lastChecked"],
            "match": provided == actual,
        }
        normalized = _normalize_device_for_response(device)
        if normalized is not None:
            out["device"] = normalized
        return {"_http_status": 200, "item": out, "mock": True, "live_error": str(exc)}
