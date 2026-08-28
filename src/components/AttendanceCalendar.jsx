import React, { useState, useEffect, useMemo } from "react";
import { TbChevronLeft, TbChevronRight, TbClock, TbCalendarPlus, TbEdit } from "react-icons/tb";
import { ymd, ym } from "../utils/dateUtils";

const DOW_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

// Spec's 4-color status vocabulary, plus "pending" for today's not-yet-over day.
// `short` is what fits directly on a calendar cell without a click; `label`
// is the fuller wording used in the legend and the day-detail panel.
const STATUS_STYLE = {
  present:        { label: "Present",        short: "Present", dot: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0" },
  approved_leave: { label: "Approved Leave",  short: "Leave",   dot: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  lop:            { label: "LOP",             short: "LOP",     dot: "#dc2626", bg: "#fef2f2", border: "#fecaca" },
  weekly_off:     { label: "Weekly Off / Holiday", short: "Off", dot: "#94a3b8", bg: "#f1f5f9", border: "#e2e8f0" },
  pending:        { label: "Not Checked In Yet", short: "Pending", dot: "#94a3b8", bg: "#fff", border: "#e2e8f0" },
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
export default function AttendanceCalendar({ token, api, mode = "self", employeeId, employees = [], onApplyLeave, onRequestCorrection }) {
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

  // Text only — a Saturday with no named holiday is still counted and
  // treated identically to any other weekly_off day (no attendance
  // required, no LOP), it just reads as "Unofficial Working Day" instead
  // of a plain "Off" since Saturday isn't the fixed official day off the
  // way Sunday is. Named holidays (any day of week) keep their real name.
  function offDayLabel(dateStr, entry) {
    if (entry.holiday_name) return entry.holiday_name;
    const isSaturday = new Date(`${dateStr}T00:00:00`).getDay() === 6;
    return isSaturday ? "Unofficial Working Day" : "Off";
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
          <TbChevronLeft size={12} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
          {viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </span>
        <button type="button" onClick={() => setViewDate(new Date(year, month + 1, 1))}
          style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 8, cursor: "pointer", color: "#64748b", padding: "6px 10px" }}>
          <TbChevronRight size={12} />
        </button>
      </div>

      {mode === "manager" && !activeEmpId ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Select an employee to view their calendar.</div>
      ) : loading ? (
        <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>Loading…</div>
      ) : (
        <>
          {data?.summary && (
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 14 }}>
              {[
                { key: "present",        count: data.summary.present },
                { key: "approved_leave", count: data.summary.approved_leave },
                { key: "lop",            count: data.summary.lop },
                { key: "weekly_off",     count: data.summary.weekly_off },
              ].map(row => (
                <span key={row.key} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "#334155" }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: STATUS_STYLE[row.key].dot, flexShrink: 0 }} />
                  {STATUS_STYLE[row.key].label}: {row.count}
                </span>
              ))}
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
                  // A future day is only clickable when it's a known-in-advance
                  // weekend/holiday (the backend now sends those ahead of
                  // time) — a future regular working day still has nothing
                  // to show, so it stays disabled/blank same as before.
                  disabled={!entry}
                  onClick={() => setSelectedDay(isSelected ? null : dateStr)}
                  title={entry ? (entry.status === "weekly_off" ? offDayLabel(dateStr, entry) : (style?.label || "")) : ""}
                  style={{
                    aspectRatio: "1.3", border: `1.5px solid ${isSelected ? "#0f172a" : (style?.border || "#f1f5f9")}`,
                    borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: !entry ? "default" : "pointer",
                    background: style?.bg || "#fff", color: isFuture ? "#cbd5e1" : "#0f172a",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, padding: "4px 2px",
                  }}
                >
                  {d}
                  {/* Status shown as text right on the cell — no click
                      needed to see what a day was, the click is only for
                      the fuller breakdown + action buttons below. A named
                      holiday shows its actual name instead of a generic
                      "Off", same name the Holiday Calendar tab uses. */}
                  {style && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: 0.2, color: style.dot,
                      textTransform: entry.status === "weekly_off" ? "none" : "uppercase",
                      maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 2px",
                    }}>
                      {entry.status === "present" && entry.checkin_time
                        ? fmtTime(entry.checkin_time)
                        : entry.status === "weekly_off" ? offDayLabel(dateStr, entry) : style.short}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedDay && statusFor(selectedDay) && (() => {
            const entry = statusFor(selectedDay);
            const niceDate = new Date(selectedDay).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
            // Every fact this day actually has, rendered as plain lines —
            // not just the status label, so a click tells the full story
            // (leave reason/type, both punch times, any correction filed).
            const lines = [];
            lines.push(entry.status === "weekly_off" ? offDayLabel(selectedDay, entry) : STATUS_STYLE[entry.status]?.label);
            if (entry.checkin_time)  lines.push(`Checked in at ${fmtTime(entry.checkin_time)}`);
            if (entry.checkout_time) lines.push(`Checked out at ${fmtTime(entry.checkout_time)}`);
            if (entry.status === "approved_leave") {
              const kind = entry.leave_type === "half" ? `Half Day (${entry.leave_period || "—"})` : "Full Day";
              lines.push(`Leave type: ${kind}`);
              if (entry.leave_reason) lines.push(`Reason: ${entry.leave_reason}`);
            }
            (entry.corrections || []).forEach(c => {
              lines.push(`Correction requested (${c.status}): new time ${fmtTime(c.new_time)}${c.reason ? ` — ${c.reason}` : ""}`);
            });

            return (
              <div style={{ marginTop: 14, padding: "12px 14px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8 }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13 }}>
                  <TbClock size={13} color="#64748b" style={{ marginTop: 2, flexShrink: 0 }} />
                  <div>
                    <strong>{niceDate}</strong>
                    {lines.map((l, i) => <div key={i} style={{ color: i === 0 ? "#0f172a" : "#64748b", marginTop: 3 }}>{l}</div>)}
                  </div>
                </div>

                {/* Only offered for a day you should have checked in for but
                    didn't (LOP) — the "forgot to check in" case these two
                    actions actually resolve. Present/leave/off/pending days
                    have nothing to fix, so no buttons on those. */}
                {entry.status === "lop" && (onApplyLeave || onRequestCorrection) && (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12, paddingTop: 12, borderTop: "1px solid #e2e8f0" }}>
                    {onApplyLeave && (
                      <button type="button" onClick={() => onApplyLeave(selectedDay)} className="btn" style={{ padding: "6px 12px", fontSize: 12 }}>
                        <TbCalendarPlus size={12} /> Apply Leave for this Date
                      </button>
                    )}
                    {onRequestCorrection && (
                      <button type="button" onClick={() => onRequestCorrection(selectedDay)} className="btn" style={{ padding: "6px 12px", fontSize: 12, background: "#f59e0b" }}>
                        <TbEdit size={12} /> Request Correction for this Date
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}
