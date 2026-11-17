import React, { useCallback, useEffect, useMemo, useState } from "react";
import { TbPlus, TbX, TbAlertTriangle, TbCalendarDue, TbUsers, TbChevronDown, TbChevronUp, TbTrash } from "react-icons/tb";
import { API_URL as BASE } from "../api";

// Assigned work: anyone can create work, a deadline is mandatory, it can be assigned to other people, and every
// assignee posts a status + remarks daily. Same screen for admins, managers and employees.
const STATUSES = ["Pending", "Started", "In Progress", "Blocked", "Completed"];
const COLORS = {
  Pending: ["#64748b", "#f1f5f9"], Started: ["#2563eb", "#eff6ff"], "In Progress": ["#d97706", "#fffbeb"],
  Blocked: ["#b91c1c", "#fef2f2"], Completed: ["#16a34a", "#f0fdf4"],
};
const PRIORITY_COLOR = { High: "#b91c1c", Medium: "#d97706", Low: "#64748b" };
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmt = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—");
const Pill = ({ s }) => { const [c, bg] = COLORS[s] || COLORS.Pending; return <span style={{ fontSize: 11, fontWeight: 700, color: c, background: bg, border: `1px solid ${c}33`, borderRadius: 7, padding: "2px 9px", whiteSpace: "nowrap" }}>{s}</span>; };

export default function WorkTasks({ token, role, initialView = "mine", daily = null, dailyDate = "" }) {
  const canSeeTeam = role === "admin" || role === "owner" || role === "manager";
  const [view, setView] = useState(canSeeTeam && (initialView === "team" || initialView === "ongoing") ? "ongoing" : "mine");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [msg, setMsg] = useState("");
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }), [token]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/work-tasks?view=${view}`, { headers });
      setRows(r.ok ? await r.json() : []);
    } catch { setRows([]); }
    finally { setLoading(false); }
  }, [view, headers]);
  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    if (view !== "ongoing") return [];
    const g = {};
    rows.forEach(t => {
      const ds = new Set((t.assignees || []).map(a => ((a.department_list && a.department_list[0]) || a.department || "Unassigned")));
      (ds.size ? [...ds] : ["Unassigned"]).forEach(d => { (g[d] = g[d] || []).push(t); });
    });
    Object.keys(daily || {}).forEach(d => { g[d] = g[d] || []; });          // departments that only have daily work still show up
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b)).map(([d, ts]) => [d, [...ts].sort((x, y) => String(x.deadline).localeCompare(String(y.deadline)))]);
  }, [rows, view, daily]);

  const counts = useMemo(() => ({
    week: rows.filter(t => t.status !== "Completed" && t.deadline && t.deadline >= todayISO() && t.deadline <= new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10)).length,
    open: rows.filter(t => t.status !== "Completed").length,
    overdue: rows.filter(t => t.overdue).length,
    today: rows.filter(t => t.due_today).length,
    done: rows.filter(t => t.status === "Completed").length,
  }), [rows]);

  async function remove(t) {
    if (!window.confirm(`Delete “${t.title}”? This removes it for everyone it was assigned to.`)) return;
    const r = await fetch(`${BASE}/work-tasks/${t._id}`, { method: "DELETE", headers });
    if (r.ok) { setMsg("Deleted."); load(); } else { const d = await r.json().catch(() => ({})); setMsg(d.message || "Could not delete."); }
  }

  const tabs = canSeeTeam
    ? [["ongoing", "Ongoing work"], ["mine", "Assigned to me"], ["created", "Created by me"], ["team", role === "manager" ? "All team work" : "All work"]]
    : [["mine", "Assigned to me"], ["created", "Created by me"]];

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
        <div style={{ display: "flex", gap: 4, background: "#f1f5f9", borderRadius: 10, padding: 4 }}>
          {tabs.map(([k, l]) => (
            <button key={k} onClick={() => setView(k)} style={{ padding: "7px 14px", border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 600, fontSize: 12.5,
              background: view === k ? "var(--brand)" : "transparent", color: view === k ? "#fff" : "#64748b" }}>{l}</button>
          ))}
        </div>
        <button className="btn" onClick={() => setShowNew(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}><TbPlus size={12} /> New Work</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 14 }}>
        {(view === "ongoing"
          ? [["Ongoing", counts.open, "#0f172a"], ["Due today", counts.today, "#d97706"], ["Due in 7 days", counts.week, "#2563eb"], ["Overdue", counts.overdue, "#b91c1c"]]
          : [["Open", counts.open, "#0f172a"], ["Due today", counts.today, "#d97706"], ["Overdue", counts.overdue, "#b91c1c"], ["Completed", counts.done, "#16a34a"]]).map(([l, n, c]) => (
          <div key={l} className="card" style={{ padding: "10px 14px", margin: 0 }}>
            <div style={{ fontSize: 11.5, color: "#64748b", fontWeight: 600 }}>{l}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: c }}>{n}</div>
          </div>
        ))}
      </div>

      {msg && <div style={{ marginBottom: 12, padding: "8px 14px", borderRadius: 8, fontSize: 12.5, background: "#f0fdf4", color: "#166534" }}>{msg}</div>}

      {loading ? <div className="loader" style={{ margin: "40px auto" }} />
      : rows.length === 0 && !(view === "ongoing" && groups.length > 0) ? (
        <div className="card" style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8" }}>
          <TbCalendarDue size={34} style={{ opacity: 0.25, marginBottom: 8 }} />
          <p style={{ margin: 0 }}>{view === "mine" ? "Nothing assigned to you right now." : "No work here yet."} Use <b>New Work</b> to create one.</p>
        </div>
      ) : view === "ongoing" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {groups.map(([dept, list]) => (
            <div key={dept}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, margin: "0 0 8px 2px" }}>
                <span style={{ fontWeight: 800, fontSize: 12.5, letterSpacing: 0.5, textTransform: "uppercase", color: "#475569" }}>{dept}</span>
                <span style={{ fontSize: 12, color: "#94a3b8" }}>{list.length} assigned{list.some(t => t.overdue) ? ` · ${list.filter(t => t.overdue).length} overdue` : ""}{daily?.[dept] ? ` · ${daily[dept].rows.length} in progress today` : ""}</span>
              </div>
              <DailyBlock info={daily?.[dept]} date={dailyDate} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {list.map(t => (
                  <TaskCard key={`${dept}-${t._id}`} t={t} headers={headers} onlyDept={dept} expanded={open === `${dept}-${t._id}`} onToggle={() => setOpen(open === `${dept}-${t._id}` ? null : `${dept}-${t._id}`)}
                    onChanged={() => load()} onDelete={() => remove(t)} canDelete showPeople canComment />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.map(t => (
            <TaskCard key={t._id} t={t} headers={headers} expanded={open === t._id} onToggle={() => setOpen(open === t._id ? null : t._id)}
              onChanged={() => load()} onDelete={() => remove(t)} canDelete={view !== "mine" || t.created_by_me} showPeople={view !== "mine"} canComment={canSeeTeam || t.created_by_me} />
          ))}
        </div>
      )}

      {showNew && <NewWorkModal headers={headers} token={token} onClose={() => setShowNew(false)} onCreated={() => { setShowNew(false); setMsg("Work created and assigned."); load(); }} />}
    </div>
  );
}

function TaskCard({ t, headers, expanded, onToggle, onChanged, onDelete, canDelete, showPeople, canComment, onlyDept }) {
  const people = onlyDept ? t.assignees.filter(a => ((a.department_list && a.department_list[0]) || a.department || "Unassigned") === onlyDept) : t.assignees;
  const finished = people.filter(a => a.status === "Completed").length;
  const left = t.deadline ? Math.round((new Date(`${t.deadline}T00:00:00`) - new Date(`${todayISO()}T00:00:00`)) / 864e5) : null;
  const [comment, setComment] = useState("");
  const [cErr, setCErr] = useState("");
  const [status, setStatus] = useState(t.my_status && t.my_status !== "Pending" ? t.my_status : "In Progress");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const mine = !!t.my_status;
  const edge = t.overdue ? "#b91c1c" : t.due_today ? "#d97706" : t.status === "Completed" ? "#16a34a" : "var(--brand)";

  async function post() {
    setErr(""); setSaving(true);
    try {
      const r = await fetch(`${BASE}/work-tasks/${t._id}/update`, { method: "POST", headers, body: JSON.stringify({ status, remarks }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.message || "Could not save."); return; }
      setRemarks(""); onChanged();
    } catch { setErr("Network error."); } finally { setSaving(false); }
  }

  async function postComment() {
    setCErr("");
    try {
      const r = await fetch(`${BASE}/work-tasks/${t._id}/comment`, { method: "POST", headers, body: JSON.stringify({ comment }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setCErr(d.message || "Could not save the comment."); return; }
      setComment(""); onChanged();
    } catch { setCErr("Network error."); }
  }

  return (
    <div className="card" style={{ margin: 0, padding: 0, borderLeft: `4px solid ${edge}`, overflow: "hidden" }}>
      <div onClick={onToggle} style={{ padding: "12px 14px", cursor: "pointer", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14 }}>{t.title}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4, fontSize: 12, color: "#64748b", alignItems: "center" }}>
            <span style={{ color: t.overdue ? "#b91c1c" : t.due_today ? "#d97706" : "#64748b", fontWeight: t.overdue || t.due_today ? 700 : 500, display: "inline-flex", alignItems: "center", gap: 4 }}>
              {t.overdue && <TbAlertTriangle />} Due {fmt(t.deadline)}{t.overdue ? ` · ${Math.abs(left)} day(s) overdue` : t.due_today ? " · today" : left != null ? ` · ${left} day(s) left` : ""}
            </span>
            <span style={{ color: PRIORITY_COLOR[t.priority], fontWeight: 700 }}>{t.priority}</span>
            {t.client && <span style={{ color: "#0f766e", fontWeight: 600 }}>🏢 {t.client}</span>}
            <span>by {t.created_by_name}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><TbUsers /> {people.map(a => a.name).join(", ")}</span>
            <span style={{ fontWeight: 600 }}>{finished}/{people.length} done</span>
          </div>
        </div>
        {mine && <Pill s={t.my_status} />}
        {!mine && <Pill s={t.status === "Completed" ? "Completed" : "In Progress"} />}
        {mine && t.status !== "Completed" && !t.updated_today && t.my_status !== "Completed" && <span style={{ fontSize: 11, fontWeight: 700, color: "#b45309", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 6, padding: "2px 8px" }}>Update due today</span>}
        {expanded ? <TbChevronUp /> : <TbChevronDown />}
      </div>

      {expanded && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid #f1f5f9" }}>
          {t.description && <p style={{ fontSize: 13, color: "#334155", margin: "10px 0" }}>{t.description}</p>}

          <Insight taskId={t._id} headers={headers} updates={t.updates.length} />
          {(showPeople || t.assignees.length > 1) && (
            <table className="styled-table-global" style={{ width: "100%", marginTop: 8 }}>
              <thead><tr><th>Doing it</th><th>Department</th><th>Status</th><th>Latest remarks</th></tr></thead>
              <tbody>{people.map(a => (
                <tr key={a.user_id}><td style={{ fontWeight: 600 }}>{a.name}</td><td style={{ fontSize: 12.5, color: "#64748b" }}>{a.department || "—"}</td><td><Pill s={a.status} /></td><td style={{ fontSize: 12.5 }}>{a.remarks || "—"}</td></tr>
              ))}</tbody>
            </table>
          )}

          {mine && t.my_status !== "Completed" && (
            <div style={{ marginTop: 12, padding: 12, background: "#f8fafc", borderRadius: 10, border: "1px solid #eef2f6" }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: "#334155", marginBottom: 8 }}>Today's status</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <select className="modern-input" style={{ margin: 0, width: 150 }} value={status} onChange={e => setStatus(e.target.value)}>{STATUSES.map(s => <option key={s}>{s}</option>)}</select>
                <input className="modern-input" style={{ margin: 0, flex: 1, minWidth: 200 }} maxLength={1000} value={remarks} onChange={e => setRemarks(e.target.value)}
                  placeholder={status === "Completed" ? "Remarks (optional)" : "Remarks — what you did today / what is pending (required)"} />
                <button className="btn" disabled={saving} onClick={post}>{saving ? "Saving…" : "Post update"}</button>
              </div>
              {err && <div style={{ color: "#b91c1c", fontSize: 12.5, marginTop: 6 }}>{err}</div>}
            </div>
          )}

          {t.updates.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 12.5, color: "#334155", marginBottom: 6 }}>Daily updates</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {[...t.updates].reverse().slice(0, 10).map((u, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: "#334155", display: "flex", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
                    <span style={{ color: "#94a3b8", minWidth: 78 }}>{fmt(u.date)}</span><b>{u.name}</b>
                    {u.type === "comment" ? <span style={{ color: "#166534", background: "#f0fdf4", borderRadius: 6, padding: "1px 8px" }}>💬 {u.remarks}</span> : <><Pill s={u.status} /><span>{u.remarks}</span></>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {canComment && (
            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", gap: 8 }}>
                <input className="modern-input" style={{ margin: 0, flex: 1, fontSize: 12.5 }} maxLength={600} placeholder="Add a comment for the team on this work…" value={comment} onChange={e => setComment(e.target.value)} />
                <button className="btn" style={{ fontSize: 12.5 }} disabled={!comment.trim()} onClick={postComment}>Comment</button>
              </div>
              {cErr && <div style={{ color: "#b91c1c", fontSize: 12.5, marginTop: 4 }}>{cErr}</div>}
            </div>
          )}
          {canDelete && <div style={{ marginTop: 12, textAlign: "right" }}><button className="btn ghost" onClick={onDelete} style={{ fontSize: 12, color: "#b91c1c", borderColor: "#fecaca", display: "inline-flex", alignItems: "center", gap: 6 }}><TbTrash /> Delete</button></div>}
        </div>
      )}
    </div>
  );
}

// What people in a department are working on today (their own daily plans), with their status and remarks.
function DailyBlock({ info, date }) {
  if (!info || (info.rows.length === 0 && info.missing.length === 0 && info.doneCount === 0)) return null;
  const when = date && date !== todayISO() ? fmt(date) : "today";
  return (
    <div className="card" style={{ margin: "0 0 10px", padding: 0, borderLeft: "4px solid #94a3b8", overflow: "hidden" }}>
      <div style={{ padding: "10px 14px", display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a" }}>Daily work · {when}</span>
        <span style={{ fontSize: 12, color: "#64748b" }}>{info.rows.length} in progress · {info.doneCount} done</span>
      </div>
      {info.rows.length > 0 && (
        <div style={{ borderTop: "1px solid #f1f5f9" }}>
          {info.rows.map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 14px", borderBottom: i < info.rows.length - 1 ? "1px solid #f8fafc" : "none", flexWrap: "wrap" }}>
              <div style={{ minWidth: 130, fontWeight: 600, fontSize: 13, color: "#334155" }}>{r.person}</div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontSize: 13.5, color: "#1e293b" }}>{r.title}{r.client && <span style={{ marginLeft: 8, fontSize: 11, color: "#0f766e", fontWeight: 600 }}>🏢 {r.client}</span>}</div>
                {r.remarks && <div style={{ fontSize: 12.5, color: "#475569", marginTop: 2 }}><b>Remarks:</b> {r.remarks}</div>}
                {r.comment && <div style={{ fontSize: 12, color: "#166534", marginTop: 2 }}>💬 {r.comment}</div>}
              </div>
              <Pill s={r.status} />
            </div>
          ))}
        </div>
      )}
      {info.missing.length > 0 && (
        <div style={{ padding: "8px 14px", background: "#fffbeb", borderTop: "1px solid #fde68a", fontSize: 12.5, color: "#92400e" }}>
          <b>Not planned yet:</b> {info.missing.join(", ")}
        </div>
      )}
    </div>
  );
}

function Insight({ taskId, headers, updates }) {
  const [text, setText] = useState(null);
  const [ai, setAi] = useState(false);
  useEffect(() => {
    let live = true;
    setText(null);
    fetch(`${BASE}/work-tasks/${taskId}/insight`, { headers }).then(r => (r.ok ? r.json() : null))
      .then(d => { if (live) { setText(d?.insight || ""); setAi(!!d?.ai); } }).catch(() => { if (live) setText(""); });
    return () => { live = false; };
  }, [taskId, updates, headers]);
  if (text === "") return null;
  return (
    <div style={{ margin: "10px 0", padding: "10px 12px", borderRadius: 10, background: "#f5f3ff", border: "1px solid #ddd6fe", color: "#4c1d95", fontSize: 13, lineHeight: 1.5 }}>
      <div style={{ fontWeight: 700, fontSize: 11.5, letterSpacing: 0.4, textTransform: "uppercase", marginBottom: 3 }}>{ai ? "AI insight" : "Quick read"}</div>
      {text === null ? "Reading the latest updates…" : text}
    </div>
  );
}

function NewWorkModal({ headers, token, onClose, onCreated }) {
  const [f, setF] = useState({ title: "", description: "", deadline: "", priority: "Medium", client: "" });
  const [people, setPeople] = useState([]);
  const [clients, setClients] = useState([]);
  const [picked, setPicked] = useState([]);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${BASE}/work-tasks/assignable`, { headers }).then(r => (r.ok ? r.json() : [])).then(setPeople).catch(() => {});
    fetch(`${BASE}/clients`, { headers: { Authorization: `Bearer ${token}` } }).then(r => (r.ok ? r.json() : [])).then(d => setClients(Array.isArray(d) ? d : [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = (id) => setPicked(p => (p.includes(id) ? p.filter(x => x !== id) : [...p, id]));
  const shown = people.filter(p => !q || `${p.name} ${p.department}`.toLowerCase().includes(q.toLowerCase()));

  async function create() {
    setErr("");
    if (!f.title.trim()) return setErr("Give the work a title.");
    if (!f.deadline) return setErr("A deadline is required.");
    if (f.deadline < todayISO()) return setErr("The deadline can't be in the past.");
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/work-tasks`, { method: "POST", headers, body: JSON.stringify({ ...f, assignee_ids: picked }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setErr(d.message || "Could not create.");
      onCreated();
    } catch { setErr("Network error."); } finally { setSaving(false); }
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "min(640px, 100%)", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #eef2f6", display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1, fontWeight: 800, fontSize: 17 }}>New work</div>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 32, height: 32, cursor: "pointer" }}><TbX /></button>
        </div>
        <div style={{ padding: 20, overflow: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
          <input className="modern-input" style={{ margin: 0 }} placeholder="What needs to be done? *" value={f.title} maxLength={200} onChange={e => setF({ ...f, title: e.target.value })} />
          <textarea className="modern-input" rows={3} style={{ margin: 0 }} placeholder="Details (optional)" value={f.description} maxLength={2000} onChange={e => setF({ ...f, description: e.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Deadline *
              <input type="date" className="modern-input" style={{ margin: "4px 0 0" }} min={todayISO()} value={f.deadline} onChange={e => setF({ ...f, deadline: e.target.value })} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Priority
              <select className="modern-input" style={{ margin: "4px 0 0" }} value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}><option>Low</option><option>Medium</option><option>High</option></select>
            </label>
            <label style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Client
              <select className="modern-input" style={{ margin: "4px 0 0" }} value={f.client} onChange={e => setF({ ...f, client: e.target.value })}><option value="">None</option>{clients.map(c => <option key={c._id}>{c.name}</option>)}</select>
            </label>
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 4 }}>Assign to <span style={{ fontWeight: 400, color: "#94a3b8" }}>(leave empty to keep it for yourself)</span></div>
            <input className="modern-input" style={{ margin: "0 0 6px" }} placeholder="Search people…" value={q} onChange={e => setQ(e.target.value)} />
            <div style={{ maxHeight: 190, overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 10 }}>
              {shown.map(p => (
                <label key={p._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontSize: 13 }}>
                  <input type="checkbox" checked={picked.includes(p._id)} onChange={() => toggle(p._id)} />
                  <span style={{ fontWeight: 600 }}>{p.name}{p.me ? " (me)" : ""}</span><span style={{ color: "#94a3b8", fontSize: 12 }}>{p.department}</span>
                </label>
              ))}
              {shown.length === 0 && <div style={{ padding: 14, color: "#94a3b8", fontSize: 13 }}>No one found.</div>}
            </div>
            {picked.length > 0 && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{picked.length} selected</div>}
          </div>
          {err && <div style={{ padding: "8px 12px", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", fontSize: 12.5 }}>{err}</div>}
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid #eef2f6", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={create} disabled={saving}>{saving ? "Creating…" : "Create & assign"}</button>
        </div>
      </div>
    </div>
  );
}
