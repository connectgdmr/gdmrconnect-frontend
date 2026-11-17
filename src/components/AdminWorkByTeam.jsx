import React, { useState, useEffect, useMemo, useCallback } from "react";
import { escHtml } from "../utils/security";
import {
  TbUsers, TbCircleCheck, TbSearch, TbFileTypeCsv, TbFileTypeXls, TbFileTypePdf, TbMessageDots,
  TbChevronDown, TbChevronRight, TbChevronLeft, TbMoonStars, TbAlertTriangle, TbSend, TbUserExclamation, TbChecklist,
} from "react-icons/tb";
import { BarChart, DonutChart, ProgressRing, LineChart } from "./Charts";
import { SkeletonStats, SkeletonTable } from "./Skeleton";
import WorkTasks from "./WorkTasks";

import { API_URL as BASE } from "../api";

// Team work dashboard for managers, admins and owners.
//   Today          — who is planned, who still needs to plan, how far each person is; comment on anyone's day or on a single task
//   Assigned work  — work given to people with deadlines (overdue first), with comments
//   Insights       — the charts (kept, but out of the way)
//   Export         — CSV / Excel / PDF of the day
const ST = { Completed: { c: "#16a34a", b: "#f0fdf4" }, "In Progress": { c: "#2563eb", b: "#eff6ff" }, Started: { c: "#2563eb", b: "#eff6ff" }, Blocked: { c: "#b91c1c", b: "#fef2f2" }, Pending: { c: "#d97706", b: "#fffbeb" } };
const STATUS_META = {
  planned:    { label: "Planned",    c: "#166534", b: "#f0fdf4", e: "#bbf7d0" },
  needs_plan: { label: "Needs plan", c: "#b45309", b: "#fffbeb", e: "#fde68a" },
  not_in:     { label: "Not in",     c: "#b91c1c", b: "#fef2f2", e: "#fecaca" },
  on_leave:   { label: "On leave",   c: "#1d4ed8", b: "#eff6ff", e: "#bfdbfe" },
  off:        { label: "Day off",    c: "#64748b", b: "#f1f5f9", e: "#e2e8f0" },
};
const isoToday = () => new Date().toISOString().slice(0, 10);
const shift = (iso, n) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const nice = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
const done = (t) => ["completed", "done"].includes(String(t.status || "").toLowerCase());

export default function AdminWorkByTeam({ token, role = "admin" }) {
  const canSeeAssigned = ["admin", "owner", "manager"].includes(role);
  const [tab, setTab] = useState(canSeeAssigned ? "assigned" : "today");
  const [date, setDate] = useState(isoToday());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState(null);
  const [search, setSearch] = useState("");
  const [deptF, setDeptF] = useState("all");
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }), [token]);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${BASE}/admin/work-overview?date=${date}`, { headers })
      .then(r => (r.ok ? r.json() : null)).then(d => setData(d || { people: [], totals: {} })).catch(() => setData({ people: [], totals: {} })).finally(() => setLoading(false));
  }, [date, headers]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (tab !== "insights") return;
    fetch(`${BASE}/admin/work-analytics?range=week`, { headers }).then(r => (r.ok ? r.json() : null)).then(d => setAnalytics(d || {})).catch(() => setAnalytics({}));
  }, [tab, headers]);

  const people = useMemo(() => data?.people || [], [data]);
  const totals = data?.totals || {};
  const depts = useMemo(() => [...new Set(people.map(p => p.department).filter(Boolean))].sort(), [people]);
  const shown = people.filter(p => {
    if (deptF !== "all" && p.department !== deptF) return false;
    if (filter !== "all" && p.status !== filter) return false;
    if (search && !`${p.name} ${(p.plan?.tasks || []).map(t => t.title).join(" ")}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const grouped = useMemo(() => {
    const g = {};
    shown.forEach(p => { (g[p.department || "—"] = g[p.department || "—"] || []).push(p); });
    return Object.entries(g).sort((a, b) => a[0].localeCompare(b[0]));
  }, [shown]);
  const workingTotal = (totals.planned || 0) + (totals.needs_plan || 0) + (totals.not_in || 0);

  // comments -------------------------------------------------------------
  async function savePlanComment(plan, text) {
    const r = await fetch(`${BASE}/admin/work-plans/${plan._id}/comment`, { method: "POST", headers, body: JSON.stringify({ comment: text }) });
    if (r.ok) setData(d => ({ ...d, people: d.people.map(p => (p.plan?._id === plan._id ? { ...p, plan: { ...p.plan, manager_comment: text } } : p)) }));
    return r.ok;
  }
  async function saveTaskComment(plan, task, text) {
    const r = await fetch(`${BASE}/admin/work-plans/${plan._id}/task/${task.id || task._id}/comment`, { method: "POST", headers, body: JSON.stringify({ comment: text }) });
    if (r.ok) load();
    return r.ok;
  }

  // export ---------------------------------------------------------------
  const exportRows = () => {
    const rows = [["Employee", "Department", "Check-in", "Task", "Status", "Remarks", "Comment"]];
    shown.forEach(p => (p.plan?.tasks || []).forEach(t => rows.push([p.name, p.department, p.check_in_time || "", t.title, t.status || "Pending", t.remarks || "", t.manager_comment?.text || ""])));
    return rows;
  };
  const download = (content, filename, type) => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 800);
  };
  const exportCSV = (ext = "csv") => download(exportRows().map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n"), `work-${date}.${ext}`, ext === "xls" ? "application/vnd.ms-excel" : "text/csv;charset=utf-8;");
  function exportPDF() {
    const w = window.open("", "_blank", "width=900,height=700"); if (!w) return;
    const rows = exportRows();
    w.document.write(`<html><head><title>Work ${date}</title></head><body style="font-family:Arial"><h2>Work status — ${escHtml(date)}</h2><table style="width:100%;border-collapse:collapse"><thead><tr>${rows[0].map(h => `<th style="text-align:left;padding:8px 10px;border-bottom:2px solid #333;font-size:11px">${escHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.slice(1).map(r => `<tr>${r.map(c => `<td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:12px">${escHtml(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`);
    w.document.close(); setTimeout(() => w.print(), 300);
  }

  const tabBtn = (k, l, show = true) => show && <button key={k} onClick={() => setTab(k)} style={{ padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13, background: tab === k ? "var(--brand)" : "transparent", color: tab === k ? "#fff" : "#64748b" }}>{l}</button>;

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card" style={{ marginBottom: 14 }}>
        <h3 style={{ margin: 0, color: "var(--brand)" }}>Team work</h3>
        <p className="small" style={{ margin: "4px 0 0" }}>See who has planned, how the day is going, and leave a comment where it helps — for {role === "manager" ? "your team" : "every department"}.</p>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 14, background: "#f1f5f9", borderRadius: 10, padding: 4, flexWrap: "wrap", width: "fit-content", maxWidth: "100%" }}>
        {tabBtn("assigned", "Assigned work", canSeeAssigned)}
        {tabBtn("today", "Today")}
        {tabBtn("insights", "Insights")}
        {tabBtn("export", "Export")}
      </div>

      {tab === "assigned" && <WorkTasks token={token} role={role} initialView="team" />}

      {(tab === "today" || tab === "export") && (
        <>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14, alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "4px 6px" }}>
              <button className="btn ghost" style={{ padding: "4px 8px" }} onClick={() => setDate(shift(date, -1))} aria-label="Previous day"><TbChevronLeft /></button>
              <div style={{ minWidth: 150, textAlign: "center", fontWeight: 700, fontSize: 13, color: "#0f172a" }}>{date === isoToday() ? "Today · " : ""}{nice(date)}</div>
              <button className="btn ghost" style={{ padding: "4px 8px" }} onClick={() => setDate(shift(date, 1))} disabled={date >= isoToday()} aria-label="Next day"><TbChevronRight /></button>
            </div>
            {depts.length > 1 && (
              <select className="modern-input" value={deptF} onChange={e => setDeptF(e.target.value)} style={{ margin: 0, maxWidth: 190 }}>
                <option value="all">All departments</option>{depts.map(d => <option key={d}>{d}</option>)}
              </select>
            )}
            <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
              <TbSearch style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
              <input className="modern-input" placeholder="Search a person or task…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36, margin: 0 }} />
            </div>
          </div>

          {loading ? <><SkeletonStats count={4} /><div style={{ marginTop: 14 }}><SkeletonTable rows={5} cols={3} /></div></> : (
            <>
              {tab === "today" && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 14 }}>
                  <Tile icon={<TbCircleCheck />} color="#16a34a" label="Planned their day" value={`${totals.planned || 0}/${workingTotal}`} onClick={() => setFilter("planned")} active={filter === "planned"} />
                  <Tile icon={<TbUserExclamation />} color="#d97706" label="In, but no plan yet" value={totals.needs_plan || 0} onClick={() => setFilter("needs_plan")} active={filter === "needs_plan"} warn={!!totals.needs_plan} />
                  <Tile icon={<TbChecklist />} color="var(--brand)" label="Tasks done" value={`${totals.done || 0}/${totals.tasks || 0}`} />
                  <Tile icon={<TbMoonStars />} color="#6d28d9" label="End-of-day updates" value={`${totals.evening_done || 0}/${totals.planned || 0}`} />
                  {canSeeAssigned && <Tile icon={<TbAlertTriangle />} color="#b91c1c" label="Overdue assigned work" value={totals.assigned_overdue || 0} onClick={() => setTab("assigned")} warn={!!totals.assigned_overdue} />}
                </div>
              )}

              {tab === "today" && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {[["all", "Everyone"], ["planned", "Planned"], ["needs_plan", "Needs plan"], ["not_in", "Not in"], ["on_leave", "On leave"]].map(([k, l]) => (
                    <button key={k} onClick={() => setFilter(k)} style={{ padding: "5px 13px", borderRadius: 99, fontSize: 12.5, fontWeight: 600, cursor: "pointer", border: "1px solid #e2e8f0",
                      background: filter === k ? "var(--brand)" : "#fff", color: filter === k ? "#fff" : "#475569" }}>{l}{k !== "all" && totals[k] != null ? ` · ${totals[k]}` : ""}</button>
                  ))}
                </div>
              )}

              {tab === "export" && (
                <div className="card" style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                  <div style={{ fontSize: 13, color: "#64748b" }}>Export <b>{exportRows().length - 1}</b> tasks from <b>{shown.filter(p => p.plan).length}</b> people for {date}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button className="btn ghost" style={{ fontSize: 12.5 }} onClick={() => exportCSV("csv")}><TbFileTypeCsv /> CSV</button>
                    <button className="btn ghost" style={{ fontSize: 12.5 }} onClick={() => exportCSV("xls")}><TbFileTypeXls /> Excel</button>
                    <button className="btn" style={{ fontSize: 12.5 }} onClick={exportPDF}><TbFileTypePdf /> PDF</button>
                  </div>
                </div>
              )}

              {tab === "today" && (shown.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "46px 20px", color: "#94a3b8" }}><TbUsers size={32} style={{ opacity: 0.25 }} /><p style={{ margin: "8px 0 0" }}>No one matches this view for {nice(date)}.</p></div>
              ) : grouped.map(([dept, list]) => (
                <div key={dept} style={{ marginBottom: 18 }}>
                  {(grouped.length > 1 || deptF === "all") && depts.length > 1 && <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase", color: "#64748b", margin: "0 0 8px 2px" }}>{dept}</div>}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {list.map(p => (
                      <PersonRow key={p.user_id} p={p} open={expanded === p.user_id} onToggle={() => setExpanded(expanded === p.user_id ? null : p.user_id)}
                        onPlanComment={savePlanComment} onTaskComment={saveTaskComment} />
                    ))}
                  </div>
                </div>
              )))}
            </>
          )}
        </>
      )}

      {tab === "insights" && <Insights people={people} analytics={analytics} />}
    </div>
  );
}

function Tile({ icon, color, label, value, onClick, active, warn }) {
  return (
    <div className="card" onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 12, cursor: onClick ? "pointer" : "default", margin: 0, padding: "12px 14px",
      outline: active ? `2px solid ${color}` : "none", background: warn ? "#fffdf7" : undefined }}>
      <div style={{ width: 40, height: 40, borderRadius: 11, background: "#f8fafc", color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19, flexShrink: 0 }}>{icon}</div>
      <div><div style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", lineHeight: 1.1 }}>{value}</div><div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>{label}</div></div>
    </div>
  );
}

function PersonRow({ p, open, onToggle, onPlanComment, onTaskComment }) {
  const meta = STATUS_META[p.status] || STATUS_META.off;
  const tasks = (p.plan?.tasks || []).filter(t => String(t.title || "").trim());
  const nDone = tasks.filter(done).length;
  const pct = tasks.length ? Math.round((nDone / tasks.length) * 100) : 0;
  const [text, setText] = useState(p.plan?.manager_comment || "");
  const [msg, setMsg] = useState("");
  const canOpen = !!p.plan;

  return (
    <div className="card" style={{ padding: 0, margin: 0, overflow: "hidden" }}>
      <div onClick={canOpen ? onToggle : undefined} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", cursor: canOpen ? "pointer" : "default", flexWrap: "wrap" }}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: "var(--brand-light)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, flexShrink: 0 }}>{p.name?.[0]?.toUpperCase() || "?"}</div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{p.name}{p.role === "manager" && <span style={{ marginLeft: 6, fontSize: 10.5, color: "#64748b", fontWeight: 600 }}>Manager</span>}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{p.check_in_time ? `In at ${p.check_in_time}` : p.status === "on_leave" ? "On approved leave" : p.status === "off" ? "Not a working day" : "Not checked in"}</div>
        </div>
        {p.status === "planned" && (
          <div style={{ minWidth: 150, flex: "0 1 190px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "#64748b", marginBottom: 3 }}><span>{nDone} of {tasks.length} done</span><span>{pct}%</span></div>
            <div style={{ height: 6, background: "#eef2f6", borderRadius: 99, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? "#16a34a" : "var(--brand)" }} /></div>
          </div>
        )}
        {p.status === "planned" && (
          <span title="End-of-day update" style={{ fontSize: 11, fontWeight: 700, borderRadius: 7, padding: "3px 9px", whiteSpace: "nowrap",
            color: p.plan?.evening_submitted_at ? "#6d28d9" : "#94a3b8", background: p.plan?.evening_submitted_at ? "#f5f3ff" : "#f8fafc", border: `1px solid ${p.plan?.evening_submitted_at ? "#ddd6fe" : "#e2e8f0"}` }}>
            {p.plan?.evening_submitted_at ? "Day update ✓" : "Day update pending"}
          </span>
        )}
        <span style={{ fontSize: 11.5, fontWeight: 700, color: meta.c, background: meta.b, border: `1px solid ${meta.e}`, borderRadius: 7, padding: "3px 10px", whiteSpace: "nowrap" }}>{meta.label}</span>
        {canOpen && (open ? <TbChevronDown color="#94a3b8" /> : <TbChevronRight color="#94a3b8" />)}
      </div>

      {open && p.plan && (
        <div style={{ borderTop: "1px solid #f1f5f9", padding: "10px 16px 14px" }}>
          {tasks.map((t, i) => <TaskLine key={t.id || t._id || i} t={t} last={i === tasks.length - 1} onComment={(txt) => onTaskComment(p.plan, t, txt)} />)}
          {p.plan.evening_summary && <div style={{ marginTop: 8, padding: "8px 12px", background: "#f5f3ff", borderRadius: 8, fontSize: 12.5, color: "#4c1d95" }}><b>End-of-day note:</b> {p.plan.evening_summary}</div>}
          <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <textarea className="modern-input" rows={1} style={{ margin: 0, flex: 1, resize: "vertical", fontSize: 13 }} placeholder={`Comment on ${p.name.split(" ")[0]}'s day (optional)…`} value={text} maxLength={600} onChange={e => { setText(e.target.value); setMsg(""); }} />
            <button className="btn" style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }} disabled={!text.trim() || text === (p.plan.manager_comment || "")}
              onClick={async () => setMsg((await onPlanComment(p.plan, text.trim())) ? "Saved" : "Could not save")}><TbSend /> Save</button>
          </div>
          {msg && <div style={{ fontSize: 12, color: msg === "Saved" ? "#16a34a" : "#b91c1c", marginTop: 4 }}>{msg}</div>}
        </div>
      )}
    </div>
  );
}

function TaskLine({ t, last, onComment }) {
  const st = ST[t.status] || ST.Pending;
  const [editing, setEditing] = useState(false);
  const [txt, setTxt] = useState(t.manager_comment?.text || "");
  return (
    <div style={{ padding: "9px 0", borderBottom: last ? "none" : "1px solid #f4f6f8" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, color: done(t) ? "#94a3b8" : "#1e293b", textDecoration: done(t) ? "line-through" : "none" }}>{t.title}{t.client && <span style={{ marginLeft: 8, fontSize: 11, color: "#0f766e", fontWeight: 600 }}>🏢 {t.client}</span>}</div>
          {t.remarks && <div style={{ fontSize: 12.5, color: "#475569", marginTop: 3 }}><b>Remarks:</b> {t.remarks}</div>}
          {t.manager_comment?.text && !editing && <div style={{ fontSize: 12.5, color: "#166534", background: "#f0fdf4", borderRadius: 6, padding: "4px 9px", marginTop: 4, display: "inline-block" }}><TbMessageDots style={{ verticalAlign: -2 }} /> {t.manager_comment.by}: {t.manager_comment.text}</div>}
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: st.c, background: st.b, padding: "2px 9px", borderRadius: 5, flexShrink: 0 }}>{t.status || "Pending"}</span>
        <button className="btn ghost" style={{ fontSize: 11.5, padding: "3px 9px", flexShrink: 0 }} onClick={() => setEditing(!editing)}>{t.manager_comment?.text ? "Edit comment" : "Comment"}</button>
      </div>
      {editing && (
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <input className="modern-input" style={{ margin: 0, flex: 1, fontSize: 12.5 }} placeholder="Short comment on this task…" value={txt} maxLength={600} onChange={e => setTxt(e.target.value)} autoFocus />
          <button className="btn" style={{ fontSize: 12 }} onClick={async () => { if (await onComment(txt.trim())) setEditing(false); }}>Save</button>
        </div>
      )}
    </div>
  );
}

function Insights({ people, analytics }) {
  const plans = people.filter(p => p.plan && p.status === "planned");
  const allTasks = plans.flatMap(p => (p.plan.tasks || []).map(t => ({ ...t, _dept: p.department })));
  const completed = allTasks.filter(done).length;
  const depts = [...new Set(plans.map(p => p.department).filter(Boolean))];
  const agg = depts.map(d => ({ dept: d, tasks: allTasks.filter(t => t._dept === d).length }));
  const Card = ({ title, children, center }) => <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: center ? "center" : "stretch" }}><h4 className="widget-title" style={{ alignSelf: "flex-start" }}>{title}</h4>{children}</div>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
      <Card title="Tasks by department"><BarChart data={agg.map(d => ({ label: d.dept, value: d.tasks }))} /></Card>
      <Card title="Task completion" center><ProgressRing percent={allTasks.length ? Math.round(completed / allTasks.length * 100) : 0} size={150} label={`${completed}/${allTasks.length} tasks`} /></Card>
      <Card title="Weekly productivity"><LineChart data={analytics?.weekly_trend || analytics?.daily_trend || []} valueLabel="tasks" /></Card>
      <Card title="Workload split">{agg.length ? <DonutChart segments={agg.map(d => ({ label: d.dept, value: d.tasks }))} centerLabel={allTasks.length} centerSub="tasks" /> : <div style={{ padding: 30, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No data yet.</div>}</Card>
    </div>
  );
}
