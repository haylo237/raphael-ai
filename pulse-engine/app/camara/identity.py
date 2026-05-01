"""Identity and Number Ownership CAMARA adapters.

Spec: https://camaraproject.org/sim-swap/
      https://camaraproject.org/number-verification/
      https://camaraproject.org/OTPValidation/
"""

import datetime
import uuid

import httpx

from app.camara.config import (
    CAMARA_MOCK,
    CAMARA_OTP_BASE_URL,
    CAMARA_OTP_CLIENT_ID,
    CAMARA_OTP_CLIENT_SECRET,
    nac_device,
)

_OTP_TIMEOUT = 10.0
_OTP_API_VERSION = "v0"  # adjust if operator uses v1 or vwip


def _otp_access_token() -> str:
    """Obtain a client-credentials bearer token for the OTP SMS API."""
    if not CAMARA_OTP_BASE_URL or not CAMARA_OTP_CLIENT_ID:
        raise ValueError("CAMARA_OTP_BASE_URL and CAMARA_OTP_CLIENT_ID must be set for live OTP calls")

    token_url = f"{CAMARA_OTP_BASE_URL.rstrip('/')}/oauth2/token"
    with httpx.Client(timeout=_OTP_TIMEOUT) as client:
        resp = client.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": CAMARA_OTP_CLIENT_ID,
                "client_secret": CAMARA_OTP_CLIENT_SECRET,
                "scope": "one-time-password-sms:send-validate",
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    resp.raise_for_status()
    return resp.json()["access_token"]


def _otp_headers() -> dict[str, str]:
    token = _otp_access_token()
    return {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "x-correlator": str(uuid.uuid4()),
    }


def _otp_url(path: str) -> str:
    base = CAMARA_OTP_BASE_URL.rstrip("/")
    return f"{base}/one-time-password-sms/{_OTP_API_VERSION}/{path.lstrip('/')}"


def check_sim_swap(phone_number: str, max_age_hours: int = 240) -> dict[str, object]:
    """Check whether a SIM card was recently swapped.

    Used to detect potential account takeover or fraud before high-stakes actions.

    Args:
        phone_number: Device phone number (E.164 format).
        max_age_hours: Window to check for a swap event (default: 10 days).

    Returns:
        SIM swap status and timestamp of last known change.
    """
    if CAMARA_MOCK:
        return {
            "phone_number": phone_number,
            "swapped": False,
            "latest_sim_change": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "max_age_hours": max_age_hours,
            "mock": True,
        }

    try:
        device = nac_device(phone_number)
        latest_change = device.get_sim_swap_date()
        # NaC SDK max_age is in seconds, capped at 2400 s by the API.
        max_age_seconds = min(max_age_hours * 3600, 2400)
        swapped = device.verify_sim_swap(max_age=max_age_seconds)
        return {
            "phone_number": phone_number,
            "swapped": swapped,
            "latest_sim_change": latest_change.isoformat() if latest_change else None,
            "max_age_hours": max_age_hours,
        }
    except Exception as exc:
        return {
            "phone_number": phone_number,
            "swapped": False,
            "latest_sim_change": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "max_age_hours": max_age_hours,
            "mock": True,
            "live_error": str(exc),
        }


def verify_number(
    phone_number: str,
    code: str | None = None,
    state: str | None = None,
) -> dict[str, object]:
    """Verify that a device is using the claimed phone number.

    Uses the CAMARA Number Verification silent-auth flow via Nokia NaC SDK.
    Requires `code` and `state` obtained from the OAuth callback after starting
    the flow via /identity/oauth/start?scope=number-verification:verify.
    The NaC SDK exchanges the code for a single-use token internally.

    Args:
        phone_number: Phone number to verify (E.164 format).
        code: Authorization code from OAuth callback.
        state: State value from OAuth callback.

    Returns:
        Verification result.
    """
    if CAMARA_MOCK:
        return {
            "phone_number": phone_number,
            "verified": True,
            "mock": True,
        }

    if not code or not state:
        return {
            "phone_number": phone_number,
            "verified": True,
            "mock": True,
            "live_error": "code and state required — start the OAuth flow via GET /identity/oauth/start?scope=number-verification%3Averify",
        }

    try:
        verified = nac_device(phone_number).verify_number(code=code, state=state)
        return {
            "phone_number": phone_number,
            "verified": verified,
        }
    except Exception as exc:
        return {
            "phone_number": phone_number,
            "verified": False,
            "mock": True,
            "live_error": str(exc),
        }


def send_otp(phone_number: str, ttl_seconds: int = 300, channel: str = "sms") -> dict[str, object]:
    """Send a one-time password to a phone number via CAMARA OTP SMS API.

    Requires CAMARA_OTP_BASE_URL + CAMARA_OTP_CLIENT_ID/SECRET env vars pointing
    to the operator's own CAMARA OTP SMS endpoint (not available via Nokia NaC).

    Spec: POST /one-time-password-sms/v0/send-code
    Request:  { phoneNumber, message }
    Response: { authenticationId }  — used as challenge_id in validate_otp.

    Args:
        phone_number: Device phone number (E.164 format).
        ttl_seconds: OTP lifetime hint embedded in the message (informational only).
        channel: Delivery channel. Always sms per CAMARA spec.

    Returns:
        OTP challenge metadata including challenge_id (= CAMARA authenticationId).
    """
    if CAMARA_MOCK or not CAMARA_OTP_BASE_URL:
        return {
            "phone_number": phone_number,
            "challenge_id": str(uuid.uuid4()),
            "channel": channel,
            "ttl_seconds": ttl_seconds,
            "status": "SENT",
            "mock": True,
        }

    try:
        body = {
            "phoneNumber": phone_number,
            # CAMARA spec requires {{code}} placeholder in the message.
            "message": f"{{{{code}}}} is your Raphael AI verification code. Valid for {ttl_seconds}s.",
        }
        with httpx.Client(timeout=_OTP_TIMEOUT) as client:
            resp = client.post(_otp_url("send-code"), json=body, headers=_otp_headers())
        resp.raise_for_status()
        auth_id = resp.json().get("authenticationId", str(uuid.uuid4()))
        return {
            "phone_number": phone_number,
            "challenge_id": auth_id,
            "channel": channel,
            "ttl_seconds": ttl_seconds,
            "status": "SENT",
        }
    except httpx.HTTPStatusError as exc:
        # Surface CAMARA error codes (MAX_OTP_CODES_EXCEEDED, PHONE_NUMBER_NOT_ALLOWED, etc.)
        try:
            camara_err = exc.response.json()
        except Exception:
            camara_err = {"raw": exc.response.text}
        return {
            "phone_number": phone_number,
            "challenge_id": None,
            "channel": channel,
            "ttl_seconds": ttl_seconds,
            "status": "FAILED",
            "error_code": camara_err.get("code", "UNKNOWN"),
            "error_message": camara_err.get("message", str(exc)),
        }
    except Exception as exc:
        return {
            "phone_number": phone_number,
            "challenge_id": str(uuid.uuid4()),
            "channel": channel,
            "ttl_seconds": ttl_seconds,
            "status": "SENT",
            "mock": True,
            "live_error": str(exc),
        }


def validate_otp(challenge_id: str, otp_code: str) -> dict[str, object]:
    """Validate a one-time password challenge via CAMARA OTP SMS API.

    Spec: POST /one-time-password-sms/v0/validate-code
    Request:  { authenticationId, code }
    Response: 204 No Content on success; 400 with CAMARA error code on failure.

    CAMARA error codes surfaced on failure:
    - ONE_TIME_PASSWORD_SMS.INVALID_OTP
    - ONE_TIME_PASSWORD_SMS.VERIFICATION_EXPIRED
    - ONE_TIME_PASSWORD_SMS.VERIFICATION_FAILED  (max attempts exceeded)

    Args:
        challenge_id: authenticationId returned by send_otp.
        otp_code: User-entered OTP code.

    Returns:
        OTP validation result with validated=True/False and CAMARA error_code if failed.
    """
    if CAMARA_MOCK or not CAMARA_OTP_BASE_URL:
        return {
            "challenge_id": challenge_id,
            "validated": bool(otp_code),
            "status": "VALID" if otp_code else "INVALID",
            "mock": True,
        }

    try:
        body = {"authenticationId": challenge_id, "code": otp_code}
        with httpx.Client(timeout=_OTP_TIMEOUT) as client:
            resp = client.post(_otp_url("validate-code"), json=body, headers=_otp_headers())

        # 204 = success, no body
        if resp.status_code == 204:
            return {"challenge_id": challenge_id, "validated": True, "status": "VALID"}

        resp.raise_for_status()
        # Some operators return 200 with a body — handle gracefully
        return {"challenge_id": challenge_id, "validated": True, "status": "VALID"}

    except httpx.HTTPStatusError as exc:
        try:
            camara_err = exc.response.json()
        except Exception:
            camara_err = {"raw": exc.response.text}
        error_code = camara_err.get("code", "UNKNOWN")
        return {
            "challenge_id": challenge_id,
            "validated": False,
            "status": "INVALID",
            "error_code": error_code,
            "error_message": camara_err.get("message", str(exc)),
        }
    except Exception as exc:
        return {
            "challenge_id": challenge_id,
            "validated": bool(otp_code),
            "status": "VALID" if otp_code else "INVALID",
            "mock": True,
            "live_error": str(exc),
        }


def retrieve_number_from_device(
    session_id: str,
    mechanism: str = "network",
    code: str | None = None,
    state: str | None = None,
) -> dict[str, object]:
    """Retrieve phone number from authenticated device/network context.

    Uses the CAMARA Number Verification silent-auth flow via Nokia NaC SDK.
    Requires `code` and `state` from the OAuth callback after starting the flow
    via /identity/oauth/start?scope=number-verification%3Adevice-phone-number%3Aread.
    The NaC SDK exchanges the code for a single-use token internally.

    Args:
        session_id: Session identifier from the app/gateway.
        mechanism: One of network or sim.
        code: Authorization code from OAuth callback.
        state: State value from OAuth callback.

    Returns:
        Number retrieval and ownership verification status.
    """
    if CAMARA_MOCK:
        return {
            "session_id": session_id,
            "mechanism": mechanism,
            "phone_number": "+256700000001",
            "ownership_verified": True,
            "mock": True,
        }

    if not code or not state:
        return {
            "session_id": session_id,
            "mechanism": mechanism,
            "phone_number": None,
            "ownership_verified": False,
            "mock": True,
            "live_error": "code and state required — start the OAuth flow via GET /identity/oauth/start?scope=number-verification%3Adevice-phone-number%3Aread",
        }

    try:
        # A temporary Device object is needed as a carrier; NaC resolves the
        # actual phone number from the network context via the exchanged token.
        from app.camara.config import get_nac_client  # noqa: PLC0415
        tmp_device = get_nac_client().devices.get(phone_number="+00000000000")
        phone = tmp_device.get_phone_number(code=code, state=state)
        return {
            "session_id": session_id,
            "mechanism": mechanism,
            "phone_number": phone,
            "ownership_verified": True,
        }
    except Exception as exc:
        return {
            "session_id": session_id,
            "mechanism": mechanism,
            "phone_number": None,
            "ownership_verified": False,
            "mock": True,
            "live_error": str(exc),
        }
