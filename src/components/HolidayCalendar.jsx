import React, { useState, useEffect } from "react";

// Backend (routes/calendar.py's GET /api/holidays, backed by
// helpers.COMPANY_HOLIDAYS) is now the single source of truth — this tab
// and AttendanceCalendar.jsx both read the same list, so a holiday added
// here shows up on the attendance calendar (and payroll's LOP auto-fill)
// without any code drifting out of sync.
export default function HolidayCalendar({ token, api }) {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getHolidays(token)
      .then(d => setHolidays(Array.isArray(d) ? d : []))
      .catch(() => setHolidays([]))
      .finally(() => setLoading(false));
  }, [api, token]);

  return (
    <div className="card" style={{ padding: 0, border: "none", boxShadow: "none" }}>
      <div style={{ padding: "20px", borderBottom: "1px solid #f0f0f0" }}>
        <h3 style={{ color: "var(--brand)", margin: 0 }}>Holiday Calendar 2026</h3>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="styled-table">
          <thead>
            <tr>
              <th>SL No</th>
              <th>Date</th>
              <th>Day</th>
              <th>Holiday</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="4" style={{ textAlign: "center", padding: 20, color: "#999" }}>Loading…</td></tr>}
            {!loading && holidays.length === 0 && <tr><td colSpan="4" style={{ textAlign: "center", padding: 20, color: "#999" }}>No holidays found.</td></tr>}
            {holidays.map((h) => (
              <tr key={h.id}>
                <td style={{ textAlign: "center", width: "80px" }}>{h.id}</td>
                <td style={{ fontWeight: 500 }}>{new Date(h.date).toLocaleDateString("en-US", { month: "long", day: "numeric" })}</td>
                <td>{h.day}</td>
                <td style={{ color: "var(--brand)", fontWeight: 600 }}>{h.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
