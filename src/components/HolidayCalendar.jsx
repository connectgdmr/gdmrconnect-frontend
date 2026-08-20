import React, { useState, useEffect } from "react";
import { FaPlus, FaTrash, FaTimes } from "react-icons/fa";

// Backend (routes/calendar.py's GET/POST/DELETE /api/holidays, backed by
// database.holidays_col) is the single source of truth — this tab, the
// Attendance Calendar's grey-out overlay, and classify_attendance_day()'s
// LOP exclusion all read/derive from the same collection, so an admin
// adding or removing a holiday here shows up everywhere else immediately.
export default function HolidayCalendar({ token, api, canWrite = false }) {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ date: "", name: "" });
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [error, setError] = useState("");

  function load() {
    setLoading(true);
    api.getHolidays(token)
      .then(d => setHolidays(Array.isArray(d) ? d : []))
      .catch(() => setHolidays([]))
      .finally(() => setLoading(false));
  }

  useEffect(load, [api, token]);

  async function addHoliday(e) {
    e.preventDefault();
    if (!form.date || !form.name.trim()) return;
    setSaving(true);
    setError("");
    try {
      await api.addHoliday({ date: form.date, name: form.name.trim() }, token);
      setForm({ date: "", name: "" });
      setShowAdd(false);
      load();
    } catch (err) {
      setError(err.message || "Failed to add holiday.");
    } finally {
      setSaving(false);
    }
  }

  async function removeHoliday(h) {
    if (!window.confirm(`Remove "${h.name}" (${h.date}) from the holiday calendar?`)) return;
    setDeletingId(h._id);
    try {
      await api.deleteHoliday(h._id, token);
      setHolidays(list => list.filter(x => x._id !== h._id));
    } catch (err) {
      alert(err.message || "Failed to delete holiday.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="card" style={{ padding: 0, border: "none", boxShadow: "none" }}>
      <div style={{ padding: "20px", borderBottom: "1px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h3 style={{ color: "var(--brand)", margin: 0 }}>Holiday Calendar</h3>
          <p className="small" style={{ margin: "4px 0 0", color: "#64748b" }}>Company-wide holidays and off days — synced with the attendance calendar automatically.</p>
        </div>
        {canWrite && (
          <button type="button" className="btn" style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }} onClick={() => setShowAdd(s => !s)}>
            {showAdd ? <FaTimes size={12} /> : <FaPlus size={12} />} {showAdd ? "Cancel" : "Add Holiday"}
          </button>
        )}
      </div>

      {canWrite && showAdd && (
        <form onSubmit={addHoliday} style={{ padding: "16px 20px", borderBottom: "1px solid #f0f0f0", background: "#fafbfc", display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div>
            <label className="modern-label">Date</label>
            <input type="date" className="modern-input" style={{ margin: 0 }} value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label className="modern-label">Holiday / Off Day Name</label>
            <input className="modern-input" style={{ margin: 0 }} placeholder="e.g., Diwali, Founders' Day, Office Off Day" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>
          <button type="submit" className="btn" disabled={saving} style={{ whiteSpace: "nowrap" }}>
            {saving ? "Adding…" : "Save Holiday"}
          </button>
          {error && <div style={{ width: "100%", fontSize: 12.5, color: "#b91c1c" }}>{error}</div>}
        </form>
      )}

      <div style={{ overflowX: "auto" }}>
        <table className="styled-table">
          <thead>
            <tr>
              <th>SL No</th>
              <th>Date</th>
              <th>Day</th>
              <th>Holiday</th>
              {canWrite && <th style={{ width: 60 }}></th>}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={canWrite ? 5 : 4} style={{ textAlign: "center", padding: 20, color: "#999" }}>Loading…</td></tr>}
            {!loading && holidays.length === 0 && <tr><td colSpan={canWrite ? 5 : 4} style={{ textAlign: "center", padding: 20, color: "#999" }}>No holidays found.</td></tr>}
            {holidays.map((h, i) => (
              <tr key={h._id}>
                <td style={{ textAlign: "center", width: "80px" }}>{i + 1}</td>
                <td style={{ fontWeight: 500 }}>{new Date(h.date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</td>
                <td>{h.day}</td>
                <td style={{ color: "var(--brand)", fontWeight: 600 }}>{h.name}</td>
                {canWrite && (
                  <td style={{ textAlign: "center" }}>
                    <button
                      type="button"
                      onClick={() => removeHoliday(h)}
                      disabled={deletingId === h._id}
                      title="Remove this holiday"
                      style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 6, width: 28, height: 28, cursor: "pointer", color: "#dc2626", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <FaTrash size={11} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
