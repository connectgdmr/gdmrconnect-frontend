import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  TbPlus, TbX, TbChevronDown, TbChevronRight, TbMoonStars, TbCircleCheck, TbAlertTriangle, TbMessageDots,
  TbDownload, TbSparkles, TbChecklist, TbSearch,
} from "react-icons/tb";
import { API_URL as BASE } from "../api";
import EveningUpdateModal from "./EveningUpdateModal";

// One Work page for everyone.
//   Employee : "My work" — every piece of work with its deadline; update status + remarks right there; Add work.
//   Manager  : the same, plus "My team" (their department) to see what is happening and comment.
//   Admin/Owner : "Everyone", department by department, with a short plain-English summary.
const STATUSES = ["Pending", "Started", "In Progress", "Blocked", "Completed"];
const SC = { Pending: "#64748b", Started: "#2563eb", "In Progress": "#d97706", Blocked: "#b91c1c", Completed: "#16a34a" };
const PERSON = {
  updated:  { t: "Day updated", c: "#166534", b: "#f0fdf4", e: "#bbf7d0" },
  working:  { t: "Working",     c: "#1d4ed8", b: "#eff6ff", e: "#bfdbfe" },
  no_work:  { t: "No work added", c: "#b45309", b: "#fffbeb", e: "#fde68a" },
  not_in:   { t: "Not in",      c: "#b91c1c", b: "#fef2f2", e: "#fecaca" },
  on_leave: { t: "On leave",    c: "#475569", b: "#f1f5f9", e: "#e2e8f0" },
  off:      { t: "Day off",     c: "#475569", b: "#f1f5f9", e: "#e2e8f0" },
};
const todayISO = () => new Date().toISOString().slice(0, 10);
const daysBetween = (a, b) => Math.round((new Date(`${a}T00:00:00`) - new Date(`${b}T00:00:00`)) / 864e5);
const niceDate = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—");

function DeadlineChip({ item }) {
  if (item.done) return <span style={{ fontSize: 11.5, color: "#16a34a", fontWeight: 600 }}>Done</span>;
  const n = daysBetween(item.deadline, todayISO());
  const [txt, c, b] = n < 0 ? [`Overdue ${Math.abs(n)}d`, "#b91c1c", "#fef2f2"] : n === 0 ? ["Due today", "#b45309", "#fffbeb"] : [`Due ${niceDate(item.deadline)}`, "#475569", "#f1f5f9"];
  return <span style={{ fontSize: 11.5, fontWeight: 700, color: c, background: b, borderRadius: 6, padding: "2px 8px", whiteSpace: "nowrap" }}>{txt}</span>;
}

export default function WorkHub({ token, role = "employee" }) {
  const isTop = role === "admin" || role === "owner";
  const headers = useMemo(() => ({ Authorization: `Bearer ${token}`, "Content-Type": "application/json" }), [token]);
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showDay, setShowDay] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const r = await fetch(`${BASE}/work/board`, { headers });
      setBoard(r.ok ? await r.json() : { me: { items: [] }, team: null });
    } catch { setBoard({ me: { items: [] }, team: null }); }
    finally { setLoading(false); }
  }, [headers]);
  useEffect(() => { load(); }, [load]);

  const hasTeam = !!board?.team;
  useEffect(() => {
    if (!hasTeam) return;
    fetch(`${BASE}/work/summary`, { headers }).then(r => (r.ok ? r.json() : null)).then(d => setSummary(d)).catch(() => {});
  }, [hasTeam, headers]);

  useEffect(() => {
    const open = () => setShowDay(true);
    window.addEventListener("gdmr:open-evening-update", open);
    return () => window.removeEventListener("gdmr:open-evening-update", open);
  }, []);

  if (loading && !board) return <div className="loader" style={{ margin: "60px auto" }} />;
  const me = board?.me || { items: [] };
  const team = board?.team;
  const showMine = !isTop || me.items.length > 0;
  const needsDay = !isTop && me.day_state && me.day_state !== "ok";

  function exportCSV() {
    const rows = [["Department", "Person", "Work", "Deadline", "Status", "Remarks"]];
    (team?.people || []).forEach(p => p.items.forEach(i => rows.push([p.department, p.name, i.title, i.deadline, i.status, i.remarks || ""])));
    const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `work-${todayISO()}.csv`; a.click();
  }

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card" style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h3 style={{ margin: 0, color: "var(--brand)" }}>Work</h3>
          <p className="small" style={{ margin: "4px 0 0" }}>
            {isTop ? "Everyone's work in one place — what is happening, what is late, and who needs help."
              : role === "manager" ? "Your own work, and what your team is doing." : "Everything you are working on, with deadlines. Keep the status and remarks up to date."}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {team && <button className="btn ghost" onClick={exportCSV} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}><TbDownload /> Export</button>}
          <button className="btn" onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}><TbPlus /> Add work</button>
        </div>
      </div>

      {msg && <div style={{ marginBottom: 12, padding: "9px 14px", borderRadius: 8, fontSize: 13, background: "#f0fdf4", color: "#166534" }}>{msg}</div>}

      {needsDay && (
        <div style={{ marginBottom: 14, padding: "12px 16px", borderRadius: 12, background: "#fffbeb", border: "1px solid #fde68a", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <TbMoonStars size={20} color="#b45309" />
          <div style={{ flex: 1, minWidth: 200, fontSize: 13.5, color: "#92400e" }}>
            {me.day_state === "no_work" ? <><b>Add today's work</b> so your manager can see what you're doing.</>
              : <><b>Before you check out,</b> update the status and remarks of today's work.</>}
          </div>
          {me.day_state === "no_work"
            ? <button className="btn" onClick={() => setShowAdd(true)}>Add work</button>
            : <button className="btn" onClick={() => setShowDay(true)}>Update my day</button>}
        </div>
      )}
      {!isTop && me.day_state === "ok" && me.items.length > 0 && (
        <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 12, background: "#f0fdf4", border: "1px solid #bbf7d0", color: "#166534", fontSize: 13.5, display: "flex", gap: 8, alignItems: "center" }}>
          <TbCircleCheck /> Your day is updated. You can check out whenever you're ready.
        </div>
      )}

      {team && <TeamSection team={team} summary={summary} headers={headers} onChanged={() => load(true)} defaultOpen={!isTop} />}
      {showMine && (
        <MyWork items={me.items} headers={headers} onChanged={() => load(true)} onAdd={() => setShowAdd(true)} onDay={() => setShowDay(true)} showDay={!isTop} title={team ? "My own work" : null} />
      )}

      {showAdd && <AddWork headers={headers} onClose={() => setShowAdd(false)} onCreated={(m) => { setShowAdd(false); setMsg(m); load(true); setTimeout(() => setMsg(""), 5000); }} />}
      {showDay && <EveningUpdateModal token={token} date={todayISO()} onClose={() => setShowDay(false)} onDone={() => { setShowDay(false); setMsg("Your day is updated."); load(true); setTimeout(() => setMsg(""), 5000); }} />}
    </div>
  );
}

// ── my work ─────────────────────────────────────────────────────────────────
function MyWork({ items, headers, onChanged, onAdd, onDay, showDay, title }) {
  const [showDone, setShowDone] = useState(false);
  const open = items.filter(i => !i.done);
  const groups = [
    ["Overdue", open.filter(i => i.overdue), "#b91c1c"],
    ["Due today", open.filter(i => i.due_today), "#b45309"],
    ["Coming up", open.filter(i => !i.overdue && !i.due_today), "#334155"],
  ];
  const done = items.filter(i => i.done);
  return (
    <div style={{ marginTop: title ? 22 : 0 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 2px 10px", flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a" }}>{title || "My work"} <span style={{ fontWeight: 500, color: "#94a3b8", fontSize: 13 }}>· {open.length} open</span></div>
        {showDay && items.length > 0 && <button className="btn ghost" onClick={onDay} style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}><TbMoonStars /> Update my day</button>}
      </div>
      {items.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "40px 20px", color: "#94a3b8" }}>
          <TbChecklist size={34} style={{ opacity: 0.3 }} />
          <p style={{ margin: "8px 0 14px" }}>No work yet. Add what you are working on, with a deadline.</p>
          <button className="btn" onClick={onAdd}><TbPlus /> Add work</button>
        </div>
      ) : (
        <>
          {groups.map(([label, list, color]) => list.length > 0 && (
            <div key={label} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color, margin: "0 0 6px 2px" }}>{label} · {list.length}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{list.map(i => <EditableItem key={i.key} item={i} headers={headers} onSaved={onChanged} />)}</div>
            </div>
          ))}
          {open.length === 0 && <div className="card" style={{ padding: "16px 18px", color: "#166534", background: "#f0fdf4" }}><TbCircleCheck /> Nothing open — nice work.</div>}
          {done.length > 0 && (
            <div style={{ marginTop: 6 }}>
              <button onClick={() => setShowDone(!showDone)} style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontWeight: 600, fontSize: 12.5, display: "flex", alignItems: "center", gap: 4 }}>
                {showDone ? <TbChevronDown /> : <TbChevronRight />} Done recently ({done.length})
              </button>
              {showDone && <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>{done.map(i => <EditableItem key={i.key} item={i} headers={headers} onSaved={onChanged} />)}</div>}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function EditableItem({ item, headers, onSaved }) {
  const [status, setStatus] = useState(item.status);
  const [remarks, setRemarks] = useState(item.remarks || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const dirty = status !== item.status || remarks !== (item.remarks || "");
  const edge = item.done ? "#16a34a" : item.overdue ? "#b91c1c" : item.due_today ? "#d97706" : "#cbd5e1";

  async function save() {
    setErr(""); setSaving(true);
    try {
      const r = await fetch(`${BASE}/work/update`, { method: "POST", headers, body: JSON.stringify({ kind: item.kind, id: item.id, plan_id: item.plan_id, status, remarks }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setErr(d.message || "Could not save."); return; }
      onSaved();
    } catch { setErr("Network error."); } finally { setSaving(false); }
  }

  return (
    <div className="card" style={{ margin: 0, padding: "12px 14px", borderLeft: `4px solid ${edge}`, opacity: item.done ? 0.8 : 1 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14, textDecoration: item.done ? "line-through" : "none" }}>{item.title}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 4, fontSize: 12, color: "#64748b" }}>
            <DeadlineChip item={item} />
            {item.by && <span>from {item.by}</span>}
            {item.client && <span style={{ color: "#0f766e", fontWeight: 600 }}>🏢 {item.client}</span>}
            {item.others?.length > 0 && <span>with {item.others.join(", ")}</span>}
          </div>
        </div>
        <select value={STATUSES.includes(status) ? status : "__x"} onChange={e => setStatus(e.target.value)}
          style={{ fontSize: 12, fontWeight: 700, color: SC[status] || "#334155", border: "1px solid #cbd5e1", borderRadius: 8, padding: "6px 10px", background: "#fff" }}>
          {!STATUSES.includes(status) && <option value="__x">{status}</option>}
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <input className="modern-input" style={{ margin: 0, flex: 1, fontSize: 12.5 }} maxLength={1000} value={remarks} onChange={e => setRemarks(e.target.value)}
          placeholder={status === "Completed" ? "Remarks (optional)" : "Remarks — what you did / what is pending"} onKeyDown={e => { if (e.key === "Enter" && dirty) save(); }} />
        {dirty && <button className="btn" style={{ fontSize: 12.5 }} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</button>}
      </div>
      {item.comment && <div style={{ marginTop: 8, fontSize: 12.5, color: "#166534", background: "#f0fdf4", borderRadius: 6, padding: "4px 9px", display: "inline-block" }}>💬 {item.comment.by}: {item.comment.text}</div>}
      {err && <div style={{ color: "#b91c1c", fontSize: 12.5, marginTop: 6 }}>{err}</div>}
    </div>
  );
}

// ── team (managers / admins / owners) ───────────────────────────────────────
function TeamSection({ team, summary, headers, onChanged, defaultOpen }) {
  const t = team.totals;
  const [q, setQ] = useState("");
  const depts = useMemo(() => {
    const g = {};
    team.people.filter(p => !q || `${p.name} ${p.items.map(i => i.title).join(" ")}`.toLowerCase().includes(q.toLowerCase())).forEach(p => { (g[p.department] = g[p.department] || []).push(p); });
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [team, q]);
  const attention = t.overdue + t.blocked + t.no_work;
  const tile = (label, value, color, sub) => (
    <div className="card" style={{ margin: 0, padding: "12px 14px" }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1.15 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{sub}</div>}
    </div>
  );
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a", margin: "0 2px 10px" }}>{defaultOpen ? "My team" : "Everyone"}</div>
      <div className="card" style={{ margin: "0 0 12px", padding: "14px 16px", background: "#f5f3ff", border: "1px solid #ddd6fe" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700, fontSize: 12, letterSpacing: 0.4, textTransform: "uppercase", color: "#5b21b6", marginBottom: 4 }}>
          <TbSparkles /> {summary?.ai ? "What's happening today · AI" : "What's happening today"}
        </div>
        <div style={{ fontSize: 14, color: "#312e81", lineHeight: 1.55 }}>{summary ? summary.summary : "Reading today's updates…"}</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, marginBottom: 12 }}>
        {tile("Day updated", `${t.updated}/${t.people}`, "#16a34a", "people")}
        {tile("Open work", t.open, "#0f172a", `${t.done} done recently`)}
        {tile("Overdue", t.overdue, t.overdue ? "#b91c1c" : "#94a3b8")}
        {tile("Needs attention", attention, attention ? "#b45309" : "#94a3b8", `${t.blocked} blocked · ${t.no_work} no work added`)}
      </div>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <TbSearch style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
        <input className="modern-input" placeholder="Search a person or work…" value={q} onChange={e => setQ(e.target.value)} style={{ paddingLeft: 36, margin: 0 }} />
      </div>
      {depts.length === 0 ? <div className="card" style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>No one found.</div>
        : depts.map(([name, people]) => <DeptBlock key={name} name={name} people={people} headers={headers} onChanged={onChanged} startOpen={defaultOpen || depts.length === 1 || !!q} />)}
    </div>
  );
}

function DeptBlock({ name, people, headers, onChanged, startOpen }) {
  const [open, setOpen] = useState(startOpen);
  useEffect(() => { setOpen(startOpen); }, [startOpen]);
  const openCount = people.reduce((s, p) => s + p.open, 0);
  const overdue = people.reduce((s, p) => s + p.overdue, 0);
  const updated = people.filter(p => p.status === "updated").length;
  return (
    <div className="card" style={{ margin: "0 0 10px", padding: 0, overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", cursor: "pointer", flexWrap: "wrap" }}>
        {open ? <TbChevronDown color="#94a3b8" /> : <TbChevronRight color="#94a3b8" />}
        <div style={{ fontWeight: 800, fontSize: 14.5, color: "#0f172a", flex: 1, minWidth: 140 }}>{name}</div>
        <span style={{ fontSize: 12.5, color: "#64748b" }}>{people.length} people · {updated} updated</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a" }}>{openCount} open</span>
        {overdue > 0 && <span style={{ fontSize: 12, fontWeight: 700, color: "#b91c1c", background: "#fef2f2", borderRadius: 6, padding: "2px 8px" }}>{overdue} overdue</span>}
      </div>
      {open && <div style={{ borderTop: "1px solid #f1f5f9" }}>{people.map(p => <PersonBlock key={p.user_id} p={p} headers={headers} onChanged={onChanged} />)}</div>}
    </div>
  );
}

function PersonBlock({ p, headers, onChanged }) {
  const [open, setOpen] = useState(false);
  const m = PERSON[p.status] || PERSON.off;
  return (
    <div style={{ borderBottom: "1px solid #f6f8fa" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px 10px 40px", cursor: "pointer", flexWrap: "wrap" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--brand-light)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>{p.name?.[0]?.toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a" }}>{p.name}{p.role === "manager" && <span style={{ marginLeft: 6, fontSize: 10.5, color: "#64748b" }}>Manager</span>}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{p.open} open{p.overdue ? ` · ${p.overdue} overdue` : ""}{p.check_in_time ? ` · in at ${p.check_in_time}` : ""}</div>
        </div>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: m.c, background: m.b, border: `1px solid ${m.e}`, borderRadius: 7, padding: "3px 10px", whiteSpace: "nowrap" }}>{m.t}</span>
        {open ? <TbChevronDown color="#94a3b8" /> : <TbChevronRight color="#94a3b8" />}
      </div>
      {open && (
        <div style={{ padding: "0 16px 12px 40px" }}>
          {p.items.length === 0 ? <div style={{ fontSize: 13, color: "#94a3b8", padding: "6px 0" }}>No work added yet today.</div>
            : p.items.map(i => <TeamItem key={i.key} item={i} plan={p} headers={headers} onChanged={onChanged} />)}
          {p.day_note && <div style={{ marginTop: 6, padding: "7px 11px", background: "#f5f3ff", borderRadius: 8, fontSize: 12.5, color: "#4c1d95" }}><b>End-of-day note:</b> {p.day_note}</div>}
        </div>
      )}
    </div>
  );
}

function TeamItem({ item, plan, headers, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [txt, setTxt] = useState(item.comment?.text || "");
  const [err, setErr] = useState("");
  async function save() {
    setErr("");
    const url = item.kind === "assigned" ? `${BASE}/work-tasks/${item.id}/comment` : `${BASE}/admin/work-plans/${item.plan_id}/task/${item.id}/comment`;
    const r = await fetch(url, { method: "POST", headers, body: JSON.stringify({ comment: txt.trim() }) });
    if (r.ok) { setEditing(false); onChanged(); } else { const d = await r.json().catch(() => ({})); setErr(d.message || "Could not save."); }
  }
  const col = SC[item.status] || "#334155";
  return (
    <div style={{ padding: "9px 0", borderBottom: "1px solid #f4f6f8" }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: item.done ? "#94a3b8" : "#1e293b", textDecoration: item.done ? "line-through" : "none" }}>{item.title}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 3, fontSize: 12, color: "#64748b" }}>
            <DeadlineChip item={item} />{item.by && <span>from {item.by}</span>}{item.client && <span style={{ color: "#0f766e", fontWeight: 600 }}>🏢 {item.client}</span>}
            {item.others?.length > 0 && <span>with {item.others.join(", ")}</span>}
          </div>
          {item.remarks && <div style={{ fontSize: 12.5, color: "#475569", marginTop: 4 }}><b>Remarks:</b> {item.remarks}</div>}
          {item.comment && !editing && <div style={{ fontSize: 12.5, color: "#166534", background: "#f0fdf4", borderRadius: 6, padding: "3px 9px", marginTop: 4, display: "inline-block" }}><TbMessageDots style={{ verticalAlign: -2 }} /> {item.comment.by}: {item.comment.text}</div>}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: col, border: `1px solid ${col}33`, background: "#fff", borderRadius: 7, padding: "2px 9px" }}>{item.status}</span>
        <button className="btn ghost" style={{ fontSize: 11.5, padding: "3px 9px" }} onClick={() => setEditing(!editing)}>{item.comment ? "Edit comment" : "Comment"}</button>
      </div>
      {editing && (
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <input className="modern-input" style={{ margin: 0, flex: 1, fontSize: 12.5 }} autoFocus maxLength={600} placeholder={`Comment for ${plan.name.split(" ")[0]}…`} value={txt} onChange={e => setTxt(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && txt.trim()) save(); }} />
          <button className="btn" style={{ fontSize: 12 }} disabled={!txt.trim()} onClick={save}>Save</button>
        </div>
      )}
      {err && <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>{err}</div>}
    </div>
  );
}

// ── add work ────────────────────────────────────────────────────────────────
function AddWork({ headers, onClose, onCreated }) {
  const [f, setF] = useState({ title: "", deadline: "", description: "" });
  const [people, setPeople] = useState([]);
  const [picked, setPicked] = useState([]);
  const [others, setOthers] = useState(false);
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => { fetch(`${BASE}/work-tasks/assignable`, { headers }).then(r => (r.ok ? r.json() : [])).then(setPeople).catch(() => {}); }, [headers]);
  const list = people.filter(p => !p.me && (!q || `${p.name} ${p.department}`.toLowerCase().includes(q.toLowerCase())));

  async function create() {
    setErr("");
    if (!f.title.trim()) return setErr("Write what needs to be done.");
    if (!f.deadline) return setErr("A deadline is required.");
    if (f.deadline < todayISO()) return setErr("The deadline can't be in the past.");
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/work-tasks`, { method: "POST", headers, body: JSON.stringify({ ...f, assignee_ids: picked }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return setErr(d.message || "Could not add the work.");
      onCreated(picked.length ? `Work added and assigned to ${picked.length} ${picked.length === 1 ? "person" : "people"}.` : "Work added.");
    } catch { setErr("Network error."); } finally { setSaving(false); }
  }
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 16, width: "min(520px, 100%)", maxHeight: "92vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #eef2f6", display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1, fontWeight: 800, fontSize: 17 }}>Add work</div>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 32, height: 32, cursor: "pointer" }}><TbX /></button>
        </div>
        <div style={{ padding: 20, overflow: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
          <input className="modern-input" style={{ margin: 0 }} autoFocus placeholder="What needs to be done?" maxLength={200} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} />
          <label style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>Deadline (required)
            <input type="date" className="modern-input" style={{ margin: "4px 0 0" }} min={todayISO()} value={f.deadline} onChange={e => setF({ ...f, deadline: e.target.value })} />
          </label>
          <textarea className="modern-input" rows={2} style={{ margin: 0 }} placeholder="Details (optional)" maxLength={2000} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>For: <span style={{ color: "#0f172a" }}>{picked.length ? `${picked.length} selected` : "just me"}</span>{" "}
              <button type="button" onClick={() => setOthers(!others)} style={{ background: "none", border: "none", color: "var(--brand)", cursor: "pointer", fontWeight: 700, fontSize: 12.5 }}>{others ? "Hide" : "Assign to others…"}</button>
            </div>
            {others && (
              <div style={{ marginTop: 6 }}>
                <input className="modern-input" style={{ margin: "0 0 6px" }} placeholder="Search people…" value={q} onChange={e => setQ(e.target.value)} />
                <div style={{ maxHeight: 180, overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 10 }}>
                  {list.map(p => (
                    <label key={p._id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontSize: 13 }}>
                      <input type="checkbox" checked={picked.includes(p._id)} onChange={() => setPicked(x => (x.includes(p._id) ? x.filter(i => i !== p._id) : [...x, p._id]))} />
                      <span style={{ fontWeight: 600 }}>{p.name}</span><span style={{ color: "#94a3b8", fontSize: 12 }}>{p.department}</span>
                    </label>
                  ))}
                  {list.length === 0 && <div style={{ padding: 12, color: "#94a3b8", fontSize: 13 }}>No one found.</div>}
                </div>
              </div>
            )}
          </div>
          {err && <div style={{ padding: "8px 12px", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", fontSize: 12.5 }}>{err}</div>}
        </div>
        <div style={{ padding: "12px 20px", borderTop: "1px solid #eef2f6", display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button className="btn ghost" onClick={onClose}>Cancel</button>
          <button className="btn" onClick={create} disabled={saving}>{saving ? "Adding…" : "Add work"}</button>
        </div>
      </div>
    </div>
  );
}
