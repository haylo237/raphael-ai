"""CAMARA API configuration and feature flags.

Set CAMARA_MOCK=false (and provide credentials) to switch from mock to live calls.
"""

import os
from functools import lru_cache

from dotenv import load_dotenv

load_dotenv()

CAMARA_MOCK: bool = os.getenv("CAMARA_MOCK", "true").lower() != "false"
CAMARA_BASE_URL: str = os.getenv("CAMARA_BASE_URL", "")
CAMARA_CLIENT_ID: str = os.getenv("CAMARA_CLIENT_ID", "")
CAMARA_CLIENT_SECRET: str = os.getenv("CAMARA_CLIENT_SECRET", "")
CAMARA_REDIRECT_URI: str = os.getenv("CAMARA_REDIRECT_URI", "http://localhost:8001/identity/oauth/callback")
CAMARA_NUMBER_VERIFICATION_SCOPE: str = os.getenv(
	"CAMARA_NUMBER_VERIFICATION_SCOPE",
	"dpv:FraudPreventionAndDetection number-verification:verify",
)
CAMARA_NUMBER_DEVICE_PHONE_SCOPE: str = os.getenv(
	"CAMARA_NUMBER_DEVICE_PHONE_SCOPE",
	"dpv:FraudPreventionAndDetection number-verification:device-phone-number:read",
)
NOKIA_NAC_API_KEY: str = os.getenv("NOKIA_NAC_API_KEY", "")
NOKIA_NAC_RAPIDAPI_HOST: str = os.getenv("NOKIA_NAC_RAPIDAPI_HOST", "network-as-code.nokia.rapidapi.com")

# Operator CAMARA OTP SMS endpoint (not available via Nokia NaC).
# Set to the operator's own CAMARA API root, e.g. https://api.operator.com
# The adapter appends /one-time-password-sms/v0/send-code etc.
CAMARA_OTP_BASE_URL: str = os.getenv("CAMARA_OTP_BASE_URL", "")
CAMARA_OTP_CLIENT_ID: str = os.getenv("CAMARA_OTP_CLIENT_ID", "")
CAMARA_OTP_CLIENT_SECRET: str = os.getenv("CAMARA_OTP_CLIENT_SECRET", "")

# Operator CAMARA Region Device Count endpoint (not available via Nokia NaC SDK).
CAMARA_REGION_DEVICE_COUNT_BASE_URL: str = os.getenv("CAMARA_REGION_DEVICE_COUNT_BASE_URL", "")
CAMARA_REGION_DEVICE_COUNT_CLIENT_ID: str = os.getenv("CAMARA_REGION_DEVICE_COUNT_CLIENT_ID", "")
CAMARA_REGION_DEVICE_COUNT_CLIENT_SECRET: str = os.getenv("CAMARA_REGION_DEVICE_COUNT_CLIENT_SECRET", "")

# Operator CAMARA Click-to-Dial endpoint (not exposed in Nokia NaC SDK).
CAMARA_CLICK_TO_DIAL_BASE_URL: str = os.getenv("CAMARA_CLICK_TO_DIAL_BASE_URL", "")
CAMARA_CLICK_TO_DIAL_CLIENT_ID: str = os.getenv("CAMARA_CLICK_TO_DIAL_CLIENT_ID", "")
CAMARA_CLICK_TO_DIAL_CLIENT_SECRET: str = os.getenv("CAMARA_CLICK_TO_DIAL_CLIENT_SECRET", "")

# Operator CAMARA Connectivity Insights endpoint (not exposed via Nokia NaC passthrough).
CAMARA_CONNECTIVITY_INSIGHTS_BASE_URL: str = os.getenv("CAMARA_CONNECTIVITY_INSIGHTS_BASE_URL", "")
CAMARA_CONNECTIVITY_INSIGHTS_CLIENT_ID: str = os.getenv("CAMARA_CONNECTIVITY_INSIGHTS_CLIENT_ID", "")
CAMARA_CONNECTIVITY_INSIGHTS_CLIENT_SECRET: str = os.getenv("CAMARA_CONNECTIVITY_INSIGHTS_CLIENT_SECRET", "")

# Operator CAMARA QoS Booking and Assignment endpoint (not exposed via Nokia NaC).
CAMARA_QOS_BOOKING_BASE_URL: str = os.getenv("CAMARA_QOS_BOOKING_BASE_URL", "")
CAMARA_QOS_BOOKING_CLIENT_ID: str = os.getenv("CAMARA_QOS_BOOKING_CLIENT_ID", "")
CAMARA_QOS_BOOKING_CLIENT_SECRET: str = os.getenv("CAMARA_QOS_BOOKING_CLIENT_SECRET", "")

# Operator CAMARA QoS Profiles endpoint (not exposed in Nokia NaC passthrough).
CAMARA_QOS_PROFILES_BASE_URL: str = os.getenv("CAMARA_QOS_PROFILES_BASE_URL", "")
CAMARA_QOS_PROFILES_CLIENT_ID: str = os.getenv("CAMARA_QOS_PROFILES_CLIENT_ID", "")
CAMARA_QOS_PROFILES_CLIENT_SECRET: str = os.getenv("CAMARA_QOS_PROFILES_CLIENT_SECRET", "")

# Operator CAMARA QoS Provisioning endpoint (not reliably exposed via Nokia NaC).
CAMARA_QOS_PROVISIONING_BASE_URL: str = os.getenv("CAMARA_QOS_PROVISIONING_BASE_URL", "")
CAMARA_QOS_PROVISIONING_CLIENT_ID: str = os.getenv("CAMARA_QOS_PROVISIONING_CLIENT_ID", "")
CAMARA_QOS_PROVISIONING_CLIENT_SECRET: str = os.getenv("CAMARA_QOS_PROVISIONING_CLIENT_SECRET", "")


@lru_cache(maxsize=1)
def get_nac_client():
    """Return a cached Nokia Network as Code SDK client."""
    import network_as_code as nac  # noqa: PLC0415
    return nac.NetworkAsCodeClient(token=NOKIA_NAC_API_KEY)


def nac_device(phone_number: str):
    """Return a NaC Device object for the given phone number."""
    return get_nac_client().devices.get(phone_number=phone_number)
