"use client";

import { useState } from "react";
import ResultCard from "../../components/ResultCard";
import {
  listSubscriptions,
  createSubscription,
  getSubscription,
  deleteSubscription,
} from "../../lib/api";

const EVENT_TYPES = [
  "org.camaraproject.device-reachability-status-subscriptions.v0.reachability-data",
  "org.camaraproject.device-reachability-status-subscriptions.v0.reachability-sms",
  "org.camaraproject.device-reachability-status-subscriptions.v0.reachability-disconnected",
];

export default function SubscriptionsPage() {
  // List
  const [listResult, setListResult] = useState(null);
  const [listError, setListError] = useState(null);
  const [listLoading, setListLoading] = useState(false);

  // Create
  const [sink, setSink] = useState("https://webhook.site/example");
  const [eventType, setEventType] = useState(EVENT_TYPES[0]);
  const [phoneNumber, setPhoneNumber] = useState("+99999991000");
  const [createResult, setCreateResult] = useState(null);
  const [createError, setCreateError] = useState(null);
  const [createLoading, setCreateLoading] = useState(false);

  // Get / Delete
  const [subId, setSubId] = useState("");
  const [getResult, setGetResult] = useState(null);
  const [getError, setGetError] = useState(null);
  const [delResult, setDelResult] = useState(null);
  const [delError, setDelError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  async function handleList() {
    setListLoading(true);
    setListResult(null);
    setListError(null);
    try {
      setListResult(await listSubscriptions());
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
      const data = await createSubscription({
        protocol: "HTTP",
        sink,
        types: [eventType],
        config: {
          subscriptionDetail: {
            device: { phoneNumber },
          },
        },
      });
      setCreateResult(data);
    } catch (err) {
      setCreateError(err.data || err.message);
    } finally {
      setCreateLoading(false);
    }
  }

  async function handleGet() {
    if (!subId.trim()) return;
    setActionLoading(true);
    setGetResult(null);
    setGetError(null);
    try {
      setGetResult(await getSubscription(subId.trim()));
    } catch (err) {
      setGetError(err.data || err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDelete() {
    if (!subId.trim()) return;
    setActionLoading(true);
    setDelResult(null);
    setDelError(null);
    try {
      await deleteSubscription(subId.trim());
      setDelResult({ deleted: true, id: subId.trim() });
    } catch (err) {
      setDelError(err.data || err.message);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Reachability Subscriptions</h1>
        <p className="text-gray-500 text-sm">
          Create and manage CAMARA device reachability status event subscriptions.
        </p>
      </div>

      {/* List */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold mb-3">All Subscriptions</h2>
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
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
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
          <button
            type="submit"
            disabled={createLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            {createLoading ? "Creating…" : "Create Subscription"}
          </button>
        </form>
        <ResultCard title="Created" data={createResult} error={createError} loading={createLoading} />
      </section>

      {/* Get / Delete by ID */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Get / Delete by ID</h2>
        <div className="flex gap-2 mb-3">
          <input
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Subscription ID"
            value={subId}
            onChange={(e) => setSubId(e.target.value)}
          />
          <button
            onClick={handleGet}
            disabled={actionLoading || !subId.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            Get
          </button>
          <button
            onClick={handleDelete}
            disabled={actionLoading || !subId.trim()}
            className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            Delete
          </button>
        </div>
        <ResultCard data={getResult || delResult} error={getError || delError} loading={actionLoading} />
      </section>
    </div>
  );
}
