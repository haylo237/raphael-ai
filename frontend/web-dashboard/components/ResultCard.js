"use client";

import { useState } from "react";

/**
 * Smart result presenter.
 * Replaces raw JSON dumps with semantic, beautiful presentations.
 *
 * Props:
 *   title       optional heading
 *   data        object | array | null
 *   error       string | object | null
 *   loading     boolean
 *   hide        boolean — when true, render nothing (use when a richer
 *               visualization elsewhere already covers the same data)
 */
export default function ResultCard({ title, data, error, loading, hide }) {
  const [showRaw, setShowRaw] = useState(false);

  if (hide) return null;

  if (loading) {
    return (
      <div className="mt-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <p className="text-sm text-gray-500">Working…</p>
        </div>
      </div>
    );
  }

  if (error) {
    const message = stringifyError(error);
    return (
      <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 shadow-sm">
        <p className="text-sm font-bold text-red-700 mb-1">⚠ {title || "Error"}</p>
        <pre className="text-xs text-red-700 whitespace-pre-wrap break-words">{message}</pre>
      </div>
    );
  }

  if (data === null || data === undefined) return null;

  return (
    <div className="mt-4 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-2 bg-gradient-to-r from-emerald-50 to-blue-50 border-b border-gray-200">
        <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
          <span className="text-emerald-600">✓</span>
          {title || "Result"}
        </p>
        <button
          type="button"
          onClick={() => setShowRaw((v) => !v)}
          className="text-xs text-gray-500 hover:text-gray-800 font-medium"
        >
          {showRaw ? "Hide JSON" : "Show JSON"}
        </button>
      </div>
      <div className="p-4">
        {showRaw ? (
          <pre className="text-xs text-gray-700 whitespace-pre-wrap break-all overflow-auto max-h-96">
            {JSON.stringify(data, null, 2)}
          </pre>
        ) : (
          <Smart value={data} />
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/*  Renderers                                                              */
/* ---------------------------------------------------------------------- */

function Smart({ value }) {
  if (value === null || value === undefined) {
    return <p className="text-sm text-gray-400">No data.</p>;
  }
  if (Array.isArray(value)) return <ListRenderer items={value} />;
  if (typeof value === "object") return <ObjectRenderer obj={value} />;
  return <ScalarRenderer value={value} />;
}

function ObjectRenderer({ obj }) {
  const entries = Object.entries(obj);
  if (entries.length === 0) {
    return <p className="text-sm text-gray-400">Empty response.</p>;
  }
  // Promote a single well-known top-level "status / verified" field to a big pill.
  // Only when the value is a primitive (string/boolean/number), otherwise it
  // belongs in the normal grid as a sub-card.
  const heroKey = entries.find(([k, v]) => {
    if (!HERO_KEYS.has(k.toLowerCase())) return false;
    const t = typeof v;
    return v === null || t === "string" || t === "boolean" || t === "number";
  })?.[0];

  return (
    <div className="space-y-4">
      {heroKey ? <Hero label={heroKey} value={obj[heroKey]} /> : null}
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {entries
          .filter(([k]) => k !== heroKey)
          .map(([k, v]) => (
            <Field key={k} k={k} v={v} />
          ))}
      </dl>
    </div>
  );
}

function Field({ k, v }) {
  const label = humanize(k);
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return (
      <div className="sm:col-span-2 border border-gray-200 rounded p-3 bg-gray-50">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
          {label}
        </p>
        <ObjectRenderer obj={v} />
      </div>
    );
  }
  if (Array.isArray(v)) {
    return (
      <div className="sm:col-span-2 border border-gray-200 rounded p-3 bg-gray-50">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
          {label}{" "}
          <span className="text-gray-400 font-normal">({v.length})</span>
        </p>
        <ListRenderer items={v} />
      </div>
    );
  }
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{label}</dt>
      <dd className="mt-0.5">
        <ScalarRenderer name={k} value={v} />
      </dd>
    </div>
  );
}

function ListRenderer({ items }) {
  if (items.length === 0) return <p className="text-sm text-gray-400">Empty list.</p>;
  if (items.every((x) => typeof x !== "object" || x === null)) {
    return (
      <div className="flex flex-wrap gap-2">
        {items.map((it, i) => (
          <span
            key={i}
            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
          >
            {String(it)}
          </span>
        ))}
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={i} className="border border-gray-200 rounded p-3 bg-white">
          <ObjectRenderer obj={it} />
        </li>
      ))}
    </ul>
  );
}

function ScalarRenderer({ name, value }) {
  if (typeof value === "boolean") {
    return value ? (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-700">
        ✓ Yes
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-700">
        ✕ No
      </span>
    );
  }
  if (typeof value === "string") {
    const v = value.toUpperCase();
    if (POSITIVE_STATUS.has(v)) return <Pill tone="emerald">{value}</Pill>;
    if (NEGATIVE_STATUS.has(v)) return <Pill tone="rose">{value}</Pill>;
    if (WARN_STATUS.has(v)) return <Pill tone="amber">{value}</Pill>;
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      return <span className="text-sm text-gray-700">{formatDate(value)}</span>;
    }
    if (value.length > 20 && /^[A-Za-z0-9_\-./=+]+$/.test(value)) {
      return (
        <code className="text-xs text-gray-700 font-mono bg-gray-100 px-1.5 py-0.5 rounded break-all">
          {value}
        </code>
      );
    }
    return <span className="text-sm text-gray-800 break-words">{value}</span>;
  }
  if (typeof value === "number") {
    return <span className="text-sm font-semibold text-gray-900">{value.toLocaleString()}</span>;
  }
  // Fallback for anything else (including objects that slip through):
  // never render the object directly — stringify it.
  return <span className="text-sm text-gray-700 break-all">{safeString(value)}</span>;
}

function Hero({ label, value }) {
  const upper = String(value).toUpperCase();
  let tone = "slate";
  if (value === true || POSITIVE_STATUS.has(upper)) tone = "emerald";
  else if (value === false || NEGATIVE_STATUS.has(upper)) tone = "rose";
  else if (WARN_STATUS.has(upper)) tone = "amber";

  const TONE = {
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", glyph: "✓" },
    rose:    { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200",    glyph: "✕" },
    amber:   { bg: "bg-amber-50",   text: "text-amber-800",   border: "border-amber-300",   glyph: "!" },
    slate:   { bg: "bg-slate-50",   text: "text-slate-700",   border: "border-slate-200",   glyph: "ℹ" },
  }[tone];

  return (
    <div className={`${TONE.bg} ${TONE.border} border rounded-lg p-4 flex items-center gap-3`}>
      <div className={`w-10 h-10 rounded-full ${TONE.text} bg-white border ${TONE.border} flex items-center justify-center text-lg font-bold`}>
        {TONE.glyph}
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
          {humanize(label)}
        </p>
        <p className={`text-lg font-bold ${TONE.text}`}>{prettyValue(value)}</p>
      </div>
    </div>
  );
}

function Pill({ tone, children }) {
  const T = {
    emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
    rose:    "bg-rose-100 text-rose-700 border-rose-200",
    amber:   "bg-amber-100 text-amber-800 border-amber-200",
  }[tone];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${T}`}>
      {children}
    </span>
  );
}

/* ---------------------------------------------------------------------- */
/*  Vocab                                                                  */
/* ---------------------------------------------------------------------- */

const HERO_KEYS = new Set([
  "verificationresult",
  "devicephonenumberverified",
  "verified",
  "match",
  "status",
  "reachabilitystatus",
  "result",
]);

const POSITIVE_STATUS = new Set([
  "TRUE", "YES", "OK", "ACTIVE", "AVAILABLE",
  "CONNECTED", "CONNECTED_DATA", "CONNECTED_SMS",
  "REACHABLE", "VERIFIED", "MATCH", "SUCCESS",
  "GRANTED", "AUTHORIZED", "RESOLVED",
]);
const NEGATIVE_STATUS = new Set([
  "FALSE", "NO", "FAIL", "FAILED", "INACTIVE",
  "UNAVAILABLE", "NOT_CONNECTED", "UNREACHABLE",
  "NOT_VERIFIED", "NO_MATCH", "ERROR", "DENIED", "REJECTED",
]);
const WARN_STATUS = new Set([
  "PENDING", "PARTIAL", "UNKNOWN", "DEGRADED",
  "EXPIRED", "EXPIRING", "IN_PROGRESS",
]);

function humanize(key) {
  return key
    .replace(/[_\-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function prettyValue(v) {
  if (v === true) return "Yes";
  if (v === false) return "No";
  return safeString(v);
}

function safeString(v) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") {
    try {
      return JSON.stringify(v);
    } catch {
      return "[object]";
    }
  }
  return String(v);
}

function formatDate(iso) {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function stringifyError(err) {
  if (err == null) return "";
  if (typeof err === "string") return err;
  // Common shapes: { code, message }, { detail }, { error }, Error instance
  const parts = [];
  if (err.code) parts.push(`[${err.code}]`);
  const m =
    typeof err.detail === "string"
      ? err.detail
      : typeof err.message === "string"
      ? err.message
      : typeof err.error === "string"
      ? err.error
      : null;
  if (m) parts.push(m);
  if (parts.length > 0) return parts.join(" ");
  try {
    return JSON.stringify(err, null, 2);
  } catch {
    return String(err);
  }
}
