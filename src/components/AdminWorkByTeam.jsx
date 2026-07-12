import React, { useState, useEffect } from "react";
import {
  FaUsers, FaTasks, FaCheckCircle, FaHourglassHalf, FaSearch, FaFilter,
  FaFileCsv, FaFileExcel, FaFilePdf, FaRegCommentDots, FaChevronDown, FaChevronRight, FaTimes,
} from "react-icons/fa";
import { BarChart, DonutChart, ProgressRing, LineChart } from "./Charts";
import { SkeletonStats, SkeletonTable } from "./Skeleton";

import { API_URL as BASE } from "../api";
const PRI = { High: "#dc2626", Medium: "#d97706", Low: "#16a34a" };
const ST  = { Completed: { c: "#16a34a", b: "#f0fdf4" }, "In Progress": { c: "#2563eb", b: "#eff6ff" }, Pending: { c: "#d97706", b: "#fffbeb" } };

export default function AdminWorkByTeam({ token, role = "admin" }) {
  const today = new Date().toISOString().slice(0, 10);
  const [tab, setTab]       = useState("overview");
  const [date, setDate]     = useState(today);
  const [plans, setPlans]   = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aLoading, setALoading] = useState(false);

  const [search, setSearch]   = useState("");
  const [deptF, setDeptF]     = useState("all");
  const [statusF, setStatusF] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [commentPlan, setCommentPlan] = useState(null);
  const [commentText, setCommentText] = useState("");

  const toArr = (d) => Array.isArray(d) ? d : (d?.plans || d?.data || []);

  function loadPlans() {
    setLoading(true);
    fetch(`${BASE}/admin/work-plans?date=${date}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : []).then(d => setPlans(toArr(d))).catch(() => setPlans([])).finally(() => setLoading(false));
  }
  function loadAnalytics() {
    setALoading(true);
    fetch(`${BASE}/admin/work-analytics?range=week`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(d => setAnalytics(d || {})).catch(() => setAnalytics({})).finally(() => setALoading(false));
  }
  useEffect(() => { loadPlans(); }, [date]);
  useEffect(() => { if (tab === "overview") loadAnalytics(); }, [tab]);

  // Derived from plans
  const safePlans = Array.isArray(plans) ? plans : [];
  const allTasks = safePlans.flatMap(p => (p.tasks || []).map(t => ({ ...t, _dept: p.department, _emp: p.employee_name })));
  const completed = allTasks.filter(t => t.status === "Completed").length;
  const pending   = allTasks.filter(t => t.status !== "Completed").length;
  const depts = [...new Set(safePlans.map(p => p.department).filter(Boolean))];

  // Dept-wise aggregation
  const deptAgg = depts.map(d => {
    const ps = safePlans.filter(p => p.department === d);
    const ts = ps.flatMap(p => p.tasks || []);
    return { dept: d, employees: ps.length, tasks: ts.length, completed: ts.filter(t => t.status === "Completed").length };
  });

  const filtered = safePlans.filter(p => {
    const mS = !search || p.employee_name?.toLowerCase().includes(search.toLowerCase()) || (p.tasks || []).some(t => t.title?.toLowerCase().includes(search.toLowerCase()));
    const mD = deptF === "all" || p.department === deptF;
    const mSt = statusF === "all" || (p.tasks || []).some(t => statusF === "completed" ? t.status === "Completed" : t.status !== "Completed");
    return mS && mD && mSt;
  });

  // ── Exports ──
  function exportRows() {
    const rows = [["Employee", "Department", "Check-in", "Task", "Priority", "Project", "Status"]];
    filtered.forEach(p => (p.tasks || []).forEach(t => rows.push([p.employee_name, p.department || "", p.check_in_time || "", t.title, t.priority || "", t.project || "", t.status || "Pending"])));
    return rows;
  }
  function download(content, filename, type) {
    const blob = new Blob([content], { type }); const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 800);
  }
  function exportCSV(ext = "csv") {
    const csv = exportRows().map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    download(csv, `work-plans-${date}.${ext}`, ext === "xls" ? "application/vnd.ms-excel" : "text/csv;charset=utf-8;");
  }
  function exportPDF() {
    const w = window.open("", "_blank", "width=900,height=700"); if (!w) return;
    const rows = exportRows();
    const body = rows.slice(1).map(r => `<tr>${r.map(c => `<td style="padding:6px 10px;border-bottom:1px solid #eee;font-size:12px">${c}</td>`).join("")}</tr>`).join("");
    w.document.write(`<html><head><title>Work Plans ${date}</title></head><body style="font-family:Arial">
      <h2 style="color:#34a06a">GDMR Connect — Work Plans (${date})</h2>
      <table style="width:100%;border-collapse:collapse"><thead><tr>${rows[0].map(h => `<th style="text-align:left;padding:8px 10px;border-bottom:2px solid #34a06a;font-size:11px;text-transform:uppercase;color:#475569">${h}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table>
      </body></html>`);
    w.document.close(); setTimeout(() => w.print(), 300);
  }

  async function saveComment() {
    if (!commentText.trim()) return;
    try {
      await fetch(`${BASE}/admin/work-plans/${commentPlan._id}/comment`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ comment: commentText }),
      });
      setPlans(ps => ps.map(p => p._id === commentPlan._id ? { ...p, manager_comment: commentText } : p));
      setCommentPlan(null); setCommentText("");
    } catch {}
  }

  const tabBtn = (k, l) => <button key={k} onClick={() => setTab(k)} style={{ padding: "8px 18px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 13, background: tab === k ? "var(--brand)" : "transparent", color: tab === k ? "#fff" : "#64748b" }}>{l}</button>;

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: "var(--brand)" }}>Work by Team</h3>
        <p className="small">Daily plans, task progress and productivity across {role === "manager" ? "your team" : "every department"}</p>
      </div>

      <div style={{ display: "flex", gap: 4, marginBottom: 16, background: "#f1f5f9", borderRadius: 10, padding: 4, flexWrap: "wrap" }}>
        {tabBtn("overview", "Team Overview")}
        {tabBtn("plans", "Work Plans")}
        {tabBtn("reports", "Reports & Export")}
      </div>

      {/* ── OVERVIEW ── */}
      {tab === "overview" && (
        aLoading ? <><SkeletonStats count={4} /><div style={{ marginTop: 14 }}><SkeletonTable rows={5} cols={3} /></div></> : (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 16 }}>
            {[
              { icon: <FaUsers />,        label: "Employees Active Today", value: safePlans.length, color: "var(--brand)", bg: "var(--brand-light)" },
              { icon: <FaTasks />,        label: "Total Tasks",            value: allTasks.length,  color: "#0f766e", bg: "#effdf8" },
              { icon: <FaCheckCircle />,  label: "Completed",              value: completed,        color: "#16a34a", bg: "#f0fdf4" },
              { icon: <FaHourglassHalf />,label: "Pending",                value: pending,          color: "#d97706", bg: "#fffbeb" },
            ].map(s => (
              <div key={s.label} className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: s.bg, color: s.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{s.icon}</div>
                <div><div style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", lineHeight: 1 }}>{s.value}</div><div style={{ fontSize: 12, color: "#64748b", marginTop: 3 }}>{s.label}</div></div>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, alignItems: "start", marginBottom: 16 }} className="wbt-grid">
            <div className="card">
              <h4 className="widget-title">Department Activity Comparison</h4>
              <BarChart data={deptAgg.map(d => ({ label: d.dept, value: d.tasks }))} />
            </div>
            <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <h4 className="widget-title" style={{ alignSelf: "flex-start" }}>Task Completion Rate</h4>
              <ProgressRing percent={allTasks.length ? Math.round(completed / allTasks.length * 100) : 0} size={150} label={`${completed}/${allTasks.length} tasks`} />
            </div>
            <div className="card">
              <h4 className="widget-title">Weekly Productivity Trend</h4>
              <LineChart data={analytics?.weekly_trend || analytics?.daily_trend || []} valueLabel="tasks" />
            </div>
            <div className="card">
              <h4 className="widget-title">Workload Distribution</h4>
              {deptAgg.length ? <DonutChart segments={deptAgg.map(d => ({ label: d.dept, value: d.tasks }))} centerLabel={allTasks.length} centerSub="tasks" /> : <div style={{ padding: 30, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No data yet.</div>}
            </div>
          </div>

          {/* Dept summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            {deptAgg.map(d => {
              const pct = d.tasks ? Math.round(d.completed / d.tasks * 100) : 0;
              return (
                <div key={d.dept} className="card">
                  <div style={{ fontWeight: 700, color: "#0f172a", marginBottom: 10 }}>{d.dept}</div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: "#64748b", marginBottom: 4 }}><span>{d.employees} active</span><span>{d.completed}/{d.tasks} done</span></div>
                  <div style={{ height: 7, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}><div style={{ width: `${pct}%`, height: "100%", background: "var(--brand)", borderRadius: 99 }} /></div>
                </div>
              );
            })}
          </div>
        </div>
        )
      )}

      {/* ── WORK PLANS ── */}
      {(tab === "plans" || tab === "reports") && (
        <>
          {/* Filters */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
              <FaSearch style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
              <input className="modern-input" placeholder="Search employee or task…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36, margin: 0 }} />
            </div>
            <input type="date" className="modern-input" value={date} onChange={e => setDate(e.target.value)} style={{ margin: 0, maxWidth: 170 }} />
            <select className="modern-input" value={deptF} onChange={e => setDeptF(e.target.value)} style={{ margin: 0, maxWidth: 180 }}>
              <option value="all">All Departments</option>
              {depts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select className="modern-input" value={statusF} onChange={e => setStatusF(e.target.value)} style={{ margin: 0, maxWidth: 150 }}>
              <option value="all">All Status</option>
              <option value="completed">Has Completed</option>
              <option value="pending">Has Pending</option>
            </select>
          </div>

          {tab === "reports" && (
            <div className="card" style={{ marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div style={{ fontSize: 13, color: "#64748b" }}>Export <b>{filtered.reduce((s, p) => s + (p.tasks?.length || 0), 0)}</b> tasks from <b>{filtered.length}</b> plans for {date}</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn ghost" style={{ fontSize: 12.5 }} onClick={() => exportCSV("csv")}><FaFileCsv /> CSV</button>
                <button className="btn ghost" style={{ fontSize: 12.5 }} onClick={() => exportCSV("xls")}><FaFileExcel /> Excel</button>
                <button className="btn" style={{ fontSize: 12.5 }} onClick={exportPDF}><FaFilePdf /> PDF</button>
              </div>
            </div>
          )}

          {loading ? <SkeletonTable rows={6} cols={4} />
          : filtered.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8" }}>
              <FaTasks size={34} style={{ opacity: 0.2, marginBottom: 10 }} />
              <p style={{ margin: 0 }}>No work plans submitted for {date}.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {filtered.map(p => {
                const open = expanded === p._id;
                const done = (p.tasks || []).filter(t => t.status === "Completed").length;
                return (
                  <div key={p._id} className="card" style={{ padding: 0, overflow: "hidden" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", cursor: "pointer" }} onClick={() => setExpanded(open ? null : p._id)}>
                      <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,var(--brand),var(--teal-800))", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0 }}>{p.employee_name?.[0]?.toUpperCase() || "?"}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{p.employee_name}</div>
                        <div style={{ fontSize: 12, color: "#64748b" }}>{p.department || "—"} {p.check_in_time && `· checked in ${p.check_in_time}`}</div>
                      </div>
                      <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--brand)", background: "var(--brand-light)", padding: "3px 10px", borderRadius: 99, flexShrink: 0 }}>{done}/{p.tasks?.length || 0} done</span>
                      {open ? <FaChevronDown size={12} color="#94a3b8" /> : <FaChevronRight size={12} color="#94a3b8" />}
                    </div>
                    {open && (
                      <div style={{ borderTop: "1px solid #f1f5f9", padding: "12px 18px" }}>
                        {(p.tasks || []).map((t, i) => {
                          const st = ST[t.status] || ST.Pending;
                          return (
                            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < p.tasks.length - 1 ? "1px solid #f8fafc" : "none" }}>
                              <span style={{ width: 6, height: 6, borderRadius: "50%", background: PRI[t.priority] || "#94a3b8", flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, color: "#334155" }}>{t.title}</div>
                                {(t.project || t.est_time) && <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>{t.project} {t.est_time && `· ${t.est_time}`}</div>}
                              </div>
                              <span style={{ fontSize: 10.5, fontWeight: 700, color: st.c, background: st.b, padding: "2px 8px", borderRadius: 4, flexShrink: 0 }}>{t.status || "Pending"}</span>
                            </div>
                          );
                        })}
                        {p.manager_comment && (
                          <div style={{ marginTop: 10, padding: "8px 12px", background: "#f0fdf4", borderRadius: 8, fontSize: 12.5, color: "#166534" }}>
                            <b>Manager feedback:</b> {p.manager_comment}
                          </div>
                        )}
                        <button className="btn ghost" style={{ marginTop: 10, fontSize: 12 }} onClick={() => { setCommentPlan(p); setCommentText(p.manager_comment || ""); }}>
                          <FaRegCommentDots /> {p.manager_comment ? "Edit Feedback" : "Add Feedback"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Comment modal */}
      {commentPlan && (
        <div className="modal-overlay" onClick={() => setCommentPlan(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: 460 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, color: "var(--brand)", fontSize: 15 }}>Feedback for {commentPlan.employee_name}</h3>
              <button onClick={() => setCommentPlan(null)} style={{ background: "#f1f5f9", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", color: "#64748b" }}><FaTimes size={12} /></button>
            </div>
            <textarea className="modern-input" rows={4} placeholder="Share feedback or guidance on today's plan…" value={commentText} onChange={e => setCommentText(e.target.value)} style={{ resize: "vertical" }} />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
              <button className="btn" onClick={saveComment}>Save Feedback</button>
              <button className="btn ghost" onClick={() => setCommentPlan(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@media (max-width: 820px){ .wbt-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}
