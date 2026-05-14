"use client";

import { useState } from "react";
import { useAuth } from "../../lib/auth";

const DEMO_ACCOUNTS = [
  { label: "Super Admin", phone: "+237600000001", password: "admin1234" },
  { label: "Doctor (Yaoundé)", phone: "+237600100002", password: "demo1234" },
  { label: "Nurse (Yaoundé)", phone: "+237600100004", password: "demo1234" },
  { label: "Receptionist", phone: "+237600100005", password: "demo1234" },
  { label: "Emergency Coordinator", phone: "+237600000002", password: "demo1234" },
  { label: "Patient", phone: "+237677000001", password: "patient1234" },
];

export default function LoginPage() {
  const { login, error } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await login({ phone, password }); }
    catch {}
    finally { setBusy(false); }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
      <div className="text-center mb-6">
        <div className="text-2xl font-bold text-blue-700">Raphael AI</div>
        <div className="text-sm text-gray-500">Sign in to continue</div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-1">Phone</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+237..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>
        {error && <div className="text-sm text-rose-600">{error}</div>}
        <button
          disabled={busy}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-2 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <div className="mt-6">
        <div className="text-xs uppercase tracking-wider text-gray-400 mb-2">Demo accounts</div>
        <div className="grid grid-cols-1 gap-1">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.phone}
              type="button"
              onClick={() => { setPhone(a.phone); setPassword(a.password); }}
              className="text-left text-xs px-3 py-2 rounded-md border border-gray-100 hover:bg-gray-50"
            >
              <span className="font-medium text-gray-700">{a.label}</span>
              <span className="text-gray-400 ml-2">{a.phone}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
