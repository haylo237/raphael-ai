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

let _token = null;
let _storage = null;
try { _storage = require("@react-native-async-storage/async-storage").default; } catch {}
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

async function call(method, url, payload) {
  const headers = { "Content-Type": "application/json", Accept: "application/json" };
  const token = await getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  try {
    const res = await fetch(url, { method, headers, body: payload ? JSON.stringify(payload) : undefined });
    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`HTTP ${res.status} ${text}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  } catch (err) {
    return { data: null, offline: true, offline_reason: err.message };
  }
}

export async function login({ phone, password }) {
  const res = await call("POST", backendUrl("/api/auth/login"), { phone, password });
  if (res?.token) await setAuthToken(res.token);
  return res;
}
export async function fetchMe() { return call("GET", backendUrl("/api/me")); }
export async function logout() {
  try { await call("POST", backendUrl("/api/auth/logout")); } catch {}
  await setAuthToken(null);
}

export const listEmergencies = () => call("GET", backendUrl("/api/emergencies"));
export const getEmergency = (id) => call("GET", backendUrl(`/api/emergencies/${id}`));
export const acceptEmergency = (id) => call("POST", backendUrl(`/api/emergencies/${id}/accept`));
export const resolveEmergency = (id, note) => call("POST", backendUrl(`/api/emergencies/${id}/resolve`), { note });
export const escalateEmergency = (id, reason) => call("POST", backendUrl(`/api/emergencies/${id}/escalate`), { reason });

export const listPatients = () => call("GET", backendUrl("/api/patients"));
export const searchPatients = (q) => call("GET", backendUrl(`/api/patients/search?query=${encodeURIComponent(q || "")}`));
export const getPatient = (id) => call("GET", backendUrl(`/api/patients/${id}`));
export const recordVitals = (id, vitals) => call("POST", backendUrl(`/api/patients/${id}/vitals`), vitals);

export const decideCase = (payload) => call("POST", pulseUrl("/decide"), payload);
