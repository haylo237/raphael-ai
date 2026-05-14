"use client";

import { useState } from "react";
import ResultCard from "../../components/ResultCard";
import LocationMap from "../../components/LocationMap";
import { verifyLocation, retrieveLocation } from "../../lib/api";

export default function LocationPage() {
  // Retrieve
  const [retrievePhone, setRetrievePhone] = useState("+99999991000");
  const [maxAge, setMaxAge] = useState("");
  const [retrieveResult, setRetrieveResult] = useState(null);
  const [retrieveError, setRetrieveError] = useState(null);
  const [retrieveLoading, setRetrieveLoading] = useState(false);

  // Verify
  const [verifyPhone, setVerifyPhone] = useState("+99999991000");
  const [locationHint, setLocationHint] = useState("lagos");
  const [lat, setLat] = useState("6.5244");
  const [lng, setLng] = useState("3.3792");
  const [radius, setRadius] = useState("120");
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError, setVerifyError] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  async function handleRetrieve(e) {
    e.preventDefault();
    setRetrieveLoading(true);
    setRetrieveResult(null);
    setRetrieveError(null);
    try {
      const data = await retrieveLocation({
        phone_number: retrievePhone.trim(),
        max_age: maxAge ? parseInt(maxAge, 10) : undefined,
      });
      setRetrieveResult(data);
    } catch (err) {
      setRetrieveError(err.data || err.message);
    } finally {
      setRetrieveLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyResult(null);
    setVerifyError(null);
    try {
      const data = await verifyLocation({
        phone_number: verifyPhone.trim(),
        location_hint: locationHint,
        center_latitude: parseFloat(lat),
        center_longitude: parseFloat(lng),
        radius_meters: parseFloat(radius),
      });
      setVerifyResult(data);
    } catch (err) {
      setVerifyError(err.data || err.message);
    } finally {
      setVerifyLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Location Lookup</h1>
        <p className="text-gray-500 text-sm">
          Retrieve network-derived device location or verify a device is inside a circular area.
        </p>
      </div>

      {/* Retrieve */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Retrieve Location</h2>
        <form onSubmit={handleRetrieve} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number (E.164)</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={retrievePhone}
              onChange={(e) => setRetrievePhone(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Age (seconds, optional)</label>
            <input
              type="number"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={maxAge}
              onChange={(e) => setMaxAge(e.target.value)}
              placeholder="Leave blank for any age"
              min="0"
            />
          </div>
          <button
            type="submit"
            disabled={retrieveLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            {retrieveLoading ? "Retrieving…" : "Retrieve Location"}
          </button>
        </form>
        <ResultCard
          data={retrieveResult}
          error={retrieveError}
          loading={retrieveLoading}
          hide={Boolean(retrieveResult?.area?.center)}
        />
        {retrieveResult?.area?.center ? (
          <LocationMap
            latitude={retrieveResult.area.center.latitude}
            longitude={retrieveResult.area.center.longitude}
            radius={retrieveResult.area.radius}
            timestamp={retrieveResult.lastLocationTime}
          />
        ) : null}
      </section>

      {/* Verify */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Verify Location (Geo-Circle)</h2>
        <form onSubmit={handleVerify} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number (E.164)</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={verifyPhone}
              onChange={(e) => setVerifyPhone(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location Hint</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={locationHint}
              onChange={(e) => setLocationHint(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Radius (m)</label>
              <input
                type="number"
                step="any"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                required
                min="1"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={verifyLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            {verifyLoading ? "Verifying…" : "Verify Location"}
          </button>
        </form>
        <ResultCard data={verifyResult} error={verifyError} loading={verifyLoading} />
        {Number.isFinite(parseFloat(lat)) && Number.isFinite(parseFloat(lng)) ? (
          <LocationMap
            latitude={parseFloat(lat)}
            longitude={parseFloat(lng)}
            radius={parseFloat(radius) || 500}
          />
        ) : null}
      </section>
    </div>
  );
}
