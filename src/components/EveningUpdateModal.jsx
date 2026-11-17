import React, { useEffect, useState } from "react";
import { TbX, TbMoonStars, TbAlertCircle, TbPlus, TbPencil, TbTrash, TbDownload, TbFileTypePdf, TbFileTypeXls } from "react-icons/tb";
import { API_URL as BASE } from "../api";
import { escHtml } from "../utils/security";

// End-of-day update: a status for every task on today's plan (+ a remark for anything not completed) and a daily
// update on every open task assigned to you. Submitting it is what unlocks check-out.
const PLAN_STATUSES = ["Pending", "Started", "In Progress", "Blocked", "Completed"];
const COLORS = { Pending: "#64748b", Started: "#2563eb", "In Progress": "#d97706", Blocked: "#b91c1c", Completed: "#16a34a" };
const isDone = (s) => String(s || "").toLowerCase() === "completed" || String(s || "").toLowerCase() === "done";

// Defined at module level on purpose: inside the modal it was re-created on every keystroke and the box lost focus.
function Row({ x, onChange, tag, onEdit, onRemove }) {
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [t, setT] = useState(x.title);
  const [d, setD] = useState(x.deadline || "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const todayStr = new Date(Date.now() - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const run = async (fn) => { setBusy(true); setMsg(""); const m = await fn(); setBusy(false); if (m) setMsg(m); else { setEditing(false); setConfirm(false); } };
  return (
  <div style={{ background: "#f8fafc", border: "1px solid #eef2f6", borderRadius: 10, padding: 12 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
      <div style={{ flex: 1, minWidth: 180, fontWeight: 600, color: "#0f172a", fontSize: 13.5 }}>
        {editing ? (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <input className="modern-input" style={{ margin: 0, flex: "1 1 160px", fontSize: 13 }} maxLength={200} value={t} onChange={e => setT(e.target.value)} autoFocus />
            <input type="date" className="modern-input" style={{ margin: 0, width: 150, fontSize: 13 }} value={d} min={todayStr} onChange={e => setD(e.target.value)} />
            <button className="btn" style={{ fontSize: 12, padding: "5px 12px" }} disabled={busy || !t.trim()} onClick={() => run(() => onEdit(x, { title: t.trim(), deadline: d }))}>{busy ? "Saving…" : "Save"}</button>
            <button className="btn ghost" style={{ fontSize: 12, padding: "5px 12px" }} onClick={() => { setEditing(false); setT(x.title); setD(x.deadline || ""); }}>Cancel</button>
          </div>
        ) : x.title}
        {tag && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 700, color: x.overdue ? "#b91c1c" : "#1d4ed8", background: x.overdue ? "#fef2f2" : "#eff6ff", borderRadius: 6, padding: "1px 7px" }}>{tag}</span>}
        {x.client && <span style={{ marginLeft: 8, fontSize: 11, color: "#0f766e", fontWeight: 600 }}>🏢 {x.client}</span>}
      </div>
      <select value={PLAN_STATUSES.includes(x.status) ? x.status : "__other"} onChange={e => onChange(x.id, { status: e.target.value })}
        style={{ fontSize: 12, fontWeight: 700, color: COLORS[x.status] || "#334155", border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 10px", background: "#fff" }}>
        {!PLAN_STATUSES.includes(x.status) && <option value="__other">{x.status}</option>}
        {PLAN_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
      {onEdit && !editing && !confirm && (
        <span style={{ display: "inline-flex", gap: 4 }}>
          <button type="button" title="Edit" aria-label="Edit" onClick={() => setEditing(true)} style={{ border: "1px solid #e2e8f0", background: "#fff", borderRadius: 7, width: 30, height: 30, cursor: "pointer", color: "#475569" }}><TbPencil /></button>
          <button type="button" title="Remove" aria-label="Remove" onClick={() => setConfirm(true)} style={{ border: "1px solid #fecaca", background: "#fff", borderRadius: 7, width: 30, height: 30, cursor: "pointer", color: "#b91c1c" }}><TbTrash /></button>
        </span>
      )}
      {confirm && (
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 12.5, color: "#b91c1c", fontWeight: 600 }}>Remove this work?
          <button type="button" className="btn danger" style={{ fontSize: 12, padding: "4px 10px" }} disabled={busy} onClick={() => run(() => onRemove(x))}>{busy ? "…" : "Yes, remove"}</button>
          <button type="button" className="btn ghost" style={{ fontSize: 12, padding: "4px 10px" }} onClick={() => setConfirm(false)}>No</button>
        </span>
      )}
    </div>
    {msg && <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>{msg}</div>}
    <input className="modern-input" style={{ margin: "8px 0 0", fontSize: 12.5 }} maxLength={1000}
      placeholder={isDone(x.status) ? "Remarks (optional)" : "Remarks — what you did today / what is pending and why (required)"}
      value={x.remarks} onChange={e => onChange(x.id, { remarks: e.target.value })} />
  </div>
);
}

export default function EveningUpdateModal({ token, date, onClose, onDone, onAddWork }) {
  const [plan, setPlan] = useState(null);
  const [rows, setRows] = useState([]);          // plan tasks
  const [assigned, setAssigned] = useState([]);  // open assigned tasks
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const headers = { Authorization: `Bearer ${token}` };
  const jsonHeaders = { ...headers, "Content-Type": "application/json" };
  const [showExport, setShowExport] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`${BASE}/my/work-plan?date=${date}`, { headers }).then(r => (r.ok ? r.json() : null)),
      fetch(`${BASE}/work-tasks?view=mine`, { headers }).then(r => (r.ok ? r.json() : [])),
    ]).then(([p, a]) => {
      setPlan(p);
      setRows((p?.status === "submitted" ? (p?.tasks || []) : []).filter(t => String(t.title || "").trim()).map(t => ({ id: t.id || t._id, title: t.title, client: t.client, deadline: t.deadline || date, raw: t, status: t.status || "Pending", remarks: t.remarks || "" })));
      setAssigned((Array.isArray(a) ? a : []).filter(t => t.my_status && t.my_status !== "Completed").map(t => ({
        id: t._id, title: t.title, deadline: t.deadline, overdue: t.overdue, mine: !!t.created_by_me, status: t.my_status === "Pending" ? "In Progress" : t.my_status, remarks: "", updatedToday: t.updated_today,
      })));
      setSummary(p?.evening_summary || "");
    }).catch(() => setErr("Could not load today's work.")).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patch = (setter) => (id, p) => setter(list => list.map(x => (x.id === id ? { ...x, ...p } : x)));
  const patchRow = patch(setRows), patchAssigned = patch(setAssigned);

  // edit / remove take effect straight away (plan tasks: the day's plan is re-saved; assigned work: only its creator may change it)
  async function savePlan(list) {
    const body = { date, status: "submitted", notify: false, tasks: list.map(x => ({ ...x.raw, id: x.id, title: x.title, client: x.client || "", deadline: x.deadline, status: x.status, remarks: x.remarks })) };
    const r = await fetch(`${BASE}/my/work-plan`, { method: "POST", headers: jsonHeaders, body: JSON.stringify(body) });
    return r.ok ? "" : ((await r.json().catch(() => ({}))).message || "Could not save.");
  }
  const editPlan = async (x, p) => { const next = rows.map(r => (r.id === x.id ? { ...r, ...p } : r)); const m = await savePlan(next); if (!m) setRows(next); return m; };
  const removePlan = async (x) => { const next = rows.filter(r => r.id !== x.id); const m = await savePlan(next); if (!m) setRows(next); return m; };
  const editAssigned = async (x, p) => {
    const r = await fetch(`${BASE}/work-tasks/${x.id}`, { method: "PUT", headers: jsonHeaders, body: JSON.stringify(p) });
    if (!r.ok) return (await r.json().catch(() => ({}))).message || "Could not save.";
    setAssigned(l => l.map(a => (a.id === x.id ? { ...a, ...p } : a))); return "";
  };
  const removeAssigned = async (x) => {
    const r = await fetch(`${BASE}/work-tasks/${x.id}`, { method: "DELETE", headers });
    if (!r.ok) return (await r.json().catch(() => ({}))).message || "Could not remove.";
    setAssigned(l => l.filter(a => a.id !== x.id)); return "";
  };

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

  return (
    <>
    {showExport && <ExportPanel headers={headers} onClose={() => setShowExport(false)} />}
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
          : (!plan || plan.status !== "submitted") && assigned.length === 0 ? (
            <div style={{ padding: 16, borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a", color: "#92400e", fontSize: 13.5 }}>
              You haven't added any work today. Close this and use <b>Add work</b> (or submit your work plan on the Dashboard), then come back for the end-of-day update.
            </div>
          ) : (
            <>
              {rows.length > 0 && <div style={{ fontWeight: 700, color: "#334155", fontSize: 13 }}>Today's plan ({rows.length})</div>}
              {plan?.status === "submitted" && rows.map(x => <Row key={x.id} x={x} onChange={patchRow} onEdit={editPlan} onRemove={removePlan} />)}
              {assigned.length > 0 && (
                <>
                  <div style={{ fontWeight: 700, color: "#334155", fontSize: 13, marginTop: 6 }}>Work assigned to you ({assigned.length})</div>
                  {assigned.map(x => <Row key={x.id} x={x} onChange={patchAssigned} onEdit={x.mine ? editAssigned : undefined} onRemove={x.mine ? removeAssigned : undefined} tag={x.overdue ? `Overdue · was due ${x.deadline}` : `Due ${x.deadline}`} />)}
                </>
              )}
              <textarea className="modern-input" rows={2} maxLength={1500} style={{ margin: 0, fontSize: 12.5 }} placeholder="Overall note for your manager (optional) — blockers, tomorrow's focus…"
                value={summary} onChange={e => setSummary(e.target.value)} />
            </>
          )}
          {err && <div style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "10px 12px", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", fontSize: 12.5, whiteSpace: "pre-line" }}><TbAlertCircle style={{ flexShrink: 0, marginTop: 2 }} />{err}</div>}
        </div>

        <div style={{ padding: "12px 20px", borderTop: "1px solid #eef2f6", display: "flex", justifyContent: "flex-end", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {onAddWork && <button className="btn ghost" onClick={onAddWork} style={{ display: "flex", alignItems: "center", gap: 6 }}><TbPlus /> Add work</button>}
          <button className="btn ghost" onClick={() => setShowExport(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}><TbDownload /> Export</button>
          <div style={{ flex: 1 }} />
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={submit} disabled={saving || loading || ((!plan || plan.status !== "submitted") && assigned.length === 0)}>{saving ? "Saving…" : "Submit update"}</button>
        </div>
      </div>
    </div>
    </>
  );
}

// Export my work for a chosen time frame as Excel or PDF (day, work, deadline, status, remarks).
function ExportPanel({ headers, onClose }) {
  const iso = (d) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const today = iso(new Date());
  const [from, setFrom] = useState(iso(new Date(Date.now() - 29 * 864e5)));
  const [to, setTo] = useState(today);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const presets = [["Today", 0], ["Last 7 days", 6], ["Last 30 days", 29], ["Last 90 days", 89]];
  async function go(kind) {
    setErr(""); setBusy(kind);
    try {
      const r = await fetch(`${BASE}/work/history?from=${from}&to=${to}`, { headers });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.message || "Could not load your work."); return; }
      const head = ["Date", "Work", "Type", "Client", "Deadline", "Status", "Remarks"];
      const rows = d.history.flatMap(day => day.entries.map(e => [day.date, e.title, e.kind === "assigned" ? "Assigned" : "Daily plan", e.client || "", e.deadline || "", e.status, e.remarks || ""]));
      if (rows.length === 0) { setErr("No work recorded in this time frame."); return; }
      const table = (hs, cs) => `<table style="border-collapse:collapse;width:100%"><thead><tr>${head.map(h => `<th style="${hs}">${escHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td style="${cs}">${escHtml(String(c))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
      const title = `My work ${from} to ${to}`;
      if (kind === "xls") {
        const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><h3>${escHtml(title)}</h3>${table("background:#e2e8f0;border:1px solid #94a3b8;padding:4px 8px;text-align:left", "border:1px solid #cbd5e1;padding:4px 8px")}</body></html>`;
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" }));
        a.download = `my-work-${from}-to-${to}.xls`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      } else {
        const w = window.open("", "_blank", "width=1000,height=750");
        if (!w) { setErr("Allow pop-ups for this site to download the PDF."); return; }
        w.document.write(`<html><head><title>${escHtml(title)}</title></head><body style="font-family:Arial,sans-serif;padding:18px;color:#0f172a"><h2 style="margin:0 0 4px">${escHtml(d.person?.name ? `${d.person.name} — work` : "My work")}</h2><div style="color:#64748b;font-size:12px;margin-bottom:12px">${escHtml(from)} to ${escHtml(to)} · ${rows.length} entries · ${d.totals.completed} completed</div>${table("text-align:left;padding:6px 7px;border-bottom:2px solid #334155;font-size:11px;text-transform:uppercase;color:#475569", "padding:5px 7px;border-bottom:1px solid #e5e7eb;font-size:12px;vertical-align:top")}</body></html>`);
        w.document.close(); setTimeout(() => { w.focus(); w.print(); }, 300);
      }
      onClose();
    } catch { setErr("Network error."); } finally { setBusy(""); }
  }
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "min(440px, 100%)", padding: 20 }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: 10 }}><div style={{ flex: 1, fontWeight: 800, fontSize: 16 }}>Export my work</div><button onClick={onClose} aria-label="Close" style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 30, height: 30, cursor: "pointer" }}><TbX /></button></div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {presets.map(([l, n]) => <button key={l} type="button" className="btn ghost" style={{ fontSize: 12, padding: "5px 11px" }} onClick={() => { setFrom(iso(new Date(Date.now() - n * 864e5))); setTo(today); }}>{l}</button>)}
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <label style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: "#475569" }}>From<input type="date" className="modern-input" style={{ margin: "4px 0 0" }} max={to} value={from} onChange={e => setFrom(e.target.value)} /></label>
          <label style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: "#475569" }}>To<input type="date" className="modern-input" style={{ margin: "4px 0 0" }} min={from} max={today} value={to} onChange={e => setTo(e.target.value)} /></label>
        </div>
        {err && <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", fontSize: 12.5 }}>{err}</div>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 14 }}>
          <button className="btn ghost" disabled={!!busy || !from || !to} onClick={() => go("pdf")} style={{ display: "flex", alignItems: "center", gap: 6 }}><TbFileTypePdf /> {busy === "pdf" ? "Preparing…" : "PDF"}</button>
          <button className="btn" disabled={!!busy || !from || !to} onClick={() => go("xls")} style={{ display: "flex", alignItems: "center", gap: 6 }}><TbFileTypeXls /> {busy === "xls" ? "Preparing…" : "Excel"}</button>
        </div>
      </div>
    </div>
  );
}
