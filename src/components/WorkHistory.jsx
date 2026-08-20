import React, { useState, useEffect, useMemo } from "react";
import { TbHistory, TbSearch, TbRefresh, TbDownload } from "react-icons/tb";
import { TASK_STATUSES, carryKey } from "./DailyWorkPlan";
import { SkeletonList } from "./Skeleton";

import { API_URL as BASE } from "../api";
const SM = (s) => TASK_STATUSES.find(x => x.v === s) || TASK_STATUSES[0];

const RANGES = [
  { k: "week",  label: "This Week" },
  { k: "month", label: "This Month" },
  { k: "all",   label: "All Time" },
];

function toCSV(rows) {
  const header = ["Date", "Work Done", "Type", "Client", "Status"];
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [header.map(esc).join(",")];
  rows.forEach(r => lines.push([r.date, r.title, r.work_type, r.client, r.status].map(esc).join(",")));
  return lines.join("\n");
}

export default function WorkHistory({ token, user }) {
  const [range, setRange]   = useState("month");
  const [plans, setPlans]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusF, setStatusF] = useState("all");
  const [typeF, setTypeF]     = useState("all");
  const [clientF, setClientF] = useState("all");
  const [toast, setToast]   = useState("");
  const [customStatusIds, setCustomStatusIds] = useState(new Set());

  const toArr = (d) => Array.isArray(d) ? d : (d?.plans || d?.data || []);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE}/my/work-plans?range=${range}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : []).then(d => setPlans(toArr(d))).catch(() => setPlans([])).finally(() => setLoading(false));
  }, [range, token]);

  // Flatten day-plans into one row per task — matches the Date | Work Done | Type | Client | Status table
  const allRows = useMemo(() => plans.flatMap(p => (p.tasks || []).map(t => ({
    planId: p._id, date: p.date, taskId: t.id || t._id,
    title: t.title, work_type: t.work_type || "", client: t.client || "", status: t.status || "Pending",
  }))), [plans]);

  const typeOptions = useMemo(() => [...new Set(allRows.map(r => r.work_type).filter(Boolean))].sort(), [allRows]);
  const clientOptions = useMemo(() => [...new Set(allRows.map(r => r.client).filter(Boolean))].sort(), [allRows]);
  // Custom (non-standard) statuses that show up in the data, so the filter can find them too
  const customStatusOptions = useMemo(() => [...new Set(allRows.map(r => r.status).filter(s => s && !TASK_STATUSES.some(x => x.v === s)))].sort(), [allRows]);

  const rows = allRows
    .filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()))
    .filter(r => statusF === "all" || r.status === statusF)
    .filter(r => typeF === "all" || r.work_type === typeF)
    .filter(r => clientF === "all" || r.client === clientF)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  const totals = {
    total: allRows.length,
    completed: allRows.filter(r => r.status === "Completed").length,
    progress: allRows.filter(r => r.status === "In Progress" || r.status === "Started").length,
    pending: allRows.filter(r => r.status === "Pending").length,
  };

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
  const continueTask = (r) => {
    try {
      const k = carryKey(user?._id);
      const q = JSON.parse(localStorage.getItem(k) || "[]");
      q.push({ title: r.title, work_type: r.work_type || "", client: r.client || "" });
      localStorage.setItem(k, JSON.stringify(q));
      setToast(`"${r.title}" added to today's plan — open your Dashboard to review & submit.`);
      setTimeout(() => setToast(""), 4000);
    } catch {}
  };

  function exportCSV() {
    const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `work-history-${range}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const fmtDate = (iso) => { try { return new Date(iso + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); } catch { return iso; } };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
        <div>
          <h4 className="widget-title" style={{ margin: 0 }}>Work History</h4>
          <p className="small" style={{ margin: "3px 0 0" }}>Everything you've worked on, day by day, with status</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 99, padding: 4 }}>
            {RANGES.map(r => (
              <button key={r.k} onClick={() => setRange(r.k)} style={{ padding: "6px 14px", borderRadius: 99, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, background: range === r.k ? "var(--brand)" : "transparent", color: range === r.k ? "#fff" : "#64748b" }}>{r.label}</button>
            ))}
          </div>
          <button className="btn ghost" onClick={exportCSV} disabled={rows.length === 0} style={{ fontSize: 12, padding: "6px 14px", display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" }}>
            <TbDownload size={10} /> Export
          </button>
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
          <div key={s.label} style={{ textAlign: "center", padding: 14, background: s.bg, borderRadius: 10, border: "1px solid #f1f5f9" }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 180 }}>
          <TbSearch style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
          <input className="modern-input" placeholder="Search work done…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36, margin: 0 }} />
        </div>
        <select className="modern-input" value={typeF} onChange={e => setTypeF(e.target.value)} style={{ margin: 0, maxWidth: 160 }}>
          <option value="all">All Types</option>
          {typeOptions.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="modern-input" value={clientF} onChange={e => setClientF(e.target.value)} style={{ margin: 0, maxWidth: 160 }}>
          <option value="all">All Clients</option>
          {clientOptions.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="modern-input" value={statusF} onChange={e => setStatusF(e.target.value)} style={{ margin: 0, maxWidth: 160 }}>
          <option value="all">All Statuses</option>
          {TASK_STATUSES.map(s => <option key={s.v} value={s.v}>{s.v}</option>)}
          {customStatusOptions.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? <SkeletonList count={4} />
      : rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8" }}>
          <TbHistory size={34} style={{ opacity: 0.2, marginBottom: 10 }} />
          <p style={{ margin: 0 }}>No work history matches your filters.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table className="styled-table-global">
            <thead>
              <tr>
                <th>Date</th>
                <th>Work Done</th>
                <th>Type</th>
                <th>Client</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const sm = SM(r.status);
                return (
                  <tr key={`${r.planId}-${r.taskId}-${i}`}>
                    <td style={{ whiteSpace: "nowrap", fontSize: 13, color: "#64748b" }}>{fmtDate(r.date)}</td>
                    <td style={{ fontSize: 13.5, color: r.status === "Completed" ? "#94a3b8" : "#334155", textDecoration: r.status === "Completed" ? "line-through" : "none" }}>{r.title}</td>
                    <td>{r.work_type ? <span style={{ fontSize: 11, fontWeight: 700, color: "var(--brand)", background: "var(--brand-light)", borderRadius: 99, padding: "2px 9px" }}>{r.work_type}</span> : <span style={{ color: "#cbd5e1" }}>—</span>}</td>
                    <td style={{ fontSize: 12.5, color: "#0f766e", fontWeight: 600 }}>{r.client || <span style={{ color: "#cbd5e1", fontWeight: 400 }}>—</span>}</td>
                    <td>
                      {(() => {
                        const rowKey = `${r.planId}-${r.taskId}`;
                        const isCustom = customStatusIds.has(rowKey) || (r.status && !TASK_STATUSES.some(s => s.v === r.status));
                        if (isCustom) {
                          return (
                            <input
                              autoFocus defaultValue={r.status} placeholder="Type a status…" title="Custom status"
                              onKeyDown={e => { if (e.key !== "Enter") return; const v = e.target.value.trim(); setCustomStatusIds(s => { const n = new Set(s); n.delete(rowKey); return n; }); if (v) changeStatus(r.planId, r.taskId, v); }}
                              onBlur={e => { const v = e.target.value.trim(); setCustomStatusIds(s => { const n = new Set(s); n.delete(rowKey); return n; }); if (v) changeStatus(r.planId, r.taskId, v); }}
                              style={{ fontSize: 10.5, fontWeight: 700, color: "#334155", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 99, padding: "4px 9px", width: 120, textAlign: "center" }}
                            />
                          );
                        }
                        return (
                          <select
                            value={r.status}
                            onChange={e => { if (e.target.value === "__custom__") setCustomStatusIds(s => new Set(s).add(rowKey)); else changeStatus(r.planId, r.taskId, e.target.value); }}
                            title="Change status"
                            style={{ fontSize: 10.5, fontWeight: 700, color: sm.color, background: sm.bg, border: `1px solid ${sm.color}33`, borderRadius: 99, padding: "4px 9px", cursor: "pointer", appearance: "none", textAlign: "center" }}>
                            {TASK_STATUSES.map(s => <option key={s.v} value={s.v} style={{ color: "#334155", background: "#fff" }}>{s.v}</option>)}
                            <option value="__custom__" style={{ color: "#334155", background: "#fff" }}>Custom…</option>
                          </select>
                        );
                      })()}
                    </td>
                    <td>
                      {r.status !== "Completed" && (
                        <button onClick={() => continueTask(r)} title="Continue this in today's plan"
                          style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "var(--brand)", background: "var(--brand-light)", border: "1px solid #bbf7d0", borderRadius: 7, padding: "4px 9px", cursor: "pointer", whiteSpace: "nowrap" }}>
                          <TbRefresh size={9} /> Continue
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
