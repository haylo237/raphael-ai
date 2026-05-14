"use client";

import { useState } from "react";
import ResultCard from "../../components/ResultCard";
import { sendOtp, validateOtp, verifyNumber } from "../../lib/api";

export default function IdentityPage() {
  // Verify number
  const [verifyPhone, setVerifyPhone] = useState("+99999991000");
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifyError, setVerifyError] = useState(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Send OTP
  const [otpPhone, setOtpPhone] = useState("+99999991000");
  const [ttl, setTtl] = useState("300");
  const [otpResult, setOtpResult] = useState(null);
  const [otpError, setOtpError] = useState(null);
  const [otpLoading, setOtpLoading] = useState(false);

  // Validate OTP
  const [challengeId, setChallengeId] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [validateResult, setValidateResult] = useState(null);
  const [validateError, setValidateError] = useState(null);
  const [validateLoading, setValidateLoading] = useState(false);

  async function handleVerify(e) {
    e.preventDefault();
    setVerifyLoading(true);
    setVerifyResult(null);
    setVerifyError(null);
    try {
      setVerifyResult(await verifyNumber(verifyPhone.trim()));
    } catch (err) {
      setVerifyError(err.data || err.message);
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleSendOtp(e) {
    e.preventDefault();
    setOtpLoading(true);
    setOtpResult(null);
    setOtpError(null);
    try {
      const data = await sendOtp(otpPhone.trim(), parseInt(ttl, 10));
      setOtpResult(data);
      if (data.challengeId) setChallengeId(data.challengeId);
    } catch (err) {
      setOtpError(err.data || err.message);
    } finally {
      setOtpLoading(false);
    }
  }

  async function handleValidate(e) {
    e.preventDefault();
    setValidateLoading(true);
    setValidateResult(null);
    setValidateError(null);
    try {
      const data = await validateOtp(challengeId.trim(), otpCode.trim());
      setValidateResult(data || { validated: true });
    } catch (err) {
      setValidateError(err.data || err.message);
    } finally {
      setValidateLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-1">Identity & OTP</h1>
        <p className="text-gray-500 text-sm">
          Verify number ownership, send OTP challenges, and validate codes via CAMARA.
        </p>
      </div>

      {/* Verify Number */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Verify Number Ownership</h2>
        <form onSubmit={handleVerify} className="flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="+99999991000"
            value={verifyPhone}
            onChange={(e) => setVerifyPhone(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={verifyLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors whitespace-nowrap"
          >
            {verifyLoading ? "Verifying…" : "Verify Number"}
          </button>
        </form>
        <ResultCard data={verifyResult} error={verifyError} loading={verifyLoading} />
      </section>

      {/* Send OTP */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Send OTP</h2>
        <form onSubmit={handleSendOtp} className="space-y-3">
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={otpPhone}
                onChange={(e) => setOtpPhone(e.target.value)}
                required
              />
            </div>
            <div className="w-28">
              <label className="block text-sm font-medium mb-1">TTL (sec)</label>
              <input
                type="number"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={ttl}
                onChange={(e) => setTtl(e.target.value)}
                min="30"
                max="1800"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={otpLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            {otpLoading ? "Sending…" : "Send OTP"}
          </button>
        </form>
        <ResultCard title="OTP Challenge" data={otpResult} error={otpError} loading={otpLoading} />
      </section>

      {/* Validate OTP */}
      <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Validate OTP</h2>
        <form onSubmit={handleValidate} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Challenge ID</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Auto-filled from Send OTP result"
              value={challengeId}
              onChange={(e) => setChallengeId(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">OTP Code</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="6-digit code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={validateLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            {validateLoading ? "Validating…" : "Validate OTP"}
          </button>
        </form>
        <ResultCard title="Validation Result" data={validateResult} error={validateError} loading={validateLoading} />
      </section>
    </div>
  );
}
