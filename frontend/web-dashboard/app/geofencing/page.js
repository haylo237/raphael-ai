"use client";

import { useState } from "react";
import ResultCard from "../../components/ResultCard";
import {
  listGeofencingSubscriptions,
  createGeofencingSubscription,
  getGeofencingSubscription,
  deleteGeofencingSubscription,
} from "../../lib/api";

const EVENT_TYPES = [
  "org.camaraproject.geofencing-subscriptions.v0.area-entered",
  "org.camaraproject.geofencing-subscriptions.v0.area-left",
];

export default function GeofencingPage() {
  // List
  const [listResult, setListResult] = useState(null);
  const [listError, setListError] = useState(null);
  const [listLoading, setListLoading] = useState(false);

  // Create
  const [phone, setPhone] = useState("+99999991000");
  const [sink, setSink] = useState("https://webhook.site/example");
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [lat, setLat] = useState("6.5244");
  const [lng, setLng] = useState("3.3792");
  const [radius, setRadius] = useState("500");
  const [createResult, setCreateResult] = useState(null);
  const [createError, setCreateError] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);

  // Get / Delete
  const [subId, setSubId] = useState("");
  const [actionResult, setActionResult] = useState(null);
  const [actionError, setActionError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function handleList() {
    setListLoading(true);
    setListResult(null);
    setListError(null);
    try {
      setListResult(await listGeofencingSubscriptions());
    } catch (err) {
      setListError(err.data || err.message);
    } finally {
      setListLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreateLoading(true);
    setCreateResult(null);
    setCreateError(null);
    try {
      const data = await createGeofencingSubscription({
        phone_number: phone.trim(),
        sink,
        types: [eventType],
        center_latitude: parseFloat(lat),
        center_longitude: parseFloat(lng),
        radius: parseFloat(radius),
      });
      setCreateResult(data);
      if (data.subscriptionId) setSubId(data.subscriptionId);
    } catch (err) {
      setCreateError(err.data || err.message);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleAction(action) {
    if (!subId.trim()) return;
    setActionLoading(true);
    setActionResult(null);
    setActionError(null);
    try {
      let data;
      if (action === "get") data = await getGeofencingSubscription(subId.trim());
      else {
        await deleteGeofencingSubscription(subId.trim());
        data = { deleted: true, subscriptionId: subId.trim() };
      }
      setActionResult(data);
    } catch (err) {
      setActionError(err.data || err.message);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Geofencing Subscriptions</h1>
        <p className="text-gray-500 text-sm">
          Subscribe to area-entered / area-left events for a device within a circular geo-fence.
        </p>
      </div>

      {/* List */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold mb-3">All Geofencing Subscriptions</h2>
        <button
          onClick={handleList}
          disabled={listLoading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
        >
          {listLoading ? "Loading…" : "List Subscriptions"}
        </button>
        <ResultCard data={listResult} error={listError} loading={listLoading} />
      </section>

      {/* Create */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Create Subscription</h2>
        <form onSubmit={handleCreate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Device Phone Number</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Sink (webhook URL)</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={sink}
                onChange={(e) => setSink(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Event Type</label>
            <select
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
            >
              {EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
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
                min="1"
                required
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={createLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            {createLoading ? "Creating…" : "Create Subscription"}
          </button>
        </form>
        <ResultCard title="Subscription Created" data={createResult} error={createError} loading={createLoading} />
      </section>

      {/* Get / Delete */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Get / Delete by ID</h2>
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Subscription ID (auto-filled after create)"
            value={subId}
            onChange={(e) => setSubId(e.target.value)}
          />
          <button
            onClick={() => handleAction("get")}
            disabled={actionLoading || !subId.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            Get
          </button>
          <button
            onClick={() => handleAction("delete")}
            disabled={actionLoading || !subId.trim()}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            Delete
          </button>
        </div>
        <ResultCard data={actionResult} error={actionError} loading={actionLoading} />
      </section>
    </div>
  );
}
