const PULSE_URL =
  process.env.NEXT_PUBLIC_PULSE_URL || "http://localhost:8001";
const GATEWAY_URL =
  process.env.NEXT_PUBLIC_GATEWAY_URL || "http://localhost:8000";
const REQUEST_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || 10000);

const TOKEN_KEY = "raphael.auth.token";

export function getAuthToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}
export function setAuthToken(token) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

async function call(url, method = "GET", body = null) {
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const opts = { method, headers, signal: controller.signal };
  if (body !== null) opts.body = JSON.stringify(body);
  let res;
  let text;
  try {
    res = await fetch(url, opts);
    text = await res.text();
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Request timed out after ${REQUEST_TIMEOUT_MS}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// --- Health ---
export const getGatewayHealth = () => call(`${GATEWAY_URL}/health`);
export const getPulseHealth = () => call(`${PULSE_URL}/health`);

// --- Triage ---
export const submitTriage = (payload) =>
  call(`${GATEWAY_URL}/cases`, "POST", payload);

// --- Device Reachability Status ---
export const retrieveReachabilityStatus = (phoneNumber) =>
  call(`${PULSE_URL}/retrieve`, "POST", {
    device: { phoneNumber },
  });

// --- Reachability Subscriptions ---
export const listSubscriptions = () => call(`${PULSE_URL}/subscriptions`);
export const createSubscription = (payload) =>
  call(`${PULSE_URL}/subscriptions`, "POST", payload);
export const getSubscription = (id) =>
  call(`${PULSE_URL}/subscriptions/${id}`);
export const deleteSubscription = (id) =>
  call(`${PULSE_URL}/subscriptions/${id}`, "DELETE");

// --- Location ---
export const verifyLocation = (payload) =>
  call(`${PULSE_URL}/location/verify`, "POST", payload);
export const retrieveLocation = (payload) =>
  call(`${PULSE_URL}/location/retrieve`, "POST", payload);

// --- Identity & OTP ---
export const sendOtp = (phone_number, ttl_seconds = 300) =>
  call(`${PULSE_URL}/identity/otp/send`, "POST", { phone_number, ttl_seconds });
export const validateOtp = (challenge_id, otp_code) =>
  call(`${PULSE_URL}/identity/otp/validate`, "POST", { challenge_id, otp_code });
export const verifyNumber = (phone_number) =>
  call(`${PULSE_URL}/identity/verify-number`, "POST", { phone_number });

// --- QoD Sessions ---
export const createQodSession = (payload) =>
  call(`${PULSE_URL}/sessions`, "POST", payload);
export const getQodSession = (id) => call(`${PULSE_URL}/sessions/${id}`);
export const deleteQodSession = (id) =>
  call(`${PULSE_URL}/sessions/${id}`, "DELETE");
export const extendQodSession = (id, duration) =>
  call(`${PULSE_URL}/sessions/${id}/extend`, "POST", {
    requestedAdditionalDuration: duration,
  });
export const retrieveQodSessions = (phoneNumber) =>
  call(`${PULSE_URL}/retrieve-sessions`, "POST",
    phoneNumber ? { device: { phoneNumber } } : {}
  );

// --- QoS Assignments ---
export const retrieveQosProfiles = (payload = {}) =>
  call(`${PULSE_URL}/retrieve-qos-profiles`, "POST", payload);
export const createQosAssignment = (payload) =>
  call(`${PULSE_URL}/qos-assignments`, "POST", payload);
export const getQosAssignment = (id) =>
  call(`${PULSE_URL}/qos-assignments/${id}`);
export const deleteQosAssignment = (id) =>
  call(`${PULSE_URL}/qos-assignments/${id}`, "DELETE");

// --- Device Identifier ---
export const retrieveIdentifier = (phoneNumber) =>
  call(`${PULSE_URL}/retrieve-identifier`, "POST", {
    device: { phoneNumber },
  });
export const retrieveType = (phoneNumber) =>
  call(`${PULSE_URL}/retrieve-type`, "POST", {
    device: { phoneNumber },
  });
export const retrievePpid = (phoneNumber) =>
  call(`${PULSE_URL}/retrieve-ppid`, "POST", {
    device: { phoneNumber },
  });
export const matchIdentifier = (phoneNumber, identifierType, identifierValue) =>
  call(`${PULSE_URL}/match-identifier`, "POST", {
    device: { phoneNumber },
    providedIdentifierType: identifierType,
    providedIdentifier: identifierValue,
  });

// --- Geofencing Subscriptions ---
export const listGeofencingSubscriptions = () =>
  call(`${PULSE_URL}/geofencing/subscriptions`);
export const createGeofencingSubscription = (payload) =>
  call(`${PULSE_URL}/geofencing/subscriptions`, "POST", payload);
export const getGeofencingSubscription = (id) =>
  call(`${PULSE_URL}/geofencing/subscriptions/${id}`);
export const deleteGeofencingSubscription = (id) =>
  call(`${PULSE_URL}/geofencing/subscriptions/${id}`, "DELETE");

// --- Click-to-Dial ---
export const createCall = (callerNumber, calleeNumber) =>
  call(`${PULSE_URL}/calls`, "POST", {
    caller: { number: callerNumber },
    callee: { number: calleeNumber },
  });
export const getCall = (id) => call(`${PULSE_URL}/calls/${id}`);
export const terminateCall = (id) => call(`${PULSE_URL}/calls/${id}`, "DELETE");

// ---------------------------------------------------------------------------
// Hospital ops & emergency coordination (backend-laravel /api/*)
// ---------------------------------------------------------------------------

// Auth
export const login = (payload) =>
  call(`${GATEWAY_URL}/api/auth/login`, "POST", payload);
export const registerAccount = (payload) =>
  call(`${GATEWAY_URL}/api/auth/register`, "POST", payload);
export const logout = () =>
  call(`${GATEWAY_URL}/api/auth/logout`, "POST");
export const fetchMe = () => call(`${GATEWAY_URL}/api/me`);

// Patients
export const listPatients = () => call(`${GATEWAY_URL}/api/patients`);
export const searchPatients = (query) =>
  call(`${GATEWAY_URL}/api/patients/search?query=${encodeURIComponent(query || "")}`);
export const getPatient = (id) => call(`${GATEWAY_URL}/api/patients/${id}`);
export const createPatient = (payload) =>
  call(`${GATEWAY_URL}/api/patients`, "POST", payload);
export const updatePatient = (id, payload) =>
  call(`${GATEWAY_URL}/api/patients/${id}`, "PATCH", payload);
export const recordPatientVitals = (id, vitals) =>
  call(`${GATEWAY_URL}/api/patients/${id}/vitals`, "POST", vitals);
export const listPatientVitals = (id) =>
  call(`${GATEWAY_URL}/api/patients/${id}/vitals`);

// Emergencies
export const listEmergencies = () =>
  call(`${GATEWAY_URL}/api/emergencies`);
export const getEmergency = (id) =>
  call(`${GATEWAY_URL}/api/emergencies/${id}`);
export const createEmergency = (payload) =>
  call(`${GATEWAY_URL}/api/emergencies`, "POST", payload);
export const updateEmergency = (id, payload) =>
  call(`${GATEWAY_URL}/api/emergencies/${id}`, "PATCH", payload);
export const acceptEmergency = (id) =>
  call(`${GATEWAY_URL}/api/emergencies/${id}/accept`, "POST");
export const resolveEmergency = (id, note) =>
  call(`${GATEWAY_URL}/api/emergencies/${id}/resolve`, "POST", { note });
export const escalateEmergency = (id, reason) =>
  call(`${GATEWAY_URL}/api/emergencies/${id}/escalate`, "POST", { reason });

// Queue
export const listQueue = () => call(`${GATEWAY_URL}/api/queue`);
export const addToQueue = (payload) =>
  call(`${GATEWAY_URL}/api/queue`, "POST", payload);
export const assignQueueEntry = (id, doctor_id) =>
  call(`${GATEWAY_URL}/api/queue/${id}/assign`, "POST", { doctor_id });
export const removeFromQueue = (id) =>
  call(`${GATEWAY_URL}/api/queue/${id}`, "DELETE");

// Consultations
export const listConsultations = () =>
  call(`${GATEWAY_URL}/api/consultations`);

// Hospitals
export const listHospitals = () => call(`${GATEWAY_URL}/api/hospitals`);
export const getHospital = (id) => call(`${GATEWAY_URL}/api/hospitals/${id}`);
