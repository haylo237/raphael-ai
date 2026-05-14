/**
 * API client for the Raphael Patient mobile app.
 *
 * Talks to:
 *   - pulse-engine /decide  (EXPO_PUBLIC_PULSE_URL, default http://localhost:8001)
 *   - backend-laravel /api/* (EXPO_PUBLIC_API_URL, default http://localhost:8000)
 */

const PULSE_DEFAULT = "http://localhost:8001";
const BACKEND_DEFAULT = "http://localhost:8000";

function pulseUrl(path) {
  const base = process.env.EXPO_PUBLIC_PULSE_URL || PULSE_DEFAULT;
  return `${base.replace(/\/$/, "")}${path}`;
}

function backendUrl(path) {
  const base = process.env.EXPO_PUBLIC_API_URL || BACKEND_DEFAULT;
  return `${base.replace(/\/$/, "")}${path}`;
}

async function json(method, url, payload) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  const token = await getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: payload ? JSON.stringify(payload) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status} ${text}`);
  }
  return res.json();
}

// --- Auth token (in-memory + AsyncStorage-compatible global) ---
let _token = null;
let _storage = null;
try {
  // Lazy require so module loads in any environment
  _storage = require("@react-native-async-storage/async-storage").default;
} catch {}
async function getAuthToken() {
  if (_token) return _token;
  if (_storage) _token = await _storage.getItem("raphael.token");
  return _token;
}
export async function setAuthToken(token) {
  _token = token || null;
  if (_storage) {
    if (token) await _storage.setItem("raphael.token", token);
    else await _storage.removeItem("raphael.token");
  }
}

export async function login({ phone, password }) {
  const res = await json("POST", backendUrl("/api/auth/login"), { phone, password });
  await setAuthToken(res.token);
  return res;
}
export async function registerPatient({ name, phone, password }) {
  const res = await json("POST", backendUrl("/api/auth/register"), { name, phone, password, role: "patient" });
  await setAuthToken(res.token);
  return res;
}
export async function fetchMe() {
  return json("GET", backendUrl("/api/me"));
}
export async function logout() {
  try { await json("POST", backendUrl("/api/auth/logout")); } catch {}
  await setAuthToken(null);
}

export async function decideCase(payload) {
  try {
    return await json("POST", pulseUrl("/decide"), payload);
  } catch (err) {
    return localDecideFallback(payload, err.message);
  }
}

function localDecideFallback(payload, reason) {
  const urgency = String(payload.urgency || "").toUpperCase();
  const isEmergency = urgency === "EMERGENCY";
  const network = String(payload.network_quality || "MODERATE").toUpperCase();
  const reachable = payload.device_reachable !== false;
  let mode = "CHAT";
  if (isEmergency) mode = "PRIORITY";
  else if (network === "GOOD") mode = "VIDEO";
  else if (network === "MODERATE" || network === "FAIR") mode = "AUDIO";
  const now = new Date().toISOString();
  return {
    patient_id: payload.patient_id,
    is_emergency: isEmergency,
    communication_mode: mode,
    decision: {
      mode,
      priority: isEmergency ? "HIGH" : "NORMAL",
      actions: isEmergency
        ? [
            "Retrieve location via CAMARA",
            "Route to nearest hospital",
            "Request QoD (priority network)",
            reachable ? "Initiate emergency communication" : "Trigger fallback alert (SMS)",
          ]
        : [`Use ${mode} communication`],
    },
    request_qod: isEmergency,
    explanation: [
      isEmergency ? "Emergency urgency detected" : "Routine urgency case",
      reachable ? "Patient reachable" : "Patient unreachable",
      `Network: ${network}`,
      `Communication mode: ${mode}`,
    ],
    timeline: [
      { event: "CASE_CREATED", timestamp: now },
      { event: "DECISION_COMPUTED", timestamp: now, detail: { mode } },
    ],
    assigned_hospital: isEmergency ? "Nearest Available Emergency Hospital" : undefined,
    offline: true,
    offline_reason: reason,
  };
}

export async function createEmergency(payload) {
  try {
    return await json("POST", backendUrl("/api/emergencies"), payload);
  } catch (err) {
    return { data: null, offline: true, offline_reason: err.message };
  }
}

export async function getEmergency(id) {
  try {
    return await json("GET", backendUrl(`/api/emergencies/${id}`));
  } catch {
    return null;
  }
}
