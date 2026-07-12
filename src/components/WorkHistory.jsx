import React, { useState, useEffect } from "react";
import { FaHistory, FaSearch, FaRegClock, FaCheckCircle, FaRedo } from "react-icons/fa";
import { TASK_STATUSES, carryKey } from "./DailyWorkPlan";
import { SkeletonList } from "./Skeleton";

import { API_URL as BASE } from "../api";
const PRI = { High: "#dc2626", Medium: "#d97706", Low: "#16a34a" };
const SM = (s) => TASK_STATUSES.find(x => x.v === s) || TASK_STATUSES[0];

const RANGES = [
  { k: "week",  label: "This Week" },
  { k: "month", label: "This Month" },
  { k: "all",   label: "All Time" },
];

export default function WorkHistory({ token, user }) {
  const [range, setRange]   = useState("month");
  const [plans, setPlans]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [toast, setToast]   = useState("");

  const toArr = (d) => Array.isArray(d) ? d : (d?.plans || d?.data || []);

  // Change a past task's status — persist by re-saving the whole plan for its
  // own date (reliable upsert by date), with optimistic update + revert.
  const changeStatus = async (planId, taskId, ns) => {
    const plan = plans.find(p => p._id === planId);
    if (!plan) return;
    const prevTasks = plan.tasks;
    const newTasks = (plan.tasks || []).map(t => (t.id === taskId || t._id === taskId) ? { ...t, status: ns } : t);
    setPlans(ps => ps.map(p => p._id === planId ? { ...p, tasks: newTasks } : p));
    try {
      const r = await fetch(`${BASE}/my/work-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: plan.date, tasks: newTasks, status: plan.status || "submitted", notify: false }),
      });
      if (!r.ok) throw new Error();
    } catch {
      setPlans(ps => ps.map(p => p._id === planId ? { ...p, tasks: prevTasks } : p));
      setToast("Could not update status. Please try again.");
      setTimeout(() => setToast(""), 4000);
    }
  };

  // Queue an unfinished task to continue in today's plan
  const continueTask = (t) => {
    try {
      const k = carryKey(user?._id);
      const q = JSON.parse(localStorage.getItem(k) || "[]");
      q.push({ title: t.title, priority: t.priority || "Medium", est_time: t.est_time || "", project: t.project || "", client: t.client || "" });
      localStorage.setItem(k, JSON.stringify(q));
      setToast(`"${t.title}" added to today's plan — open your Dashboard to review & submit.`);
      setTimeout(() => setToast(""), 4000);
    } catch {}
  };

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE}/my/work-plans?range=${range}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : []).then(d => setPlans(toArr(d))).catch(() => setPlans([])).finally(() => setLoading(false));
  }, [range, token]);

  const fmtDate = (iso) => { try { return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }); } catch { return iso; } };

  // Sort plans newest first, filter tasks by search + status
  const days = [...plans]
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
    .map(p => ({
      ...p,
      tasks: (p.tasks || []).filter(t =>
        (!search || t.title?.toLowerCase().includes(search.toLowerCase())) &&
        (statusF === "all" || t.status === statusF)
      ),
    }))
    .filter(p => p.tasks.length > 0);

  // Totals
  const allTasks = plans.flatMap(p => p.tasks || []);
  const totals = {
    total: allTasks.length,
    completed: allTasks.filter(t => t.status === "Completed").length,
    progress: allTasks.filter(t => t.status === "In Progress" || t.status === "Started").length,
    pending: allTasks.filter(t => t.status === "Pending").length,
  };

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, color: "var(--brand)" }}>Work History</h3>
          <p className="small">Everything you've worked on, day by day, with status</p>
        </div>
        <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 99, padding: 4 }}>
          {RANGES.map(r => (
            <button key={r.k} onClick={() => setRange(r.k)} style={{ padding: "6px 16px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 12.5, fontWeight: 600, background: range === r.k ? "var(--brand)" : "transparent", color: range === r.k ? "#fff" : "#64748b" }}>{r.label}</button>
          ))}
        </div>
      </div>

      {toast && (
        <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500, background: "#f0fdf4", color: "#16a34a", border: "1px solid #bbf7d0" }}>
          ✓ {toast}
        </div>
      )}

      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Total Tasks", value: totals.total, color: "#334155", bg: "#f8fafc" },
          { label: "Completed", value: totals.completed, color: "#16a34a", bg: "#f0fdf4" },
          { label: "In Progress", value: totals.progress, color: "#d97706", bg: "#fffbeb" },
          { label: "Pending", value: totals.pending, color: "#64748b", bg: "#f1f5f9" },
        ].map(s => (
          <div key={s.label} className="card" style={{ textAlign: "center", padding: 14, background: s.bg }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <FaSearch style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
          <input className="modern-input" placeholder="Search tasks…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36, margin: 0 }} />
        </div>
        <select className="modern-input" value={statusF} onChange={e => setStatusF(e.target.value)} style={{ margin: 0, maxWidth: 180 }}>
          <option value="all">All Statuses</option>
          {TASK_STATUSES.map(s => <option key={s.v} value={s.v}>{s.v}</option>)}
        </select>
      </div>

      {loading ? <SkeletonList count={4} />
      : days.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8" }}>
          <FaHistory size={34} style={{ opacity: 0.2, marginBottom: 10 }} />
          <p style={{ margin: 0 }}>No work history for this period.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {days.map(p => {
            const done = p.tasks.filter(t => t.status === "Completed").length;
            return (
              <div key={p._id || p.date} className="card" style={{ padding: 0, overflow: "hidden" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", background: "#f8fafc", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 6, height: 20, background: "var(--brand)", borderRadius: 3 }} />
                    <span style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{fmtDate(p.date)}</span>
                  </div>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--brand)", background: "var(--brand-light)", padding: "3px 10px", borderRadius: 99 }}>{done}/{p.tasks.length} done</span>
                </div>
                <div style={{ padding: "8px 18px 12px" }}>
                  {p.tasks.map((t, i) => {
                    const sm = SM(t.status);
                    const tid = t.id || t._id;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: i < p.tasks.length - 1 ? "1px solid #f8fafc" : "none", flexWrap: "wrap" }}>
                        <span style={{ width: 8, height: 8, borderRadius: "50%", background: PRI[t.priority] || "#94a3b8", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 140 }}>
                          <div style={{ fontSize: 13, color: t.status === "Completed" ? "#94a3b8" : "#334155", textDecoration: t.status === "Completed" ? "line-through" : "none" }}>{t.title}</div>
                          {(t.client || t.project || t.est_time) && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{t.client && <span style={{ color: "#0f766e", fontWeight: 600 }}>🏢 {t.client} · </span>}{t.project} {t.est_time && `· ${t.est_time}`}</div>}
                        </div>
                        {t.status !== "Completed" && (
                          <button onClick={() => continueTask(t)} title="Continue this in today's plan"
                            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--brand)", background: "var(--brand-light)", border: "1px solid #bbf7d0", borderRadius: 7, padding: "4px 9px", cursor: "pointer", flexShrink: 0 }}>
                            <FaRedo size={9} /> Continue
                          </button>
                        )}
                        <select value={t.status || "Pending"} onChange={e => changeStatus(p._id, tid, e.target.value)} title="Change status"
                          style={{ fontSize: 10.5, fontWeight: 700, color: sm.color, background: sm.bg, border: `1px solid ${sm.color}33`, borderRadius: 99, padding: "4px 9px", cursor: "pointer", flexShrink: 0, appearance: "none", textAlign: "center" }}>
                          {TASK_STATUSES.map(s => <option key={s.v} value={s.v} style={{ color: "#334155", background: "#fff" }}>{s.v}</option>)}
                        </select>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
