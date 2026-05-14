"use client";

import { useState } from "react";
import ResultCard from "../../components/ResultCard";
import {
  retrieveIdentifier,
  retrieveType,
  retrievePpid,
  matchIdentifier,
} from "../../lib/api";

const IDENTIFIER_TYPES = ["IMEI", "IMEISV", "TAC"];

export default function DeviceIdentifierPage() {
  const [phone, setPhone] = useState("+99999991000");
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeOp, setActiveOp] = useState(null);

  // Match
  const [matchPhone, setMatchPhone] = useState("+99999991000");
  const [idType, setIdType] = useState("IMEI");
  const [idValue, setIdValue] = useState("35914108123456");
  const [matchResult, setMatchResult] = useState(null);
  const [matchError, setMatchError] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);

  async function handleLookup(op) {
    if (!phone.trim()) return;
    setLoading(true);
    setActiveOp(op);
    setResult(null);
    setError(null);
    try {
      let data;
      if (op === "identifier") data = await retrieveIdentifier(phone.trim());
      else if (op === "type") data = await retrieveType(phone.trim());
      else data = await retrievePpid(phone.trim());
      setResult(data);
    } catch (err) {
      setError(err.data || err.message);
    } finally {
      setLoading(false);
      setActiveOp(null);
    }
  }

  async function handleMatch(e) {
    e.preventDefault();
    setMatchLoading(true);
    setMatchResult(null);
    setMatchError(null);
    try {
      setMatchResult(await matchIdentifier(matchPhone.trim(), idType, idValue.trim()));
    } catch (err) {
      setMatchError(err.data || err.message);
    } finally {
      setMatchLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Device Identifier Lookup</h1>
        <p className="text-gray-500 text-sm">
          Resolve a phone number to its IMEI, device type, or PPID, or match against a provided identifier.
        </p>
      </div>

      {/* Lookup: identifier / type / ppid */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Retrieve Identifier / Type / PPID</h2>
        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+99999991000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            ["identifier", "IMEI / Identifier"],
            ["type", "Device Type"],
            ["ppid", "PPID"],
          ].map(([op, label]) => (
            <button
              key={op}
              onClick={() => handleLookup(op)}
              disabled={loading || !phone.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
            >
              {loading && activeOp === op ? "Loading…" : label}
            </button>
          ))}
        </div>
        <ResultCard data={result} error={error} loading={loading} />
      </section>

      {/* Match identifier */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Match Identifier</h2>
        <form onSubmit={handleMatch} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={matchPhone}
              onChange={(e) => setMatchPhone(e.target.value)}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Identifier Type</label>
              <select
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={idType}
                onChange={(e) => setIdType(e.target.value)}
              >
                {IDENTIFIER_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Identifier Value</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={idValue}
                onChange={(e) => setIdValue(e.target.value)}
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={matchLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            {matchLoading ? "Matching…" : "Match Identifier"}
          </button>
        </form>
        <ResultCard title="Match Result" data={matchResult} error={matchError} loading={matchLoading} />
      </section>
    </div>
  );
}
