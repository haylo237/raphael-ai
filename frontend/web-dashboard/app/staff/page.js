"use client";

import { useEffect, useState } from "react";
import { listHospitals } from "../../lib/api";

export default function StaffPage() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const load = async () => {
      const hospitals = await listHospitals().catch(() => ({ data: [] }));
      const staffRows = (hospitals?.data || []).flatMap((h) => {
        const doctors = Array.isArray(h.doctors) ? h.doctors : [];
        if (doctors.length === 0) {
          return [{ id: `${h.id}-ops`, name: "Operations Desk", role: "Coordinator", hospital: h.name }];
        }
        return doctors.map((d) => ({
          id: d.id || `${h.id}-${d.name}`,
          name: d.name || "Doctor",
          role: d.specialization || "General",
          hospital: h.name,
          status: d.status || "available",
        }));
      });
      setRows(staffRows);
    };

    load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Doctors & Staff</h1>
      <p className="text-gray-500 text-sm mb-6">Role-based view of clinical responders and coverage.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rows.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-sm text-gray-400">No staff data available.</div>
        ) : (
          rows.map((staff) => (
            <div key={staff.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
              <p className="text-sm font-medium">{staff.name}</p>
              <p className="text-xs text-gray-600 mt-1">{staff.role}</p>
              <p className="text-xs text-gray-500 mt-1">{staff.hospital || "Unknown hospital"}</p>
              <span className="inline-block mt-3 px-2 py-0.5 text-xs rounded bg-green-100 text-green-700">{staff.status || "available"}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
