"use client";

import { useEffect, useState } from "react";

/**
 * Lightweight, zero-dependency location preview:
 *  - OpenStreetMap embed via iframe (no API key required)
 *  - Reverse geocoding via Nominatim (free, no API key required)
 *
 * Props:
 *   latitude, longitude   numbers
 *   radius                meters (optional, defaults to 500)
 *   timestamp             ISO string (optional)
 */
export default function LocationMap({ latitude, longitude, radius = 500, timestamp }) {
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function lookup() {
      setLoading(true);
      setError(null);
      setPlace(null);
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=12&addressdetails=1`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
        const data = await res.json();
        if (!cancelled) setPlace(data);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
      lookup();
    }
    return () => {
      cancelled = true;
    };
  }, [latitude, longitude]);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  // Roughly convert "radius (m)" to a sensible bbox span.
  // 0.01 degree ≈ 1.1 km at the equator; pad a bit so the marker isn't on the edge.
  const span = Math.max(0.01, (radius / 111000) * 4);
  const bbox = [longitude - span, latitude - span, longitude + span, latitude + span].join("%2C");
  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
  const fullMap = `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=13/${latitude}/${longitude}`;

  const addr = place?.address || {};
  const town =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.hamlet ||
    addr.municipality ||
    addr.county ||
    null;
  const region = addr.state || addr.region || null;
  const country = addr.country || null;
  const flag = addr.country_code ? countryFlag(addr.country_code) : "";

  return (
    <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">
              Resolved location
            </p>
            {loading ? (
              <p className="text-sm text-gray-400 mt-1">Looking up address…</p>
            ) : error ? (
              <p className="text-sm text-red-600 mt-1">Geocoding error: {error}</p>
            ) : (
              <p className="text-lg font-bold mt-1">
                {flag} {town || "Unknown area"}
                {region ? <span className="text-gray-500 font-normal">, {region}</span> : null}
                {country ? <span className="text-gray-500 font-normal">, {country}</span> : null}
              </p>
            )}
            {place?.display_name ? (
              <p className="text-xs text-gray-500 mt-1 max-w-lg">{place.display_name}</p>
            ) : null}
          </div>
          <div className="text-right text-xs text-gray-500 space-y-0.5 font-mono">
            <p>
              <span className="text-gray-400">lat</span> {latitude.toFixed(6)}
            </p>
            <p>
              <span className="text-gray-400">lng</span> {longitude.toFixed(6)}
            </p>
            <p>
              <span className="text-gray-400">±</span> {radius} m
            </p>
            {timestamp ? <p className="text-gray-400">{timestamp}</p> : null}
          </div>
        </div>
      </div>

      <div className="relative">
        <iframe
          title="Location map"
          src={mapSrc}
          className="w-full h-72 border-0"
          loading="lazy"
        />
      </div>

      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-right">
        <a
          href={fullMap}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          Open full map ↗
        </a>
      </div>
    </div>
  );
}

function countryFlag(code) {
  if (!code || code.length !== 2) return "";
  const cp = [...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...cp);
}
