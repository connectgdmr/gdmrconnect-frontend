import React, { useState, useEffect } from "react";
import { FaPlus, FaTimes, FaCheckCircle, FaRegClock, FaPaperPlane, FaSave, FaTasks, FaPen } from "react-icons/fa";

const BASE = "https://gdmrconnect-backend-production.up.railway.app/api";
const PRIORITIES = [
  { v: "High",   color: "#dc2626", bg: "#fef2f2" },
  { v: "Medium", color: "#d97706", bg: "#fffbeb" },
  { v: "Low",    color: "#16a34a", bg: "#f0fdf4" },
];
// ClickUp-style task statuses
export const TASK_STATUSES = [
  { v: "Pending",     color: "#64748b", bg: "#f1f5f9" },
  { v: "Started",     color: "#2563eb", bg: "#eff6ff" },
  { v: "In Progress", color: "#d97706", bg: "#fffbeb" },
  { v: "Completed",   color: "#16a34a", bg: "#f0fdf4" },
];
const STATUS_META = (s) => TASK_STATUSES.find(x => x.v === s) || TASK_STATUSES[0];
const blankTask = () => ({ id: Date.now() + Math.random(), title: "", priority: "Medium", est_time: "", project: "", client: "", status: "Pending" });
// Preserve the backend's task identifier so per-task status updates target the
// right task (otherwise the client-only random id never matches server-side).
const normalizeTasks = (raw = []) => raw.map(t => { const b = blankTask(); return { ...b, ...t, id: t.id ?? t._id ?? b.id }; });
export const carryKey = (uid) => `gdmr_carryforward_${uid || "guest"}`;

export default function DailyWorkPlan({ token, user, departments = [] }) {
  const today = new Date().toISOString().slice(0, 10);
  const [tasks, setTasks]       = useState([blankTask()]);
  const [status, setStatus]     = useState("none"); // none | draft | submitted
  const [planId, setPlanId]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [editing, setEditing]   = useState(true);
  const [msg, setMsg]           = useState("");
  const [clients, setClients]   = useState([]);

  const deptNames = departments.map(d => d.name || d).filter(Boolean);

  // Pull any "continue previous work" tasks queued from Work History
  const drainCarryForward = () => {
    try {
      const k = carryKey(user?._id);
      const q = JSON.parse(localStorage.getItem(k) || "[]");
      if (Array.isArray(q) && q.length) { localStorage.removeItem(k); return q; }
    } catch {}
    return [];
  };

  useEffect(() => {
    // Clients for the dropdown
    fetch(`${BASE}/clients`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : []).then(d => setClients(Array.isArray(d) ? d : (d?.clients || []))).catch(() => {});

    fetch(`${BASE}/my/work-plan?date=${today}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const carried = drainCarryForward().map(t => ({ ...blankTask(), ...t, id: Date.now() + Math.random(), status: "Pending" }));
        if (d && d.tasks?.length) {
          const existing = normalizeTasks(d.tasks);
          setTasks(carried.length ? [...existing, ...carried] : existing);
          setStatus(d.status || "draft");
          setPlanId(d._id || null);
          setEditing(d.status !== "submitted" || carried.length > 0);
          if (carried.length) setMsg(`${carried.length} task(s) carried forward — review and submit.`);
        } else if (carried.length) {
          setTasks(carried);
          setEditing(true);
          setMsg(`${carried.length} task(s) carried forward — review and submit.`);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const updateTask = (id, patch) => setTasks(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t));
  const removeTask = (id) => setTasks(ts => ts.length > 1 ? ts.filter(t => t.id !== id) : ts);
  const addTask = () => setTasks(ts => [...ts, blankTask()]);

  async function save(submit) {
    const valid = tasks.filter(t => t.title.trim());
    if (valid.length === 0) { setMsg("Add at least one task before saving."); return; }
    setSaving(true); setMsg("");
    try {
      const r = await fetch(`${BASE}/my/work-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: today, tasks: valid, status: submit ? "submitted" : "draft" }),
      });
      if (r.ok) {
        const d = await r.json().catch(() => ({}));
        setStatus(submit ? "submitted" : "draft");
        setPlanId(d._id || planId);
        if (Array.isArray(d.tasks) && d.tasks.length) setTasks(normalizeTasks(d.tasks)); // sync server task ids
        if (submit) setEditing(false);
        setMsg(submit ? "Plan submitted! Your manager has been notified." : "Draft saved.");
      } else { setMsg("Could not save. Please try again."); }
    } catch { setMsg("Network error. Please try again."); }
    finally { setSaving(false); }
  }

  if (loading) return null;

  const completed = tasks.filter(t => t.status === "Completed").length;
  const withTitles = tasks.filter(t => t.title.trim()).length;

  return (
    <div className="card" style={{ marginBottom: 16, borderLeft: "4px solid var(--brand)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--brand-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FaTasks color="var(--brand)" size={16} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>What are you working on today?</h4>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {status === "submitted"
                ? <span style={{ color: "#16a34a", fontWeight: 600 }}><FaCheckCircle size={11} /> Plan submitted · {completed}/{withTitles} done</span>
                : status === "draft" ? "Draft saved — submit when ready" : "Plan your day so your manager knows your focus"}
            </div>
          </div>
        </div>
        {status === "submitted" && !editing && (
          <button className="btn ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setEditing(true)}>
            <FaPen size={10} /> Edit Plan
          </button>
        )}
      </div>

      {msg && <div style={{ marginBottom: 12, padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 500, background: msg.includes("submitted") || msg.includes("saved") ? "#f0fdf4" : "#fef2f2", color: msg.includes("submitted") || msg.includes("saved") ? "#16a34a" : "#b91c1c" }}>{msg}</div>}

      {/* Task rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {tasks.map((t, i) => {
          const pr = PRIORITIES.find(p => p.v === t.priority) || PRIORITIES[1];
          if (!editing) {
            if (!t.title.trim()) return null;
            const done = t.status === "Completed";
            const sm = STATUS_META(t.status);
            const changeStatus = async (ns) => {
              const prev = t.status;
              const updated = tasks.map(x => x.id === t.id ? { ...x, status: ns } : x);
              setTasks(updated); // optimistic
              try {
                // Persist by re-saving the whole plan for today (reliable upsert
                // by date) rather than a per-task id the server may not match.
                const r = await fetch(`${BASE}/my/work-plan`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                  body: JSON.stringify({ date: today, tasks: updated.filter(x => x.title.trim()), status, notify: false }),
                });
                if (!r.ok) throw new Error();
                setMsg("");
              } catch {
                setTasks(ts => ts.map(x => x.id === t.id ? { ...x, status: prev } : x)); // revert
                setMsg("Could not update task status. Please try again.");
              }
            };
            return (
              <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: "#f8fafc", borderRadius: 10, border: "1px solid #f1f5f9" }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: sm.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, color: done ? "#94a3b8" : "#334155", textDecoration: done ? "line-through" : "none" }}>{t.title}</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 3, flexWrap: "wrap" }}>
                    {t.client && <span style={{ fontSize: 11, color: "#0f766e", fontWeight: 600 }}>🏢 {t.client}</span>}
                    {t.project && <span style={{ fontSize: 11, color: "#64748b" }}>📁 {t.project}</span>}
                    {t.est_time && <span style={{ fontSize: 11, color: "#64748b" }}><FaRegClock size={9} /> {t.est_time}</span>}
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: pr.color }}>● {t.priority}</span>
                  </div>
                </div>
                {/* Status selector — change as you work */}
                <select
                  value={t.status || "Pending"}
                  onChange={e => changeStatus(e.target.value)}
                  title="Change status"
                  style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: sm.color, background: sm.bg, border: `1px solid ${sm.color}33`, borderRadius: 99, padding: "5px 10px", cursor: "pointer", appearance: "none", textAlign: "center" }}
                >
                  {TASK_STATUSES.map(s => <option key={s.v} value={s.v} style={{ color: "#334155", background: "#fff" }}>{s.v}</option>)}
                </select>
              </div>
            );
          }
          return (
            <div key={t.id} style={{ background: "#f8fafc", borderRadius: 10, padding: 12, border: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", flexShrink: 0 }}>{i + 1}.</span>
                <input className="modern-input" style={{ margin: 0, flex: 1 }} placeholder="What's the task?" value={t.title} onChange={e => updateTask(t.id, { title: e.target.value })} />
                {tasks.length > 1 && <button onClick={() => removeTask(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", flexShrink: 0 }}><FaTimes size={13} /></button>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
                <select className="modern-input" style={{ margin: 0, fontSize: 12.5 }} value={t.priority} onChange={e => updateTask(t.id, { priority: e.target.value })}>
                  {PRIORITIES.map(p => <option key={p.v} value={p.v}>{p.v} Priority</option>)}
                </select>
                <input className="modern-input" style={{ margin: 0, fontSize: 12.5 }} placeholder="Est. time (e.g. 2h)" value={t.est_time} onChange={e => updateTask(t.id, { est_time: e.target.value })} />
                {clients.length > 0 ? (
                  <select className="modern-input" style={{ margin: 0, fontSize: 12.5 }} value={t.client} onChange={e => updateTask(t.id, { client: e.target.value })}>
                    <option value="">Client</option>
                    {clients.map(c => <option key={c._id || c.name} value={c.name}>{c.name}</option>)}
                  </select>
                ) : null}
                {deptNames.length > 0 ? (
                  <select className="modern-input" style={{ margin: 0, fontSize: 12.5 }} value={t.project} onChange={e => updateTask(t.id, { project: e.target.value })}>
                    <option value="">Project / Dept</option>
                    {deptNames.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                ) : (
                  <input className="modern-input" style={{ margin: 0, fontSize: 12.5 }} placeholder="Project / Dept" value={t.project} onChange={e => updateTask(t.id, { project: e.target.value })} />
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <>
          <button onClick={addTask} style={{ marginTop: 10, background: "none", border: "1px dashed #cbd5e1", borderRadius: 8, padding: "8px 14px", cursor: "pointer", color: "#64748b", fontSize: 12.5, display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center" }}>
            <FaPlus size={10} /> Add Task
          </button>
          <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
            <button className="btn ghost" disabled={saving} onClick={() => save(false)} style={{ fontSize: 13 }}><FaSave size={11} /> Save Draft</button>
            <button className="btn" disabled={saving} onClick={() => save(true)} style={{ fontSize: 13 }}><FaPaperPlane size={11} /> {saving ? "Submitting…" : "Submit Plan"}</button>
          </div>
        </>
      )}
    </div>
  );
}
