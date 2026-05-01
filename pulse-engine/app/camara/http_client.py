"""Shared synchronous httpx client for Nokia Network as Code CAMARA API calls.

RapidAPI endpoints are exposed under /passthrough/camara/v1.
Adapters can keep using paths such as camara/location-verification/v0/verify.
"""

import logging
import uuid

import httpx

from app.camara.config import (
    CAMARA_BASE_URL,
    CAMARA_CLIENT_ID,
    CAMARA_CLIENT_SECRET,
    NOKIA_NAC_API_KEY,
    NOKIA_NAC_RAPIDAPI_HOST,
)

_TIMEOUT = 10.0
_CAMARA_PREFIX = "passthrough/camara/v1"
_LOGGER = logging.getLogger(__name__)


def _rapidapi_headers() -> dict[str, str]:
    return {
        "x-rapidapi-key": NOKIA_NAC_API_KEY,
        "x-rapidapi-host": NOKIA_NAC_RAPIDAPI_HOST,
    }


def _headers(access_token: str | None = None) -> dict[str, str]:
    headers = {
        **_rapidapi_headers(),
        "x-correlator": str(uuid.uuid4()),
        "Content-Type": "application/json",
    }
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    return headers


def _rapidapi_url(path: str) -> str:
    base = CAMARA_BASE_URL.rstrip("/")
    normalized = path.strip("/")
    return f"{base}/{normalized}"


def _url(path: str) -> str:
    base = CAMARA_BASE_URL.rstrip("/")
    normalized = path.strip("/")
    if normalized.startswith("camara/"):
        normalized = normalized.removeprefix("camara/")

    if _CAMARA_PREFIX in base:
        return f"{base}/{normalized}"

    return f"{base}/{_CAMARA_PREFIX}/{normalized}"


def _candidate_urls(path: str) -> list[str]:
    base = CAMARA_BASE_URL.rstrip("/")
    variants = _path_variants(path)
    urls: list[str] = []

    def add(url: str) -> None:
        if url not in urls:
            urls.append(url)

    for candidate in variants:
        # Direct path on the configured base.
        add(f"{base}/{candidate}")

        # CAMARA passthrough path variant.
        if _CAMARA_PREFIX not in base:
            add(f"{base}/{_CAMARA_PREFIX}/{candidate}")

    return urls


def _path_variants(path: str) -> list[str]:
    normalized = path.strip("/")
    if normalized.startswith("camara/"):
        normalized = normalized.removeprefix("camara/")

    variants = [normalized]
    segments = normalized.split("/")
    # RapidAPI NaC often uses a duplicated API family prefix, e.g.
    # number-verification/number-verification/v0/verify
    if len(segments) >= 3 and segments[0] != segments[1]:
        duplicated = "/".join([segments[0], *segments])
        variants.append(duplicated)

    # Some NaC routes are mounted under device-status/*
    if normalized.startswith("device-reachability-status") or normalized.startswith("device-reachability-status-subscriptions"):
        variants.append(f"device-status/{normalized}")

    # Alternate QoD families observed in NaC docs/examples.
    if normalized.startswith("quality-on-demand/"):
        variants.append(normalized.replace("quality-on-demand/", "qod/", 1))
    if normalized.startswith("qod/"):
        variants.append(normalized.replace("qod/", "quality-on-demand/", 1))

    # Version variants occasionally differ by API family.
    if "/v0/" in normalized:
        variants.append(normalized.replace("/v0/", "/v1/", 1))
    if "/v1/" in normalized:
        variants.append(normalized.replace("/v1/", "/v0/", 1))
    if "device-reachability-status-subscriptions" in normalized and "/v0/" in normalized:
        variants.append(normalized.replace("/v0/", "/v0.7/", 1))

    return variants


def get_oauth_endpoints() -> dict[str, str]:
    """Discover OAuth authorization and token endpoints for NaC."""
    url = _rapidapi_url(".well-known/openid-configuration")
    with httpx.Client(timeout=_TIMEOUT) as client:
        response = client.get(url, headers=_rapidapi_headers())
    response.raise_for_status()
    data = response.json()
    return {
        "authorization_endpoint": data.get("authorization_endpoint", ""),
        "token_endpoint": data.get("token_endpoint", ""),
    }


def get_client_credentials() -> dict[str, str]:
    """Get client credentials from NaC if not pre-configured in env."""
    if CAMARA_CLIENT_ID and CAMARA_CLIENT_SECRET:
        return {"client_id": CAMARA_CLIENT_ID, "client_secret": CAMARA_CLIENT_SECRET}

    url = _rapidapi_url("oauth2/v1/auth/clientcredentials")
    with httpx.Client(timeout=_TIMEOUT) as client:
        response = client.get(url, headers=_rapidapi_headers())
    response.raise_for_status()
    data = response.json()
    return {
        "client_id": data.get("client_id", ""),
        "client_secret": data.get("client_secret", ""),
    }


def exchange_auth_code_for_token(code: str, redirect_uri: str) -> dict[str, object]:
    """Exchange a Number Verification authorization code for a bearer token."""
    endpoints = get_oauth_endpoints()
    token_endpoint = endpoints.get("token_endpoint")
    if not token_endpoint:
        raise ValueError("Missing token_endpoint from openid configuration")

    credentials = get_client_credentials()
    client_id = credentials.get("client_id")
    client_secret = credentials.get("client_secret")
    if not client_id or not client_secret:
        raise ValueError("Missing CAMARA client credentials")

    form_body = {
        "client_id": client_id,
        "client_secret": client_secret,
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
    }

    with httpx.Client(timeout=_TIMEOUT) as client:
        response = client.post(
            token_endpoint,
            data=form_body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    response.raise_for_status()
    return response.json()


def nac_post(path: str, body: dict, access_token: str | None = None) -> dict:
    """POST to a Nokia NaC CAMARA endpoint and return the parsed JSON response."""
    with httpx.Client(timeout=_TIMEOUT) as client:
        response: httpx.Response | None = None
        for url in _candidate_urls(path):
            _LOGGER.debug("CAMARA POST attempt path=%s url=%s", path, url)
            response = client.post(url, json=body, headers=_headers(access_token=access_token))
            _LOGGER.debug("CAMARA POST response path=%s url=%s status=%s", path, url, response.status_code)
            if response.status_code != 404:
                break
        assert response is not None
        response.raise_for_status()
        if not response.content:
            return {}
        content_type = response.headers.get("content-type", "")
        if "application/json" not in content_type.lower():
            return {}
        return response.json()


def nac_get(path: str, params: dict | None = None, access_token: str | None = None) -> dict:
    """GET a Nokia NaC CAMARA endpoint and return the parsed JSON response."""
    with httpx.Client(timeout=_TIMEOUT) as client:
        response: httpx.Response | None = None
        for url in _candidate_urls(path):
            _LOGGER.debug("CAMARA GET attempt path=%s url=%s", path, url)
            response = client.get(url, params=params, headers=_headers(access_token=access_token))
            _LOGGER.debug("CAMARA GET response path=%s url=%s status=%s", path, url, response.status_code)
            if response.status_code != 404:
                break
        assert response is not None
        response.raise_for_status()
        if not response.content:
            return {}
        content_type = response.headers.get("content-type", "")
        if "application/json" not in content_type.lower():
            return {}
        return response.json()


def nac_delete(path: str, access_token: str | None = None) -> dict:
    """DELETE a Nokia NaC CAMARA endpoint and return the parsed JSON response (if any)."""
    with httpx.Client(timeout=_TIMEOUT) as client:
        response: httpx.Response | None = None
        for url in _candidate_urls(path):
            _LOGGER.debug("CAMARA DELETE attempt path=%s url=%s", path, url)
            response = client.delete(url, headers=_headers(access_token=access_token))
            _LOGGER.debug("CAMARA DELETE response path=%s url=%s status=%s", path, url, response.status_code)
            if response.status_code != 404:
                break
        assert response is not None
        response.raise_for_status()
        return response.json() if response.content else {"status": "DELETED"}
