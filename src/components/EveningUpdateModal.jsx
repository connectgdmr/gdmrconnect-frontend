import React, { useEffect, useState } from "react";
import { TbX, TbMoonStars, TbAlertCircle } from "react-icons/tb";
import { API_URL as BASE } from "../api";

// End-of-day update: a status for every task on today's plan (+ a remark for anything not completed) and a daily
// update on every open task assigned to you. Submitting it is what unlocks check-out.
const PLAN_STATUSES = ["Pending", "Started", "In Progress", "Blocked", "Completed"];
const COLORS = { Pending: "#64748b", Started: "#2563eb", "In Progress": "#d97706", Blocked: "#b91c1c", Completed: "#16a34a" };
const isDone = (s) => String(s || "").toLowerCase() === "completed" || String(s || "").toLowerCase() === "done";

export default function EveningUpdateModal({ token, date, onClose, onDone }) {
  const [plan, setPlan] = useState(null);
  const [rows, setRows] = useState([]);          // plan tasks
  const [assigned, setAssigned] = useState([]);  // open assigned tasks
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/my/work-plan?date=${date}`, { headers }).then(r => (r.ok ? r.json() : null)),
      fetch(`${BASE}/work-tasks?view=mine`, { headers }).then(r => (r.ok ? r.json() : [])),
    ]).then(([p, a]) => {
      setPlan(p);
      setRows((p?.tasks || []).filter(t => String(t.title || "").trim()).map(t => ({ id: t.id || t._id, title: t.title, client: t.client, status: t.status || "Pending", remarks: t.remarks || "" })));
      setAssigned((Array.isArray(a) ? a : []).filter(t => t.my_status && t.my_status !== "Completed").map(t => ({
        id: t._id, title: t.title, deadline: t.deadline, overdue: t.overdue, status: t.my_status === "Pending" ? "In Progress" : t.my_status, remarks: "", updatedToday: t.updated_today,
      })));
      setSummary(p?.evening_summary || "");
    }).catch(() => setErr("Could not load today's work.")).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (setter) => (id, p) => setter(list => list.map(x => (x.id === id ? { ...x, ...p } : x)));
  const patchRow = patch(setRows), patchAssigned = patch(setAssigned);

  async function submit() {
    setErr("");
    const missing = [...rows, ...assigned].filter(x => !isDone(x.status) && (x.remarks || "").trim().length < 3);
    if (missing.length) { setErr(`Add a remark for: ${missing.map(m => `“${m.title}”`).join(", ")} (what you did / what is pending).`); return; }
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/my/work-plan/evening-update`, {
        method: "POST", headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ date, summary, tasks: rows.map(x => ({ id: x.id, status: x.status, remarks: x.remarks })), assigned: assigned.map(x => ({ task_id: x.id, status: x.status, remarks: x.remarks })) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.message || "Could not save the update."); return; }
      onDone(d);
    } catch { setErr("Network error. Please try again."); }
    finally { setSaving(false); }
  }

  const Row = ({ x, onChange, tag }) => (
    <div style={{ background: "#f8fafc", border: "1px solid #eef2f6", borderRadius: 10, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 180, fontWeight: 600, color: "#0f172a", fontSize: 13.5 }}>
          {x.title}
          {tag && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 700, color: x.overdue ? "#b91c1c" : "#1d4ed8", background: x.overdue ? "#fef2f2" : "#eff6ff", borderRadius: 6, padding: "1px 7px" }}>{tag}</span>}
          {x.client && <span style={{ marginLeft: 8, fontSize: 11, color: "#0f766e", fontWeight: 600 }}>🏢 {x.client}</span>}
        </div>
        <select value={PLAN_STATUSES.includes(x.status) ? x.status : "__other"} onChange={e => onChange(x.id, { status: e.target.value })}
          style={{ fontSize: 12, fontWeight: 700, color: COLORS[x.status] || "#334155", border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 10px", background: "#fff" }}>
          {!PLAN_STATUSES.includes(x.status) && <option value="__other">{x.status}</option>}
          {PLAN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <input className="modern-input" style={{ margin: "8px 0 0", fontSize: 12.5 }} maxLength={1000}
        placeholder={isDone(x.status) ? "Remarks (optional)" : "Remarks — what you did today / what is pending and why (required)"}
        value={x.remarks} onChange={e => onChange(x.id, { remarks: e.target.value })} />
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true"
        style={{ background: "#fff", borderRadius: 16, width: "min(720px, 100%)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(15,23,42,.28)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #eef2f6", display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, background: "var(--brand-light)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}><TbMoonStars /></span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#0f172a" }}>End-of-day work update</div>
            <div style={{ fontSize: 12.5, color: "#64748b" }}>Update the status of today's work and add remarks. You can check out once this is submitted.</div>
          </div>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 32, height: 32, cursor: "pointer" }}><TbX /></button>
        </div>

        <div style={{ padding: 20, overflow: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          {loading ? <div className="loader" style={{ margin: "30px auto" }} />
          : !plan || plan.status !== "submitted" ? (
            <div style={{ padding: 16, borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", fontSize: 13.5 }}>
              You haven't submitted today's work plan yet. Close this, add your tasks and press <b>Submit Plan</b>, then come back for the end-of-day update.
            </div>
          ) : (
            <>
              <div style={{ fontWeight: 700, color: "#334155", fontSize: 13 }}>Today's plan ({rows.length})</div>
              {rows.map(x => <Row key={x.id} x={x} onChange={patchRow} />)}
              {assigned.length > 0 && (
                <>
                  <div style={{ fontWeight: 700, color: "#334155", fontSize: 13, marginTop: 6 }}>Work assigned to you ({assigned.length})</div>
                  {assigned.map(x => <Row key={x.id} x={x} onChange={patchAssigned} tag={x.overdue ? `Overdue · was due ${x.deadline}` : `Due ${x.deadline}`} />)}
                </>
              )}
              <textarea className="modern-input" rows={2} maxLength={1500} style={{ margin: 0, fontSize: 12.5 }} placeholder="Overall note for your manager (optional) — blockers, tomorrow's focus…"
                value={summary} onChange={e => setSummary(e.target.value)} />
            </>
          )}
          {err && <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", fontSize: 12.5, whiteSpace: "pre-line" }}><TbAlertCircle style={{ flexShrink: 0, marginTop: 2 }} />{err}</div>}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid #eef2f6", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={submit} disabled={saving || loading || !plan || plan.status !== "submitted"}>{saving ? "Saving…" : "Submit update"}</button>
        </div>
      </div>
    </div>
  );
}
