import React, { useState, useEffect, useMemo } from "react";
import { FaChevronLeft, FaChevronRight, FaClock } from "react-icons/fa";
import { ymd, ym } from "../utils/dateUtils";

const DOW_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// Spec's 4-color status vocabulary, plus "pending" for today's not-yet-over day.
const STATUS_STYLE = {
  present:        { label: "Present",        dot: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  approved_leave: { label: "Approved Leave",  dot: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  lop:            { label: "LOP",             dot: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  weekly_off:     { label: "Weekly Off / Holiday", dot: "#94a3b8", bg: "#f1f5f9", border: "#e2e8f0" },
  pending:        { label: "Not Checked In Yet", dot: "#94a3b8", bg: "#fff", border: "#e2e8f0" },
};

function fmtTime(iso) {
  if (!iso) return "";
  try { return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

/**
 * Reusable monthly attendance calendar — Employee ("self") and Manager
 * ("manager", with a Department → Employee picker) both use this same
 * component against the three /attendance/calendar endpoints, which all
 * share one backend classification (helpers.classify_attendance_day).
 */
export default function AttendanceCalendar({ token, api, mode = "self", employeeId, employees = [] }) {
  const [viewDate, setViewDate] = useState(new Date());
  const [deptFilter, setDeptFilter] = useState("All");
  const [selectedEmpId, setSelectedEmpId] = useState(employeeId || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  // dateStr ("YYYY-MM-DD") -> holiday name, from the same GET /api/holidays
  // the Holiday Calendar tab reads — single source of truth, so a holiday
  // added there shows up here automatically, past or future.
  const [holidayMap, setHolidayMap] = useState(new Map());

  const monthStr = ym(viewDate);
  const todayStr = ymd(new Date());

  useEffect(() => {
    api.getHolidays(token)
      .then(d => setHolidayMap(new Map((Array.isArray(d) ? d : []).filter(h => h.date).map(h => [h.date, h.name]))))
      .catch(() => {});
  }, [api, token]);

  const departments = useMemo(() => {
    if (mode !== "manager") return [];
    const set = new Set();
    employees.forEach(e => {
      const d = Array.isArray(e.department) ? e.department : [e.department];
      d.forEach(x => { if (x) set.add(x); });
    });
    return ["All", ...[...set].sort()];
  }, [employees, mode]);

  const filteredEmployees = useMemo(() => {
    if (mode !== "manager") return [];
    if (deptFilter === "All") return employees;
    return employees.filter(e => {
      const d = Array.isArray(e.department) ? e.department : [e.department];
      return d.includes(deptFilter);
    });
  }, [employees, deptFilter, mode]);

  // Default to the first employee in scope when in manager mode and nothing's picked yet.
  useEffect(() => {
    if (mode === "manager" && !selectedEmpId && filteredEmployees.length > 0) {
      setSelectedEmpId(filteredEmployees[0]._id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, filteredEmployees]);

  const activeEmpId = mode === "self" ? employeeId : selectedEmpId;

  useEffect(() => {
    if (!activeEmpId) { setData(null); return; }
    setLoading(true);
    setSelectedDay(null);
    const req = mode === "self"
      ? api.getMyAttendanceCalendar(monthStr, token)
      : api.getManagerAttendanceCalendar(activeEmpId, monthStr, token);
    req.then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [activeEmpId, monthStr, mode, api, token]);

  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDow     = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  function statusFor(dateStr) {
    const entry = data?.days?.[dateStr];
    if (entry) return entry;
    // Backend omits days outside the employment window and (always) future
    // days entirely — a holiday still greys out here regardless, so
    // upcoming holidays are visible on the calendar too, not just past ones.
    if (holidayMap.has(dateStr)) return { status: "weekly_off", holiday_name: holidayMap.get(dateStr) };
    return null;
  }

  return (
    <div className="card" style={{ padding: 18, width: "100%", maxWidth: 900, margin: "0 auto" }}>
      {mode === "manager" && (
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <select className="modern-input" style={{ margin: 0, flex: 1, minWidth: 160 }}
            value={deptFilter} onChange={e => { setDeptFilter(e.target.value); setSelectedEmpId(""); }}>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select className="modern-input" style={{ margin: 0, flex: 1, minWidth: 200 }}
            value={selectedEmpId} onChange={e => setSelectedEmpId(e.target.value)}>
            <option value="">— Select Employee —</option>
            {filteredEmployees.map(e => <option key={e._id} value={e._id}>{e.name}</option>)}
          </select>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <button type="button" onClick={() => setViewDate(new Date(year, month - 1, 1))}
          style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 8, cursor: "pointer", color: "#64748b", padding: "6px 10px" }}>
          <FaChevronLeft size={12} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
          {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))}
          style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 8, cursor: "pointer", color: "#64748b", padding: "6px 10px" }}>
          <FaChevronRight size={12} />
        </button>
      </div>

      {mode === "manager" && !activeEmpId ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Select an employee to view their calendar.</div>
      ) : loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Loading…</div>
      ) : (
        <>
          {data?.summary && (
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 14, fontSize: 12.5 }}>
              <span style={{ color: STATUS_STYLE.present.dot, fontWeight: 700 }}>🟢 Present: {data.summary.present}</span>
              <span style={{ color: STATUS_STYLE.approved_leave.dot, fontWeight: 700 }}>🟠 Approved Leave: {data.summary.approved_leave}</span>
              <span style={{ color: STATUS_STYLE.lop.dot, fontWeight: 700 }}>🔴 LOP: {data.summary.lop}</span>
              <span style={{ color: "#64748b", fontWeight: 700 }}>⚪ Weekly Off/Holiday: {data.summary.weekly_off}</span>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 4 }}>
            {DOW_LABELS.map((l, i) => (
              <div key={i} style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: "#94a3b8", padding: "2px 0" }}>{l}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />;
              const dateStr = ymd(new Date(year, month, d));
              const entry   = statusFor(dateStr);
              const style   = entry ? STATUS_STYLE[entry.status] : null;
              const isFuture = dateStr > todayStr;
              const isSelected = selectedDay === dateStr;
              return (
                <button
                  type="button" key={i}
                  disabled={isFuture || !entry}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  title={entry?.holiday_name ? `${entry.holiday_name}${style?.label ? ` (${style.label})` : ""}` : (style?.label || "")}
                  style={{
                    aspectRatio: "1.6", border: `1.5px solid ${isSelected ? "#0f172a" : (style?.border || "#f1f5f9")}`,
                    borderRadius: 7, fontSize: 12.5, fontWeight: 600, cursor: (isFuture || !entry) ? "default" : "pointer",
                    background: style?.bg || "#fff", color: isFuture ? "#cbd5e1" : "#0f172a",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, padding: 0,
                  }}
                >
                  {d}
                  {style && <span style={{ width: 4, height: 4, borderRadius: "50%", background: style.dot }} />}
                </button>
              );
            })}
          </div>

          {selectedDay && statusFor(selectedDay) && (
            <div style={{ marginTop: 14, padding: "10px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <FaClock size={11} color="#64748b" />
              <strong>{new Date(selectedDay).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}:</strong>
              <span>{statusFor(selectedDay).holiday_name || STATUS_STYLE[statusFor(selectedDay).status]?.label}</span>
              {statusFor(selectedDay).checkin_time && (
                <span style={{ color: "#64748b" }}>— checked in at {fmtTime(statusFor(selectedDay).checkin_time)}</span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
