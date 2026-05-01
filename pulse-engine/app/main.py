"""FastAPI application for Raphael Pulse decision orchestration."""

import secrets

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from app.camara import click_to_dial, congestion, connectivity_insights, device, geofencing, identity, location, qod, qos, qos_booking_assignment, qos_provisioning, region
from app.camara.config import (
    CAMARA_NUMBER_DEVICE_PHONE_SCOPE,
    CAMARA_NUMBER_VERIFICATION_SCOPE,
    CAMARA_REDIRECT_URI,
    get_nac_client,
)
from app.camara.http_client import exchange_auth_code_for_token
from app.services.decision_engine import (
    choose_communication_mode,
    emergency_actions,
    should_request_qod,
)

load_dotenv()


class CaseInput(BaseModel):
    """Incoming case payload from gateway."""

    patient_id: str = Field(min_length=1)
    symptoms: list[str] = Field(default_factory=list)
    urgency: str = Field(default="normal")
    network_quality: str = Field(default="fair")
    device_reachable: bool = Field(default=True)
    location: str = Field(default="unknown")


class NumberVerificationInput(BaseModel):
    """Payload for number ownership verification via CAMARA silent-auth.

    Obtain `code` and `state` by directing the user's mobile browser through
    GET /identity/oauth/start?phone_number=...&scope=number-verification%3Averify
    and capturing the callback query parameters.
    """

    phone_number: str = Field(min_length=1)
    code: str | None = None
    state: str | None = None


class DevicePhoneNumberInput(BaseModel):
    """Payload for retrieving phone number via CAMARA silent-auth.

    Obtain `code` and `state` from GET /identity/oauth/start with
    scope=number-verification%3Adevice-phone-number%3Aread.
    """

    session_id: str = Field(default="session")
    mechanism: str = Field(default="network")
    code: str | None = None
    state: str | None = None


class OtpSendInput(BaseModel):
    """Payload for OTP dispatch."""

    phone_number: str = Field(min_length=1)
    ttl_seconds: int = Field(default=300, ge=30, le=1800)


class OtpValidateInput(BaseModel):
    """Payload for OTP challenge validation."""

    challenge_id: str = Field(min_length=1)
    otp_code: str = Field(min_length=1)


class LocationVerifyInput(BaseModel):
    """Payload for location verification against a circular area."""

    phone_number: str = Field(min_length=1)
    location_hint: str = Field(default="unknown")
    center_latitude: float | None = None
    center_longitude: float | None = None
    radius_meters: float = Field(default=120.0, gt=0)
    max_age_seconds: int = Field(default=120, gt=0)


class LocationRetrieveInput(BaseModel):
    """Payload for CAMARA Location Retrieval (vwip spec)."""

    phone_number: str = Field(min_length=1)
    max_age: int | None = Field(
        default=None,
        ge=0,
        description="Max acceptable age of location data in seconds. 0 = fresh read. Omit for any age.",
    )
    max_surface: int | None = Field(
        default=None,
        ge=1,
        description="Max acceptable area surface in square meters. Omit for any size.",
    )


class RegionDeviceCountInput(BaseModel):
    """Payload for CAMARA Region Device Count /count."""

    area: dict[str, object]
    starttime: str | None = None
    endtime: str | None = None
    filter: dict[str, object] | None = None
    sink: str | None = None
    sinkCredential: dict[str, object] | None = None


class ClickToDialPartyInput(BaseModel):
    """Party object for Click-to-Dial caller/callee."""

    number: str = Field(min_length=1)


class ClickToDialCreateInput(BaseModel):
    """Payload for creating a Click-to-Dial call."""

    caller: ClickToDialPartyInput
    callee: ClickToDialPartyInput
    sink: str | None = None
    sinkCredential: dict[str, object] | None = None
    recordingEnabled: bool = False


class ConnectivityInsightsInput(BaseModel):
    """Payload for CAMARA Connectivity Insights check-network-quality."""

    applicationProfileId: str
    device: dict[str, object] | None = None
    applicationServer: dict[str, object] | None = None
    applicationServerPorts: dict[str, object] | None = None
    monitoringTimeStamp: str | None = None


class QosBookingInput(BaseModel):
    """Payload for creating a QoS booking."""

    numDevices: int | None = Field(default=1, ge=1)
    qosProfile: str
    startTime: str
    duration: int = Field(ge=1)
    serviceArea: dict[str, object]
    sink: str | None = None
    sinkCredential: dict[str, object] | None = None


class DeviceAssignmentInput(BaseModel):
    """Payload for assigning/releasing devices from a booking."""

    devices: list[dict[str, object]] | None = None
    sink: str | None = None
    sinkCredential: dict[str, object] | None = None


class RetrieveBookingByDeviceInput(BaseModel):
    """Payload for retrieving bookings associated with one device."""

    device: dict[str, object] | None = None


class QosProfilesRetrieveInput(BaseModel):
    """Payload for CAMARA retrieve-qos-profiles."""

    device: dict[str, object] | None = None
    name: str | None = None
    status: str | None = None


class CreateQosAssignmentInput(BaseModel):
    """Payload for CAMARA QoS Provisioning create assignment."""

    device: dict[str, object] | None = None
    qosProfile: str
    sink: str | None = None
    sinkCredential: dict[str, object] | None = None


class RetrieveQosAssignmentByDeviceInput(BaseModel):
    """Payload for CAMARA retrieve-qos-assignment."""

    device: dict[str, object] | None = None


class CreateQodSessionInput(BaseModel):
    """Payload for CAMARA Quality-On-Demand create session."""

    device: dict[str, object] | None = None
    applicationServer: dict[str, object]
    devicePorts: dict[str, object] | None = None
    applicationServerPorts: dict[str, object] | None = None
    qosProfile: str
    duration: int = Field(ge=1)
    sink: str | None = None
    sinkCredential: dict[str, object] | None = None


class ExtendQodSessionInput(BaseModel):
    """Payload for CAMARA /sessions/{sessionId}/extend."""

    requestedAdditionalDuration: int = Field(ge=1)


class RetrieveQodSessionsInput(BaseModel):
    """Payload for CAMARA /retrieve-sessions."""

    device: dict[str, object] | None = None


app = FastAPI(title="Raphael Pulse", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness endpoint."""
    return {"status": "ok", "service": "raphael-pulse"}


@app.post("/identity/verify-number")
def verify_number(input_data: NumberVerificationInput) -> dict[str, object]:
    """Verify number ownership using the CAMARA silent-auth code+state flow.

    Provide `code` and `state` obtained from the OAuth callback after calling
    GET /identity/oauth/start?phone_number=...&scope=number-verification%3Averify.
    The NaC SDK exchanges the code for a single-use token internally.
    """
    return identity.verify_number(
        phone_number=input_data.phone_number,
        code=input_data.code,
        state=input_data.state,
    )


@app.post("/identity/device-phone-number")
def device_phone_number(input_data: DevicePhoneNumberInput) -> dict[str, object]:
    """Retrieve the device phone number via CAMARA silent-auth code+state flow.

    Provide `code` and `state` obtained from the OAuth callback after calling
    GET /identity/oauth/start?scope=number-verification%3Adevice-phone-number%3Aread.
    """
    return identity.retrieve_number_from_device(
        session_id=input_data.session_id,
        mechanism=input_data.mechanism,
        code=input_data.code,
        state=input_data.state,
    )


@app.get("/identity/oauth/endpoints")
def oauth_endpoints() -> dict[str, object]:
    """Expose discovered authorization/token endpoints for Number Verification flow."""
    try:
        nac = get_nac_client()
        endpoints = nac.authorization.auth_endpoints()
        return {
            "authorization_endpoint": endpoints.authorization_endpoint,
            "token_endpoint": endpoints.token_endpoint,
            "fast_flow_csp_auth_endpoint": endpoints.fast_flow_csp_auth_endpoint,
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"OAuth endpoint discovery failed: {exc}") from exc


@app.get("/identity/oauth/start")
def oauth_start(
    phone_number: str,
    redirect_uri: str | None = None,
    state: str | None = None,
    scope: str | None = None,
) -> dict[str, str]:
    """Create the CAMARA Number Verification silent-auth consent URL.

    The user's device MUST open this URL while connected to mobile data
    (not Wi-Fi) for network-based silent authentication to work.
    `prompt=none` is enforced per the CAMARA spec — no user interaction occurs.

    Query params:
    - phone_number: E.164 number to hint to the auth server.
    - redirect_uri: Where to receive `code` and `state` after auth.
    - state: Optional CSRF token; auto-generated if omitted.
    - scope: `number-verification:verify` (default) or
             `number-verification:device-phone-number:read`.
    """
    try:
        nac = get_nac_client()
        effective_redirect = redirect_uri or CAMARA_REDIRECT_URI
        effective_state = state or secrets.token_urlsafe(16)
        effective_scope = scope or CAMARA_NUMBER_VERIFICATION_SCOPE

        # Use NaC SDK to build the authorization URL (resolves fast_flow_csp endpoint).
        authorize_url = nac.authorization.create_authorization_link(
            redirect_uri=effective_redirect,
            scope=effective_scope,
            login_hint=phone_number,
            state=effective_state,
        )

        # CAMARA spec requires prompt=none — SDK doesn’t add it, so append manually.
        separator = "&" if "?" in authorize_url else "?"
        authorize_url = f"{authorize_url}{separator}prompt=none"

        return {
            "authorize_url": authorize_url,
            "state": effective_state,
            "redirect_uri": effective_redirect,
            "scope": effective_scope,
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"OAuth start failed: {exc}") from exc


@app.get("/identity/oauth/callback")
def oauth_callback(code: str, state: str | None = None, redirect_uri: str | None = None) -> dict[str, object]:
    """Exchange the callback code for a bearer token."""
    try:
        token_data = exchange_auth_code_for_token(code, redirect_uri or CAMARA_REDIRECT_URI)
        return {
            "state": state or "",
            "token_type": token_data.get("token_type", "Bearer"),
            "expires_in": token_data.get("expires_in"),
            "access_token": token_data.get("access_token", ""),
        }
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"OAuth callback token exchange failed: {exc}") from exc


@app.post("/identity/otp/send")
def send_otp(input_data: OtpSendInput) -> dict[str, object]:
    """Direct endpoint to send an OTP challenge."""
    return identity.send_otp(
        phone_number=input_data.phone_number,
        ttl_seconds=input_data.ttl_seconds,
    )


@app.post("/identity/otp/validate")
def validate_otp(input_data: OtpValidateInput):
    """Validate an OTP challenge.

    Returns HTTP 204 (no body) on success, matching the CAMARA spec.
    Returns 200 with error details when in mock mode or if validation fails.
    """
    from fastapi.responses import Response  # noqa: PLC0415

    result = identity.validate_otp(
        challenge_id=input_data.challenge_id,
        otp_code=input_data.otp_code,
    )
    # CAMARA spec: 204 No Content on success, but only suppress body for live validated calls.
    if result.get("validated") and not result.get("mock"):
        return Response(status_code=204)
    # Mock mode or failure — return body for debuggability
    return result


@app.post("/location/retrieve")
def retrieve_location(input_data: LocationRetrieveInput) -> dict[str, object]:
    """Retrieve network-derived device location.

    Returns a CAMARA Location Retrieval-spec response:
    ``{lastLocationTime, area: {areaType, center, radius}}``.

    - `max_age`: Maximum acceptable age of location in seconds (0 = fresh).
    - `max_surface`: Maximum acceptable area surface in square meters.
    """
    result = location.get_location(
        phone_number=input_data.phone_number,
        max_age=input_data.max_age,
        max_surface=input_data.max_surface,
    )
    if "error" in result:
        raise HTTPException(status_code=422, detail={"code": result["error"], "message": result["message"]})
    return result


@app.post("/location/verify")
def verify_location(input_data: LocationVerifyInput) -> dict[str, object]:
    """Direct endpoint to verify if a device is inside a target area."""
    latitude = input_data.center_latitude
    longitude = input_data.center_longitude

    if latitude is None or longitude is None:
        inferred = location.get_location(
            phone_number=input_data.phone_number,
            hint=input_data.location_hint,
        )
        inferred_coords = inferred.get("location", {})
        latitude = float(inferred_coords.get("latitude", 0.0))
        longitude = float(inferred_coords.get("longitude", 0.0))

    if latitude == 0.0 and longitude == 0.0 and input_data.location_hint == "unknown":
        raise HTTPException(status_code=422, detail="Provide coordinates or a known location_hint")

    return location.verify_location(
        phone_number=input_data.phone_number,
        center_latitude=latitude,
        center_longitude=longitude,
        radius_meters=input_data.radius_meters,
        max_age_seconds=input_data.max_age_seconds,
    )


@app.post("/region-device-count/count")
def region_device_count(input_data: RegionDeviceCountInput) -> dict[str, object]:
    """Return count of devices for a circle/polygon area in an optional time interval.

    Mirrors CAMARA Region Device Count vwip `/count` request and response shapes.
    """
    payload = input_data.model_dump(exclude_none=True)
    result = region.count_devices(payload)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 400)),
            detail={
                "code": err.get("code", "INVALID_ARGUMENT"),
                "message": err.get("message", "Request could not be processed."),
            },
        )
    return result


@app.post("/check-network-quality")
def check_network_quality(input_data: ConnectivityInsightsInput) -> dict[str, object]:
    """Check network confidence in meeting app profile quality requirements.

    Implements CAMARA Connectivity Insights POST /check-network-quality.
    """
    payload = input_data.model_dump(exclude_none=True)
    result = connectivity_insights.check_network_quality(payload)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 400)),
            detail={
                "code": err.get("code", "INVALID_ARGUMENT"),
                "message": err.get("message", "Request could not be processed."),
            },
        )
    return result


@app.post("/retrieve-qos-profiles")
def retrieve_qos_profiles(
    input_data: QosProfilesRetrieveInput,
    x_subject_from_token: str | None = Header(default=None),
) -> list[dict[str, object]]:
    """Retrieve QoS profiles, optionally filtered by device, name, and status."""
    payload = input_data.model_dump(exclude_none=True)
    token_device_identified = str(x_subject_from_token).lower() in {"1", "true", "yes"}
    result = qos.retrieve_qos_profiles(payload, token_device_identified=token_device_identified)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 400)),
            detail={
                "code": err.get("code", "INVALID_ARGUMENT"),
                "message": err.get("message", "Request could not be processed."),
            },
        )
    return result.get("items", [])


@app.get("/qos-profiles/{name}")
def get_qos_profile(name: str) -> dict[str, object]:
    """Get one QoS profile by name."""
    result = qos.get_qos_profile(name)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 404)),
            detail={
                "code": err.get("code", "NOT_FOUND"),
                "message": err.get("message", "The specified resource is not found."),
            },
        )
    return result.get("item", {})


@app.post("/qos-assignments")
def create_qos_assignment(
    input_data: CreateQosAssignmentInput,
    x_subject_from_token: str | None = Header(default=None),
):
    """Assign a QoS profile to a device indefinitely."""
    from fastapi.responses import JSONResponse  # noqa: PLC0415

    payload = input_data.model_dump(exclude_none=True)
    token_device_identified = str(x_subject_from_token).lower() in {"1", "true", "yes"}
    result = qos_provisioning.create_qos_assignment(
        payload,
        token_device_identified=token_device_identified,
    )
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 400)),
            detail={
                "code": err.get("code", "INVALID_ARGUMENT"),
                "message": err.get("message", "Request could not be processed."),
            },
        )
    status_code = int(result.pop("_http_status", 201))
    return JSONResponse(status_code=status_code, content=result.get("item", {}))


@app.get("/qos-assignments/{assignment_id}")
def get_qos_assignment_by_id(assignment_id: str) -> dict[str, object]:
    """Get assignment details by assignmentId."""
    result = qos_provisioning.get_qos_assignment_by_id(assignment_id)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 404)),
            detail={
                "code": err.get("code", "NOT_FOUND"),
                "message": err.get("message", "The specified resource is not found."),
            },
        )
    return result.get("item", {})


@app.post("/retrieve-qos-assignment")
def retrieve_qos_assignment_by_device(
    input_data: RetrieveQosAssignmentByDeviceInput,
    x_subject_from_token: str | None = Header(default=None),
) -> dict[str, object]:
    """Get assignment details for a given device."""
    payload = input_data.model_dump(exclude_none=True)
    token_device_identified = str(x_subject_from_token).lower() in {"1", "true", "yes"}
    result = qos_provisioning.retrieve_qos_assignment_by_device(
        payload,
        token_device_identified=token_device_identified,
    )
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 404)),
            detail={
                "code": err.get("code", "NOT_FOUND"),
                "message": err.get("message", "The specified resource is not found."),
            },
        )
    return result.get("item", {})


@app.delete("/qos-assignments/{assignment_id}")
def revoke_qos_assignment(assignment_id: str):
    """Revoke assignment by assignmentId."""
    from fastapi.responses import JSONResponse, Response  # noqa: PLC0415

    result = qos_provisioning.revoke_qos_assignment(assignment_id)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 404)),
            detail={
                "code": err.get("code", "NOT_FOUND"),
                "message": err.get("message", "The specified resource is not found."),
            },
        )

    status_code = int(result.get("_http_status", 204))
    if status_code == 202:
        return JSONResponse(status_code=202, content=result.get("item", {}))
    return Response(status_code=204)


@app.post("/sessions")
def create_qod_session(input_data: CreateQodSessionInput):
    """Create a QoD session for prioritized traffic handling."""
    from fastapi.responses import JSONResponse  # noqa: PLC0415

    payload = input_data.model_dump(exclude_none=True)
    result = qod.create_session(payload)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 400)),
            detail={
                "code": err.get("code", "INVALID_ARGUMENT"),
                "message": err.get("message", "Request could not be processed."),
            },
        )
    return JSONResponse(status_code=int(result.get("_http_status", 201)), content=result.get("item", {}))


@app.get("/sessions/{session_id}")
def get_qod_session(session_id: str) -> dict[str, object]:
    """Get a QoD session by sessionId."""
    result = qod.get_session(session_id)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 404)),
            detail={
                "code": err.get("code", "NOT_FOUND"),
                "message": err.get("message", "The specified resource is not found."),
            },
        )
    return result.get("item", {})


@app.delete("/sessions/{session_id}")
def delete_qod_session(session_id: str):
    """Delete a QoD session by sessionId."""
    from fastapi.responses import Response  # noqa: PLC0415

    result = qod.delete_session(session_id)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 404)),
            detail={
                "code": err.get("code", "NOT_FOUND"),
                "message": err.get("message", "The specified resource is not found."),
            },
        )
    return Response(status_code=204)


@app.post("/sessions/{session_id}/extend")
def extend_qod_session(session_id: str, input_data: ExtendQodSessionInput) -> dict[str, object]:
    """Extend an active QoD session duration."""
    payload = input_data.model_dump(exclude_none=True)
    result = qod.extend_session(session_id, payload)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 400)),
            detail={
                "code": err.get("code", "INVALID_ARGUMENT"),
                "message": err.get("message", "Request could not be processed."),
            },
        )
    return result.get("item", {})


@app.post("/retrieve-sessions")
def retrieve_qod_sessions(input_data: RetrieveQodSessionsInput) -> list[dict[str, object]]:
    """Retrieve QoD sessions associated with a device."""
    payload = input_data.model_dump(exclude_none=True)
    result = qod.retrieve_sessions(payload)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 400)),
            detail={
                "code": err.get("code", "INVALID_ARGUMENT"),
                "message": err.get("message", "Request could not be processed."),
            },
        )
    return result.get("items", [])


@app.post("/qos-bookings")
def create_qos_booking(input_data: QosBookingInput):
    """Reserve QoS booking in advance for a service area and time slot."""
    from fastapi.responses import JSONResponse  # noqa: PLC0415

    payload = input_data.model_dump(exclude_none=True)
    result = qos_booking_assignment.create_booking(payload)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 400)),
            detail={
                "code": err.get("code", "INVALID_ARGUMENT"),
                "message": err.get("message", "Request could not be processed."),
            },
        )
    status_code = int(result.pop("_http_status", 201))
    return JSONResponse(status_code=status_code, content=result)


@app.get("/qos-bookings/{booking_id}")
def get_qos_booking(booking_id: str) -> dict[str, object]:
    """Retrieve QoS booking details by bookingId."""
    result = qos_booking_assignment.get_booking(booking_id)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 404)),
            detail={
                "code": err.get("code", "NOT_FOUND"),
                "message": err.get("message", "The specified resource is not found."),
            },
        )
    result.pop("_http_status", None)
    return result


@app.delete("/qos-bookings/{booking_id}")
def delete_qos_booking(booking_id: str):
    """Cancel an existing QoS booking and release associated resources."""
    from fastapi.responses import JSONResponse  # noqa: PLC0415

    result = qos_booking_assignment.delete_booking(booking_id)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 404)),
            detail={
                "code": err.get("code", "NOT_FOUND"),
                "message": err.get("message", "The specified resource is not found."),
            },
        )
    status_code = int(result.pop("_http_status", 200))
    return JSONResponse(status_code=status_code, content=result)


@app.post("/qos-bookings/{booking_id}/devices/assign")
def assign_qos_booking_devices(booking_id: str, input_data: DeviceAssignmentInput):
    """Assign one or more devices to an existing QoS booking."""
    from fastapi.responses import JSONResponse  # noqa: PLC0415

    payload = input_data.model_dump(exclude_none=True)
    result = qos_booking_assignment.assign_devices(booking_id, payload)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 400)),
            detail={
                "code": err.get("code", "INVALID_ARGUMENT"),
                "message": err.get("message", "Request could not be processed."),
            },
        )
    status_code = int(result.pop("_http_status", 201))
    return JSONResponse(status_code=status_code, content=result)


@app.get("/qos-bookings/{booking_id}/devices")
def get_qos_booking_devices(booking_id: str) -> dict[str, object]:
    """Get the list of devices currently assigned to a QoS booking."""
    result = qos_booking_assignment.get_assigned_devices(booking_id)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 404)),
            detail={
                "code": err.get("code", "NOT_FOUND"),
                "message": err.get("message", "The specified resource is not found."),
            },
        )
    result.pop("_http_status", None)
    return result


@app.post("/qos-bookings/{booking_id}/devices/release")
def release_qos_booking_devices(booking_id: str, input_data: DeviceAssignmentInput):
    """Release one or more devices from a QoS booking."""
    from fastapi.responses import JSONResponse  # noqa: PLC0415

    payload = input_data.model_dump(exclude_none=True)
    result = qos_booking_assignment.release_devices(booking_id, payload)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 400)),
            detail={
                "code": err.get("code", "INVALID_ARGUMENT"),
                "message": err.get("message", "Request could not be processed."),
            },
        )
    status_code = int(result.pop("_http_status", 200))
    return JSONResponse(status_code=status_code, content=result)


@app.post("/qos-bookings/retrieve")
def retrieve_qos_bookings_by_device(input_data: RetrieveBookingByDeviceInput) -> list[dict[str, object]]:
    """Retrieve all bookings associated with one device."""
    payload = input_data.model_dump(exclude_none=True)
    result = qos_booking_assignment.retrieve_bookings_by_device(payload)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 400)),
            detail={
                "code": err.get("code", "INVALID_ARGUMENT"),
                "message": err.get("message", "Request could not be processed."),
            },
        )
    return result.get("items", [])


@app.post("/calls", status_code=201)
def create_click_to_dial_call(input_data: ClickToDialCreateInput) -> dict[str, object]:
    """Create a new Click-to-Dial call session (CAMARA POST /calls)."""
    payload = input_data.model_dump(exclude_none=True)
    result = click_to_dial.create_call(payload)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 400)),
            detail={
                "code": err.get("code", "INVALID_ARGUMENT"),
                "message": err.get("message", "Request could not be processed."),
            },
        )
    return result


@app.get("/calls/{call_id}")
def get_click_to_dial_call(call_id: str) -> dict[str, object]:
    """Get call details (CAMARA GET /calls/{callId})."""
    result = click_to_dial.get_call(call_id)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 404)),
            detail={
                "code": err.get("code", "NOT_FOUND"),
                "message": err.get("message", "The specified resource is not found."),
            },
        )
    return result


@app.delete("/calls/{call_id}", status_code=204)
def terminate_click_to_dial_call(call_id: str):
    """Terminate an active call (CAMARA DELETE /calls/{callId})."""
    from fastapi.responses import Response  # noqa: PLC0415

    result = click_to_dial.terminate_call(call_id)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 400)),
            detail={
                "code": err.get("code", "INVALID_ARGUMENT"),
                "message": err.get("message", "Request could not be processed."),
            },
        )
    return Response(status_code=204)


@app.get("/calls/{call_id}/recording")
def get_click_to_dial_recording(call_id: str) -> dict[str, object]:
    """Retrieve call recording (CAMARA GET /calls/{callId}/recording)."""
    result = click_to_dial.get_recording(call_id)
    if "error" in result:
        err = result["error"]
        raise HTTPException(
            status_code=int(err.get("status", 404)),
            detail={
                "code": err.get("code", "NOT_FOUND"),
                "message": err.get("message", "The specified resource is not found."),
            },
        )
    return result


# ---------------------------------------------------------------------------
# Geofencing Subscriptions  (CAMARA geofencing-subscriptions vwip)
# ---------------------------------------------------------------------------

class GeofencingSubscribeInput(BaseModel):
    """Payload for creating a geofencing subscription."""

    phone_number: str = Field(min_length=1)
    sink: str = Field(
        min_length=8,
        description="HTTPS callback URL where CloudEvent notifications will be POSTed.",
    )
    types: list[str] = Field(
        min_length=1,
        max_length=1,
        description=(
            "One event type: "
            "'org.camaraproject.geofencing-subscriptions.v0.area-entered' or "
            "'org.camaraproject.geofencing-subscriptions.v0.area-left'."
        ),
    )
    center_latitude: float = Field(ge=-90, le=90)
    center_longitude: float = Field(ge=-180, le=180)
    radius: float = Field(gt=0, description="Circle radius in meters (minimum 1).")
    subscription_expire_time: str | None = Field(
        default=None,
        description="ISO-8601 datetime at which the subscription expires.",
    )
    subscription_max_events: int | None = Field(default=None, ge=1)
    initial_event: bool | None = None


@app.post("/geofencing/subscriptions", status_code=201)
def create_geofencing_subscription(input_data: GeofencingSubscribeInput) -> dict[str, object]:
    """Create a geofencing subscription for area-entered or area-left events.

    The subscriber receives CloudEvent notifications via POST to `sink` whenever
    the device enters or leaves the specified circular area.
    """
    result = geofencing.create_subscription(
        phone_number=input_data.phone_number,
        sink=input_data.sink,
        event_types=input_data.types,
        center_latitude=input_data.center_latitude,
        center_longitude=input_data.center_longitude,
        radius=input_data.radius,
        subscription_expire_time=input_data.subscription_expire_time,
        subscription_max_events=input_data.subscription_max_events,
        initial_event=input_data.initial_event,
    )
    if "error" in result:
        status = 422 if result["error"] in (
            "GEOFENCING_SUBSCRIPTIONS.AREA_NOT_COVERED",
            "GEOFENCING_SUBSCRIPTIONS.INVALID_AREA",
        ) else 400
        raise HTTPException(status_code=status, detail={"code": result["error"], "message": result["message"]})
    return result


@app.get("/geofencing/subscriptions")
def list_geofencing_subscriptions() -> list[dict[str, object]]:
    """Retrieve all active geofencing subscriptions."""
    return geofencing.list_subscriptions()


@app.get("/geofencing/subscriptions/{subscription_id}")
def get_geofencing_subscription(subscription_id: str) -> dict[str, object]:
    """Retrieve a single geofencing subscription by ID."""
    result = geofencing.get_subscription(subscription_id)
    if result.get("error") == "NOT_FOUND":
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": result["message"]})
    if "error" in result:
        raise HTTPException(status_code=502, detail=result["message"])
    return result


@app.delete("/geofencing/subscriptions/{subscription_id}")
def delete_geofencing_subscription(subscription_id: str):
    """Delete a geofencing subscription.

    Returns HTTP 204 No Content on success, matching the CAMARA spec.
    """
    from fastapi.responses import Response  # noqa: PLC0415

    result = geofencing.delete_subscription(subscription_id)
    if result.get("error") == "NOT_FOUND":
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": result["message"]})
    if "error" in result:
        raise HTTPException(status_code=502, detail=result["message"])
    return Response(status_code=204)


@app.post("/decide")
def decide(case: CaseInput) -> dict[str, object]:
    """Build a decision plan using urgency, network, and CAMARA intelligence."""
    phone_ref = case.patient_id  # used as device identifier in CAMARA calls

    # --- CAMARA: Device reachability ---
    reachability = device.get_reachability(phone_ref)
    roaming_status = device.get_roaming_status(phone_ref)
    effective_reachable: bool = bool(reachability.get("reachable", case.device_reachable))

    # --- CAMARA: Number ownership / SIM trust ---
    number_verification = identity.verify_number(phone_ref)
    sim_swap_status = identity.check_sim_swap(phone_ref)

    # --- CAMARA: Congestion insights ---
    congestion_data = congestion.get_insights(case.location, case.network_quality, phone_number=phone_ref)

    communication_mode = choose_communication_mode(
        urgency=case.urgency,
        network_quality=case.network_quality,
        reachable=effective_reachable,
    )

    is_emergency = case.urgency == "emergency"
    needs_qod = should_request_qod(case.urgency, case.network_quality)

    response: dict[str, object] = {
        "patient_id": case.patient_id,
        "is_emergency": is_emergency,
        "communication_mode": communication_mode,
        "request_qod": needs_qod,
        "network_context": {
            "quality": case.network_quality,
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

    # --- CAMARA: Location + emergency actions ---
    if is_emergency:
        location_data = location.get_location(phone_ref, hint=case.location)
        payload_for_actions = {
            **case.model_dump(),
            "device_reachable": effective_reachable,
        }
        response["patient_location"] = location_data
        response["emergency_actions"] = emergency_actions(payload_for_actions)

    return response
