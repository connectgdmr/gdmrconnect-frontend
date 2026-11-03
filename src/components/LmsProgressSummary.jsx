import React, { useEffect, useMemo, useState } from "react";
import { TbX, TbSearch, TbUsers, TbCircleCheck, TbPlayerPlay, TbClockPause, TbAlertTriangle, TbCalendarEvent, TbListCheck } from "react-icons/tb";
import { LMS_STATE_STYLE } from "../utils/lmsState";

// Overall view for the Employee Progress tab: one tile per state (counts), each opening a pop-up that lists
// the people behind that number with their department, course, progress and due date.
const rowPct = (row) => {
  const raw = row.percent_complete ?? row.percentComplete ?? row.progress ?? row.completion ?? row.percent;
  const total = row.total_lessons ?? row.totalLessons;
  const done = row.completed_lessons ?? row.completedLessons;
  return Math.round(raw != null ? raw : (total ? ((typeof done === "number" ? done : 0) / total) * 100 : 0));
};
const rowState = (row) => {
  const pct = rowPct(row);
  return row.state || (pct >= 100 ? "Completed" : pct > 0 ? "In Progress" : "Not Started");
};
const fmt = (v) => (v ? new Date(v).toLocaleDateString("en-GB") : "—");
const personKey = (r) => r.employee_id || r.user_id || r.employee_name;

const stateTile = (key, label, icon) => {
  const s = LMS_STATE_STYLE[key];
  return { key, label, icon, color: s.color, bg: s.bg, edge: s.border };
};
const TILES = [
  { key: "all", label: "Total Assignments", icon: <TbListCheck />, color: "#0f172a", bg: "#f8fafc", edge: "#e2e8f0" },
  stateTile("Completed", "Completed", <TbCircleCheck />),
  stateTile("In Progress", "In Progress", <TbPlayerPlay />),
  stateTile("Not Started", "Not Started", <TbClockPause />),
  stateTile("Overdue", "Overdue", <TbAlertTriangle />),
  stateTile("Scheduled", "Scheduled", <TbCalendarEvent />),
];

export default function LmsProgressSummary({ rows }) {
  const [open, setOpen] = useState(null);      // tile key
  const [q, setQ] = useState("");
  const [dept, setDept] = useState("all");

  const withState = useMemo(() => rows.map(r => ({ ...r, _state: rowState(r), _pct: rowPct(r) })), [rows]);
  const counts = useMemo(() => {
    const c = { all: withState.length };
    withState.forEach(r => { c[r._state] = (c[r._state] || 0) + 1; });
    return c;
  }, [withState]);
  const people = useMemo(() => new Set(withState.map(personKey)).size, [withState]);
  const rate = withState.length ? Math.round(((counts["Completed"] || 0) / withState.length) * 100) : 0;

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const tile = TILES.find(t => t.key === open);
  const inTile = useMemo(
    () => (open ? withState.filter(r => open === "all" || r._state === open) : []),
    [open, withState]
  );
  const list = useMemo(() => inTile
    .filter(r => dept === "all" || (r.department || "—") === dept)
    .filter(r => !q || `${r.employee_name} ${r.course_title}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => String(a.department || "").localeCompare(String(b.department || "")) || String(a.employee_name || "").localeCompare(String(b.employee_name || ""))),
  [inTile, dept, q]);
  const popupDepts = useMemo(() => [...new Set(inTile.map(r => r.department || "—"))].sort(), [inTile]);
  const popupPeople = new Set(list.map(personKey)).size;

  const openTile = (k) => { setOpen(k); setQ(""); setDept("all"); };

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>Learning overview</div>
          <div style={{ fontSize: 12.5, color: "#64748b", display: "flex", alignItems: "center", gap: 6 }}>
            <TbUsers /> {people} employee{people === 1 ? "" : "s"} · <b style={{ color: "#166534" }}>{rate}%</b> of assignments completed
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          {TILES.map(t => {
            const n = counts[t.key] || 0;
            return (
              <button key={t.key} type="button" onClick={() => openTile(t.key)} disabled={n === 0}
                style={{ textAlign: "left", background: t.bg, border: `1px solid ${t.edge}`, borderRadius: 12, padding: "12px 14px", cursor: n ? "pointer" : "default",
                         opacity: n ? 1 : 0.55, transition: "transform .12s, box-shadow .12s", font: "inherit" }}
                onMouseEnter={e => { if (n) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(15,23,42,.08)"; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, color: t.color, fontSize: 12.5, fontWeight: 600 }}>{t.icon}{t.label}</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: t.color, lineHeight: 1.2, marginTop: 4 }}>{n}</div>
                <div style={{ fontSize: 11, color: "#64748b" }}>{n ? "Click to view people" : "None"}</div>
              </button>
            );
          })}
        </div>
        <div style={{ height: 6, borderRadius: 4, background: "#e2e8f0", marginTop: 12, overflow: "hidden", display: "flex" }} title="Share of assignments by state">
          {["Completed", "In Progress", "Overdue", "Scheduled", "Not Started"].map(s => {
            const w = withState.length ? ((counts[s] || 0) / withState.length) * 100 : 0;
            return w ? <div key={s} style={{ width: `${w}%`, background: LMS_STATE_STYLE[s].color, opacity: s === "Not Started" ? 0.35 : 0.85 }} /> : null;
          })}
        </div>
      </div>

      {open && tile && (
        <div onClick={() => setOpen(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
               style={{ background: "#fff", borderRadius: 16, width: "min(980px, 100%)", maxHeight: "88vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 60px rgba(15,23,42,.25)", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #eef2f6", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ width: 38, height: 38, borderRadius: 10, background: tile.bg, color: tile.color, border: `1px solid ${tile.edge}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{tile.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>{tile.label}</div>
                <div style={{ fontSize: 12.5, color: "#64748b" }}>{list.length} assignment{list.length === 1 ? "" : "s"} · {popupPeople} employee{popupPeople === 1 ? "" : "s"}</div>
              </div>
              <button onClick={() => setOpen(null)} aria-label="Close" style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 32, height: 32, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><TbX /></button>
            </div>
            <div style={{ padding: "12px 20px", display: "flex", gap: 10, flexWrap: "wrap", borderBottom: "1px solid #eef2f6" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                <TbSearch style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
                <input className="modern-input" placeholder="Search employee or course…" value={q} onChange={e => setQ(e.target.value)} style={{ paddingLeft: 36, margin: 0 }} />
              </div>
              <select className="modern-input" value={dept} onChange={e => setDept(e.target.value)} style={{ margin: 0, minWidth: 180 }}>
                <option value="all">All Departments</option>
                {popupDepts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div style={{ overflow: "auto" }}>
              {list.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No one matches.</div> : (
                <table className="styled-table-global" style={{ width: "100%" }}>
                  <thead><tr><th>Employee</th><th>Department</th><th>Course</th><th>Progress</th><th>Due</th><th>Status</th></tr></thead>
                  <tbody>
                    {list.map((r, i) => {
                      const st = LMS_STATE_STYLE[r._state] || LMS_STATE_STYLE["Not Started"];
                      return (
                        <tr key={r._id || i}>
                          <td style={{ fontWeight: 600 }}>{r.employee_name}</td>
                          <td style={{ fontSize: 13, color: "#64748b" }}>{r.department || "—"}</td>
                          <td style={{ fontSize: 13 }}>{r.course_title}</td>
                          <td style={{ minWidth: 130 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{ flex: 1, height: 6, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}><div style={{ width: `${Math.min(100, r._pct)}%`, height: "100%", background: st.color }} /></div>
                              <span style={{ fontSize: 12, fontWeight: 700, color: "#334155", minWidth: 34 }}>{r._pct}%</span>
                            </div>
                          </td>
                          <td style={{ fontSize: 12.5, whiteSpace: "nowrap", color: r._state === "Overdue" ? "#b91c1c" : "#334155", fontWeight: r._state === "Overdue" ? 700 : 400 }}>{r.due_date ? fmt(r.due_date) : "No due date"}</td>
                          <td><span style={{ fontSize: 11, fontWeight: 700, color: st.color, background: st.bg, border: `1px solid ${st.border}`, borderRadius: 7, padding: "3px 9px", whiteSpace: "nowrap" }}>{r._state}</span></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
