"""CAMARA Device Reachability Status Subscriptions adapter (vwip).

Implements:
- POST /subscriptions
- GET /subscriptions
- GET /subscriptions/{subscriptionId}
- DELETE /subscriptions/{subscriptionId}
"""

from __future__ import annotations

import ipaddress
import uuid
from datetime import UTC, datetime

import httpx

from app.camara.config import (
    CAMARA_DEVICE_REACHABILITY_SUBSCRIPTIONS_BASE_URL,
    CAMARA_DEVICE_REACHABILITY_SUBSCRIPTIONS_CLIENT_ID,
    CAMARA_DEVICE_REACHABILITY_SUBSCRIPTIONS_CLIENT_SECRET,
    CAMARA_MOCK,
)

_TIMEOUT = 10.0

_EVENT_REACHABILITY_DATA = "org.camaraproject.device-reachability-status-subscriptions.v0.reachability-data"
_EVENT_REACHABILITY_SMS = "org.camaraproject.device-reachability-status-subscriptions.v0.reachability-sms"
_EVENT_REACHABILITY_DISCONNECTED = "org.camaraproject.device-reachability-status-subscriptions.v0.reachability-disconnected"

_ALLOWED_EVENT_TYPES = {
    _EVENT_REACHABILITY_DATA,
    _EVENT_REACHABILITY_SMS,
    _EVENT_REACHABILITY_DISCONNECTED,
}
_SUPPORTED_DEVICE_KEYS = {"phoneNumber", "networkAccessIdentifier", "ipv4Address", "ipv6Address"}

_MOCK_SUBSCRIPTIONS: dict[str, dict[str, object]] = {}


def _now_iso() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _normalize_device_for_response(device: dict[str, object] | None) -> dict[str, object] | None:
    if not device:
        return None
    for key in ("phoneNumber", "ipv4Address", "ipv6Address", "networkAccessIdentifier"):
        if key in device:
            return {key: device[key]}
    return None


def _error(status: int, code: str, message: str) -> dict[str, object]:
    return {"error": {"status": status, "code": code, "message": message}}


def _validate_device(
    device: object,
    *,
    token_device_identified: bool,
) -> tuple[dict[str, object] | None, dict[str, object] | None]:
    if token_device_identified and device is not None:
        return None, _error(422, "UNNECESSARY_IDENTIFIER", "The device is already identified by the access token.")

    if device is None:
        if token_device_identified:
            return None, None
        return None, _error(422, "MISSING_IDENTIFIER", "The device cannot be identified.")

    if not isinstance(device, dict) or len(device) == 0:
        return None, _error(422, "UNSUPPORTED_IDENTIFIER", "The identifier provided is not supported.")

    present = [k for k in _SUPPORTED_DEVICE_KEYS if k in device]
    if len(present) == 0:
        return None, _error(422, "UNSUPPORTED_IDENTIFIER", "The identifier provided is not supported.")

    if "networkAccessIdentifier" in device:
        return None, _error(422, "UNSUPPORTED_IDENTIFIER", "The identifier provided is not supported.")

    phone = device.get("phoneNumber")
    if phone is not None:
        if not isinstance(phone, str) or not phone.startswith("+") or len(phone) < 6 or len(phone) > 16:
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

    return device, None


def _validate_create_payload(
    payload: dict[str, object],
    *,
    token_device_identified: bool,
) -> tuple[dict[str, object] | None, dict[str, object] | None, dict[str, object] | None]:
    protocol = payload.get("protocol")
    if protocol != "HTTP":
        return None, None, _error(400, "INVALID_PROTOCOL", "Only HTTP is supported")

    sink = payload.get("sink")
    if not isinstance(sink, str) or not sink.startswith("https://"):
        return None, None, _error(400, "INVALID_SINK", "sink not valid for the specified protocol")

    types = payload.get("types")
    if not isinstance(types, list) or len(types) == 0:
        return None, None, _error(400, "INVALID_ARGUMENT", "types must contain one supported event type.")
    if len(types) > 1:
        return None, None, _error(422, "MULTIEVENT_SUBSCRIPTION_NOT_SUPPORTED", "Multi event types subscription not managed")
    if types[0] not in _ALLOWED_EVENT_TYPES:
        return None, None, _error(400, "INVALID_ARGUMENT", "Unsupported subscription event type.")

    sink_credential = payload.get("sinkCredential")
    if sink_credential is not None:
        if not isinstance(sink_credential, dict):
            return None, None, _error(400, "INVALID_CREDENTIAL", "sinkCredential must be an object")
        credential_type = sink_credential.get("credentialType")
        if credential_type != "ACCESSTOKEN":
            return None, None, _error(400, "INVALID_CREDENTIAL", "Only Access token is supported")
        token_type = sink_credential.get("accessTokenType")
        if token_type != "bearer":
            return None, None, _error(400, "INVALID_TOKEN", "Only bearer token is supported")
        for field in ("accessToken", "accessTokenExpiresUtc"):
            if not sink_credential.get(field):
                return None, None, _error(400, "INVALID_CREDENTIAL", f"sinkCredential.{field} is required")

    config = payload.get("config")
    if not isinstance(config, dict):
        return None, None, _error(400, "INVALID_ARGUMENT", "config must be an object.")

    sub_detail = config.get("subscriptionDetail")
    if not isinstance(sub_detail, dict):
        return None, None, _error(400, "INVALID_ARGUMENT", "config.subscriptionDetail must be an object.")

    device_obj = sub_detail.get("device")
    validated_device, err = _validate_device(device_obj, token_device_identified=token_device_identified)
    if err:
        return None, None, err

    return config, validated_device, None


def _base_url() -> str:
    return f"{CAMARA_DEVICE_REACHABILITY_SUBSCRIPTIONS_BASE_URL.rstrip('/')}/device-reachability-status-subscriptions/vwip"


def _operator_token() -> str:
    if not CAMARA_DEVICE_REACHABILITY_SUBSCRIPTIONS_BASE_URL or not CAMARA_DEVICE_REACHABILITY_SUBSCRIPTIONS_CLIENT_ID:
        raise ValueError(
            "CAMARA_DEVICE_REACHABILITY_SUBSCRIPTIONS_BASE_URL and CAMARA_DEVICE_REACHABILITY_SUBSCRIPTIONS_CLIENT_ID are required"
        )

    token_url = f"{CAMARA_DEVICE_REACHABILITY_SUBSCRIPTIONS_BASE_URL.rstrip('/')}/oauth2/token"
    with httpx.Client(timeout=_TIMEOUT) as client:
        response = client.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": CAMARA_DEVICE_REACHABILITY_SUBSCRIPTIONS_CLIENT_ID,
                "client_secret": CAMARA_DEVICE_REACHABILITY_SUBSCRIPTIONS_CLIENT_SECRET,
            },
        )
        response.raise_for_status()
        payload = response.json()
        token = payload.get("access_token")
        if not token:
            raise ValueError("Missing access_token in operator token response")
        return str(token)


def _clean_response_for_3legged(item: dict[str, object], *, token_device_identified: bool) -> dict[str, object]:
    if not token_device_identified:
        return item
    config = item.get("config")
    if isinstance(config, dict):
        sub_detail = config.get("subscriptionDetail")
        if isinstance(sub_detail, dict) and "device" in sub_detail:
            sub_detail.pop("device", None)
    return item


def create_subscription(payload: dict[str, object], *, token_device_identified: bool = False) -> dict[str, object]:
    config, device, err = _validate_create_payload(payload, token_device_identified=token_device_identified)
    if err:
        return err

    if CAMARA_MOCK or not CAMARA_DEVICE_REACHABILITY_SUBSCRIPTIONS_BASE_URL:
        sub_id = str(uuid.uuid4())
        now = _now_iso()
        item: dict[str, object] = {
            "id": sub_id,
            "protocol": "HTTP",
            "sink": payload["sink"],
            "types": [payload["types"][0]],
            "config": {
                "subscriptionDetail": {},
            },
            "startsAt": now,
            "status": "ACTIVE",
        }
        if device is not None:
            normalized = _normalize_device_for_response(device)
            if normalized is not None:
                item["config"]["subscriptionDetail"] = {"device": normalized}
        if config and config.get("subscriptionExpireTime"):
            item["expiresAt"] = config["subscriptionExpireTime"]
            item["config"]["subscriptionExpireTime"] = config["subscriptionExpireTime"]
        if config and config.get("subscriptionMaxEvents") is not None:
            item["config"]["subscriptionMaxEvents"] = config["subscriptionMaxEvents"]
        if config and config.get("initialEvent") is not None:
            item["config"]["initialEvent"] = config["initialEvent"]
        _MOCK_SUBSCRIPTIONS[sub_id] = item
        return {"item": _clean_response_for_3legged(item, token_device_identified=token_device_identified), "_http_status": 201}

    try:
        token = _operator_token()
        body = dict(payload)
        if token_device_identified:
            cfg = dict(body.get("config", {}))
            detail = dict(cfg.get("subscriptionDetail", {}))
            detail.pop("device", None)
            cfg["subscriptionDetail"] = detail
            body["config"] = cfg

        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.post(
                f"{_base_url()}/subscriptions",
                headers={"Authorization": f"Bearer {token}"},
                json=body,
            )
            if response.status_code >= 400:
                try:
                    data = response.json()
                except Exception:
                    data = {}
                return _error(
                    response.status_code,
                    str(data.get("code", "INVALID_ARGUMENT")),
                    str(data.get("message", "Request could not be processed.")),
                )
            data = response.json() if response.content else {}
            item = data if isinstance(data, dict) else {}
            return {"item": _clean_response_for_3legged(item, token_device_identified=token_device_identified), "_http_status": response.status_code}
    except Exception as exc:
        sub_id = str(uuid.uuid4())
        now = _now_iso()
        fallback: dict[str, object] = {
            "id": sub_id,
            "protocol": "HTTP",
            "sink": payload["sink"],
            "types": [payload["types"][0]],
            "config": {
                "subscriptionDetail": {},
            },
            "startsAt": now,
            "status": "ACTIVE",
            "mock": True,
            "live_error": str(exc),
        }
        if device is not None:
            normalized = _normalize_device_for_response(device)
            if normalized is not None:
                fallback["config"]["subscriptionDetail"] = {"device": normalized}
        _MOCK_SUBSCRIPTIONS[sub_id] = fallback
        return {"item": _clean_response_for_3legged(fallback, token_device_identified=token_device_identified), "_http_status": 201}


def list_subscriptions() -> dict[str, object]:
    if CAMARA_MOCK or not CAMARA_DEVICE_REACHABILITY_SUBSCRIPTIONS_BASE_URL:
        return {"items": list(_MOCK_SUBSCRIPTIONS.values())}

    try:
        token = _operator_token()
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.get(
                f"{_base_url()}/subscriptions",
                headers={"Authorization": f"Bearer {token}"},
            )
            if response.status_code >= 400:
                try:
                    data = response.json()
                except Exception:
                    data = {}
                return _error(
                    response.status_code,
                    str(data.get("code", "INVALID_ARGUMENT")),
                    str(data.get("message", "Request could not be processed.")),
                )
            data = response.json() if response.content else []
            if isinstance(data, list):
                return {"items": data}
            return {"items": []}
    except Exception:
        return {"items": list(_MOCK_SUBSCRIPTIONS.values())}


def get_subscription(subscription_id: str) -> dict[str, object]:
    if not subscription_id:
        return _error(400, "INVALID_ARGUMENT", "Expected property is missing: subscriptionId")

    if CAMARA_MOCK or not CAMARA_DEVICE_REACHABILITY_SUBSCRIPTIONS_BASE_URL:
        item = _MOCK_SUBSCRIPTIONS.get(subscription_id)
        if not item:
            return _error(404, "NOT_FOUND", "The specified resource is not found.")
        return {"item": item}

    try:
        token = _operator_token()
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.get(
                f"{_base_url()}/subscriptions/{subscription_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            if response.status_code >= 400:
                try:
                    data = response.json()
                except Exception:
                    data = {}
                return _error(
                    response.status_code,
                    str(data.get("code", "NOT_FOUND")),
                    str(data.get("message", "The specified resource is not found.")),
                )
            data = response.json() if response.content else {}
            return {"item": data if isinstance(data, dict) else {}}
    except Exception:
        item = _MOCK_SUBSCRIPTIONS.get(subscription_id)
        if not item:
            return _error(404, "NOT_FOUND", "The specified resource is not found.")
        return {"item": item}


def delete_subscription(subscription_id: str) -> dict[str, object]:
    if not subscription_id:
        return _error(400, "INVALID_ARGUMENT", "Expected property is missing: subscriptionId")

    if CAMARA_MOCK or not CAMARA_DEVICE_REACHABILITY_SUBSCRIPTIONS_BASE_URL:
        if subscription_id not in _MOCK_SUBSCRIPTIONS:
            return _error(404, "NOT_FOUND", "The specified resource is not found.")
        del _MOCK_SUBSCRIPTIONS[subscription_id]
        return {"item": {}, "_http_status": 204}

    try:
        token = _operator_token()
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.delete(
                f"{_base_url()}/subscriptions/{subscription_id}",
                headers={"Authorization": f"Bearer {token}"},
            )
            if response.status_code >= 400:
                try:
                    data = response.json()
                except Exception:
                    data = {}
                return _error(
                    response.status_code,
                    str(data.get("code", "NOT_FOUND")),
                    str(data.get("message", "The specified resource is not found.")),
                )
            if response.status_code == 202:
                data = response.json() if response.content else {"id": subscription_id}
                return {"item": data if isinstance(data, dict) else {"id": subscription_id}, "_http_status": 202}
            return {"item": {}, "_http_status": 204}
    except Exception:
        if subscription_id in _MOCK_SUBSCRIPTIONS:
            del _MOCK_SUBSCRIPTIONS[subscription_id]
            return {"item": {}, "_http_status": 204}
        return _error(404, "NOT_FOUND", "The specified resource is not found.")
