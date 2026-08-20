import React, { useState, useEffect } from "react";
import { TbPlus, TbX, TbCircleCheck, TbSend, TbChecklist, TbCopy, TbShare } from "react-icons/tb";

import { API_URL as BASE } from "../api";

const DEFAULT_WORK_TYPES = ["Development", "Service", "Support"];

// ClickUp-style task statuses
export const TASK_STATUSES = [
  { v: "Pending",     color: "#64748b", bg: "#f1f5f9" },
  { v: "Started",     color: "#2563eb", bg: "#eff6ff" },
  { v: "In Progress", color: "#d97706", bg: "#fffbeb" },
  { v: "Completed",   color: "#16a34a", bg: "#f0fdf4" },
];
const STATUS_META = (s) => TASK_STATUSES.find(x => x.v === s) || TASK_STATUSES[0];
// priority/est_time/project are kept in the data model (older payloads may still carry
// them, and Work History/reporting still reads them) but are no longer shown in this
// entry form — work_type + client now carry that classification instead.
const blankTask = () => ({ id: Date.now() + Math.random(), title: "", work_type: "", priority: "Medium", est_time: "", project: "", client: "", status: "Pending" });
// Preserve the backend's task identifier so per-task status updates target the
// right task (otherwise the client-only random id never matches server-side).
const normalizeTasks = (raw = []) => raw.map(t => { const b = blankTask(); return { ...b, ...t, id: t.id ?? t._id ?? b.id }; });
export const carryKey = (uid) => `gdmr_carryforward_${uid || "guest"}`;

export default function DailyWorkPlan({ token, user }) {
  const today = new Date().toISOString().slice(0, 10);
  const [tasks, setTasks]       = useState([blankTask()]);
  const [status, setStatus]     = useState("none"); // none | draft | submitted
  const [planId, setPlanId]     = useState(null);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [editing, setEditing]   = useState(true);
  const [msg, setMsg]           = useState("");
  const [clients, setClients]   = useState([]);
  const [workTypes, setWorkTypes] = useState(DEFAULT_WORK_TYPES);
  const [customStatusIds, setCustomStatusIds] = useState(new Set());
  const [sharing, setSharing]   = useState(false);

  const department = Array.isArray(user?.department) ? user.department[0] : user?.department;

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

    // Department-configured work types (falls back to defaults if not set up yet)
    if (department) {
      fetch(`${BASE}/departments/${encodeURIComponent(department)}/work-types`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (Array.isArray(d?.types) && d.types.length) setWorkTypes(d.types); })
        .catch(() => {});
    }

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

  function formatStatusText() {
    const named = tasks.filter(t => t.title.trim());
    const dateLabel = new Date(today + "T00:00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const lines = [`My Work Status — ${dateLabel}`, ""];
    named.forEach((t, i) => {
      const bits = [t.work_type, t.client].filter(Boolean).join(" · ");
      lines.push(`${i + 1}. [${t.status || "Pending"}] ${t.title}${bits ? ` (${bits})` : ""}`);
    });
    return lines.join("\n");
  }

  async function copyStatus() {
    try {
      await navigator.clipboard.writeText(formatStatusText());
      setMsg("Copied today's work status to clipboard.");
    } catch { setMsg("Could not copy — please select and copy manually."); }
  }

  async function shareStatus() {
    setSharing(true); setMsg("");
    try {
      const r = await fetch(`${BASE}/my/work-plan/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ date: today }),
      });
      if (r.ok) setMsg("Today's status was emailed to your manager and owners.");
      else if (r.status === 404) setMsg("Sharing by email isn't set up on the backend yet.");
      else { const d = await r.json().catch(() => ({})); setMsg(d.message || "Could not share right now."); }
    } catch { setMsg("Network error while sharing."); }
    finally { setSharing(false); }
  }

  if (loading) return null;

  const completed = tasks.filter(t => t.status === "Completed").length;
  const withTitles = tasks.filter(t => t.title.trim()).length;

  return (
    <div className="card" style={{ marginBottom: 16, borderLeft: "4px solid var(--brand)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 11, background: "var(--brand-light)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <TbChecklist color="var(--brand)" size={16} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 15, color: "#0f172a" }}>What are you working on right now?</h4>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 2 }}>
              {status === "submitted"
                ? <span style={{ color: "#16a34a", fontWeight: 600 }}><TbCircleCheck size={11} /> Plan submitted · {completed}/{withTitles} done</span>
                : status === "draft" ? "Draft saved — submit when ready" : "Log it so your manager knows your focus"}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" style={{ fontSize: 12, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }} onClick={copyStatus} disabled={withTitles === 0}>
            <TbCopy size={10} /> Copy Status
          </button>
          <button className="btn ghost" style={{ fontSize: 12, padding: "6px 12px", display: "flex", alignItems: "center", gap: 6 }} onClick={shareStatus} disabled={sharing || withTitles === 0}>
            <TbShare size={10} /> {sharing ? "Sharing…" : "Share Status"}
          </button>
        </div>
      </div>

      {msg && <div style={{ marginBottom: 12, padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 500, background: /submit|saved|copied|emailed/i.test(msg) ? "#f0fdf4" : "#fef2f2", color: /submit|saved|copied|emailed/i.test(msg) ? "#16a34a" : "#b91c1c" }}>{msg}</div>}

      {/* Task rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {tasks.map((t, i) => {
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
                    {t.work_type && <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--brand)", background: "var(--brand-light)", borderRadius: 99, padding: "1px 8px" }}>{t.work_type}</span>}
                    {t.client && <span style={{ fontSize: 11, color: "#0f766e", fontWeight: 600 }}>🏢 {t.client}</span>}
                  </div>
                </div>
                {/* Status selector — change as you work */}
                {(customStatusIds.has(t.id) || (t.status && !TASK_STATUSES.some(s => s.v === t.status))) ? (
                  <input
                    autoFocus
                    defaultValue={t.status}
                    placeholder="Type a status…"
                    title="Custom status"
                    onKeyDown={e => {
                      if (e.key !== "Enter") return;
                      const v = e.target.value.trim();
                      setCustomStatusIds(s => { const n = new Set(s); n.delete(t.id); return n; });
                      if (v) changeStatus(v);
                    }}
                    onBlur={e => {
                      const v = e.target.value.trim();
                      setCustomStatusIds(s => { const n = new Set(s); n.delete(t.id); return n; });
                      if (v) changeStatus(v);
                    }}
                    style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: "#334155", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 99, padding: "5px 10px", width: 120, textAlign: "center" }}
                  />
                ) : (
                  <select
                    value={t.status || "Pending"}
                    onChange={e => { if (e.target.value === "__custom__") setCustomStatusIds(s => new Set(s).add(t.id)); else changeStatus(e.target.value); }}
                    title="Change status"
                    style={{ flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: sm.color, background: sm.bg, border: `1px solid ${sm.color}33`, borderRadius: 99, padding: "5px 10px", cursor: "pointer", appearance: "none", textAlign: "center" }}
                  >
                    {TASK_STATUSES.map(s => <option key={s.v} value={s.v} style={{ color: "#334155", background: "#fff" }}>{s.v}</option>)}
                    <option value="__custom__" style={{ color: "#334155", background: "#fff" }}>Custom…</option>
                  </select>
                )}
              </div>
            );
          }
          return (
            <div key={t.id} style={{ background: "#f8fafc", borderRadius: 10, padding: 12, border: "1px solid #f1f5f9" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", flexShrink: 0 }}>{i + 1}.</span>
                <input className="modern-input" style={{ margin: 0, flex: 1 }} placeholder="What's the task?" value={t.title} onChange={e => updateTask(t.id, { title: e.target.value })} />
                {tasks.length > 1 && <button onClick={() => removeTask(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", flexShrink: 0 }}><TbX size={13} /></button>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 8 }}>
                <select className="modern-input" style={{ margin: 0, fontSize: 12.5 }} value={t.work_type} onChange={e => updateTask(t.id, { work_type: e.target.value })}>
                  <option value="">Type</option>
                  {workTypes.map(wt => <option key={wt} value={wt}>{wt}</option>)}
                </select>
                {clients.length > 0 ? (
                  <select className="modern-input" style={{ margin: 0, fontSize: 12.5 }} value={t.client} onChange={e => updateTask(t.id, { client: e.target.value })}>
                    <option value="">Client</option>
                    {clients.map(c => <option key={c._id || c.name} value={c.name}>{c.name}</option>)}
                  </select>
                ) : null}
                {(customStatusIds.has(t.id) || (t.status && !TASK_STATUSES.some(s => s.v === t.status))) ? (
                  <input
                    className="modern-input" style={{ margin: 0, fontSize: 12.5 }} placeholder="Type a status…" autoFocus
                    value={t.status}
                    onChange={e => updateTask(t.id, { status: e.target.value })}
                    onBlur={() => { if (!t.status.trim()) { updateTask(t.id, { status: "Pending" }); setCustomStatusIds(s => { const n = new Set(s); n.delete(t.id); return n; }); } }}
                  />
                ) : (
                  <select
                    className="modern-input" style={{ margin: 0, fontSize: 12.5 }} value={t.status || "Pending"}
                    onChange={e => {
                      if (e.target.value === "__custom__") { setCustomStatusIds(s => new Set(s).add(t.id)); updateTask(t.id, { status: "" }); }
                      else updateTask(t.id, { status: e.target.value });
                    }}
                  >
                    {TASK_STATUSES.map(s => <option key={s.v} value={s.v}>{s.v}</option>)}
                    <option value="__custom__">Custom…</option>
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <>
          <button onClick={addTask} style={{ marginTop: 10, background: "none", border: "1px dashed #cbd5e1", borderRadius: 8, padding: "8px 14px", cursor: "pointer", color: "#64748b", fontSize: 12.5, display: "flex", alignItems: "center", gap: 6, width: "100%", justifyContent: "center" }}>
            <TbPlus size={10} /> Add Task
          </button>
          <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end", borderTop: "1px solid #f1f5f9", paddingTop: 14 }}>
            <button className="btn ghost" disabled={saving} onClick={() => save(false)} style={{ fontSize: 13 }}>Save Draft</button>
            <button className="btn" disabled={saving} onClick={() => save(true)} style={{ fontSize: 13 }}><TbSend size={11} /> {saving ? "Submitting…" : "Submit Plan"}</button>
          </div>
        </>
      )}
      {status === "submitted" && !editing && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button className="btn ghost" style={{ fontSize: 12, padding: "6px 12px" }} onClick={() => setEditing(true)}>Edit Plan</button>
        </div>
      )}
    </div>
  );
}
