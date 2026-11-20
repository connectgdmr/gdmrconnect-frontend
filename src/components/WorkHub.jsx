import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  TbPlus, TbX, TbChevronDown, TbChevronRight, TbMoonStars, TbCircleCheck, TbAlertTriangle, TbMessageDots,
  TbDownload, TbSparkles, TbChecklist, TbSearch, TbFileTypePdf, TbFileTypeXls, TbHistory,
} from "react-icons/tb";
import { API_URL as BASE } from "../api";
import { escHtml } from "../utils/security";
import EveningUpdateModal, { ExportPanel } from "./EveningUpdateModal";

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
const fmtTime = (s) => {                       // "2026-11-17T10:12:18+05:30" -> "10:12" (the company's own clock)
  const m = String(s).match(/T(\d{2}):(\d{2})/);
  return m ? `${m[1]}:${m[2]}` : s;
};
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
  const [backToDay, setBackToDay] = useState(false);       // opened Add work from inside "Update my day": return there afterwards
  const [msg, setMsg] = useState("");
  const [exportOpen, setExportOpen] = useState(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const r = await fetch(`${BASE}/work/board`, { headers });
      setBoard(r.ok ? await r.json() : { me: { items: [] }, team: null });
    } catch { setBoard({ me: { items: [] }, team: null }); }
    finally { setLoading(false); }
  }, [headers]);
  useEffect(() => { load(); }, [load]);

  // opening the Work page counts as seeing newly assigned work (after a moment, so the "New" tags are noticed)
  useEffect(() => {
    if (!board?.me?.items?.some(i => i.is_new)) return undefined;
    const t = setTimeout(() => {
      fetch(`${BASE}/work/alerts/seen`, { method: "POST", headers }).then(() => window.dispatchEvent(new Event("gdmr:work-alerts-refresh"))).catch(() => {});
    }, 2500);
    return () => clearTimeout(t);
  }, [board, headers]);

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
  // the day runs: check in -> morning work update (before 11:30 AM) -> evening work update -> check out
  const istMinutes = (() => { const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date()); return Number(p.find(x => x.type === "hour").value) * 60 + Number(p.find(x => x.type === "minute").value); })();
  const morningLate = istMinutes >= 11 * 60 + 30;

  // rows for both downloads: one line per piece of work
  const exportRows = () => {
    const rows = [["Department", "Person", "Day status", "Work", "Deadline", "Status", "Remarks"]];
    (team?.people || []).forEach(p => {
      const st = (PERSON[p.status] || PERSON.off).t;
      if (p.items.length === 0) rows.push([p.department, p.name, st, "—", "", "", ""]);
      p.items.forEach(i => rows.push([p.department, p.name, st, i.title, i.deadline || "", i.status, i.remarks || ""]));
    });
    return rows;
  };
  const tableHtml = (rows, headStyle, cellStyle) => `<table style="border-collapse:collapse;width:100%"><thead><tr>${rows[0].map(h => `<th style="${headStyle}">${escHtml(h)}</th>`).join("")}</tr></thead><tbody>${rows.slice(1).map(r => `<tr>${r.map(c => `<td style="${cellStyle}">${escHtml(String(c ?? ""))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  function downloadExcel() {
    setExportOpen(false);
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body><h3>Work status — ${todayISO()}</h3>${tableHtml(exportRows(), "background:#e2e8f0;border:1px solid #94a3b8;padding:4px 8px;text-align:left", "border:1px solid #cbd5e1;padding:4px 8px")}</body></html>`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff", html], { type: "application/vnd.ms-excel;charset=utf-8" }));
    a.download = `work-status-${todayISO()}.xls`; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function downloadPDF() {
    setExportOpen(false);
    const w = window.open("", "_blank", "width=1000,height=750");
    if (!w) { setMsg("Allow pop-ups for this site to download the PDF."); return; }
    const rows = exportRows();
    w.document.write(`<html><head><title>Work status ${todayISO()}</title></head><body style="font-family:Arial,sans-serif;padding:18px;color:#0f172a">
      <h2 style="margin:0 0 4px">Work status</h2><div style="color:#64748b;font-size:12px;margin-bottom:12px">${escHtml(new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }))}${team ? ` · ${team.totals.updated}/${team.totals.people} updated · ${team.totals.open} ongoing · ${team.totals.overdue} overdue` : ""}</div>
      ${tableHtml(rows, "text-align:left;padding:7px 8px;border-bottom:2px solid #334155;font-size:11px;text-transform:uppercase;color:#475569", "padding:6px 8px;border-bottom:1px solid #e5e7eb;font-size:12px;vertical-align:top")}
      </body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 300);
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
          {team && (
            <div style={{ position: "relative" }}>
              <button className="btn ghost" onClick={() => setExportOpen(o => !o)} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}><TbDownload /> Export <TbChevronDown size={12} /></button>
              {exportOpen && (
                <>
                  <div onClick={() => setExportOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                  <div style={{ position: "absolute", right: 0, top: "calc(100% + 6px)", zIndex: 41, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 10px 28px rgba(15,23,42,.14)", minWidth: 190, overflow: "hidden" }}>
                    <button onClick={downloadPDF} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "#0f172a", textAlign: "left" }}><TbFileTypePdf size={18} color="#dc2626" /> Download PDF</button>
                    <button onClick={downloadExcel} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "11px 14px", border: "none", borderTop: "1px solid #f1f5f9", background: "none", cursor: "pointer", fontSize: 13.5, fontWeight: 600, color: "#0f172a", textAlign: "left" }}><TbFileTypeXls size={18} color="#16a34a" /> Download Excel (.xls)</button>
                  </div>
                </>
              )}
            </div>
          )}
          <button className="btn" onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}><TbPlus /> Add work</button>
        </div>
      </div>

      {msg && <div style={{ marginBottom: 12, padding: "9px 14px", borderRadius: 8, fontSize: 13, background: "#f0fdf4", color: "#166534" }}>{msg}</div>}

      {needsDay && (
        <div style={{ marginBottom: 14, padding: "12px 16px", borderRadius: 12, background: me.day_state === "no_work" && morningLate ? "#fef2f2" : "#fffbeb", border: `1px solid ${me.day_state === "no_work" && morningLate ? "#fecaca" : "#fde68a"}`, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <TbMoonStars size={20} color={me.day_state === "no_work" && morningLate ? "#b91c1c" : "#b45309"} />
          <div style={{ flex: 1, minWidth: 200, fontSize: 13.5, color: me.day_state === "no_work" && morningLate ? "#991b1b" : "#92400e" }}>
            {me.day_state === "no_work" ? (morningLate ? <><b>Morning work update is late.</b> Add today's work now — the morning report went out at 11:30 AM.</> : <><b>Morning update:</b> after checking in, add today's work before 11:30 AM.</>)
              : <><b>Evening update:</b> update the status and remarks of today's work, then check out.</>}
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

      {showAdd && <AddWork headers={headers} onClose={() => { setShowAdd(false); if (backToDay) { setBackToDay(false); setShowDay(true); } }} onCreated={(m) => { setShowAdd(false); if (backToDay) { setBackToDay(false); setShowDay(true); } setMsg(m); load(true); setTimeout(() => setMsg(""), 5000); }} />}
      {showDay && <EveningUpdateModal token={token} date={todayISO()} onAddWork={() => { setShowDay(false); setBackToDay(true); setShowAdd(true); }} onClose={() => setShowDay(false)} onDone={() => { setShowDay(false); setMsg("Your day is updated."); load(true); setTimeout(() => setMsg(""), 5000); }} />}
    </div>
  );
}

// ── my work ─────────────────────────────────────────────────────────────────
function MyWork({ items, headers, onChanged, onAdd, onDay, showDay, title }) {
  const [showDone, setShowDone] = useState(false);
  const [hist, setHist] = useState(false);
  const [exp, setExp] = useState(false);
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
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn ghost" onClick={() => setHist(true)} style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}><TbHistory /> My history</button>
          <button className="btn ghost" onClick={() => setExp(true)} style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}><TbDownload /> Export</button>
          {showDay && items.length > 0 && <button className="btn ghost" onClick={onDay} style={{ fontSize: 12.5, display: "flex", alignItems: "center", gap: 6 }}><TbMoonStars /> Update my day</button>}
        </div>
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
      {hist && <HistoryModal headers={headers} userId={null} name="My" onClose={() => setHist(false)} />}
      {exp && <ExportPanel headers={headers} onClose={() => setExp(false)} />}
    </div>
  );
}

function EditableItem({ item, headers, onSaved }) {
  // Only the status can be changed here (one tap). Remarks are written at the end of the day in "Update my day".
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  async function setStatus(next) {
    if (next === item.status) return;
    setSaving(true); setErr("");
    try {
      const r = await fetch(`${BASE}/work/update`, { method: "POST", headers, body: JSON.stringify({ kind: item.kind, id: item.id, plan_id: item.plan_id, status: next, remarks: item.remarks || "" }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) setErr(d.message || "Could not change the status.");
      else onSaved && onSaved();
    } catch { setErr("Network error — status not changed."); } finally { setSaving(false); }
  }
  const edge = item.done ? "#16a34a" : item.overdue ? "#b91c1c" : item.due_today ? "#d97706" : "#cbd5e1";
  const status = item.status;
  return (
    <div className="card" style={{ margin: 0, padding: "12px 14px", borderLeft: `4px solid ${edge}`, opacity: item.done ? 0.8 : 1 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 14, textDecoration: item.done ? "line-through" : "none" }}>{item.title}
            {item.is_new && <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4, color: "#fff", background: "#ef4444", borderRadius: 5, padding: "1px 7px", verticalAlign: 1 }}>NEW</span>}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 4, fontSize: 12, color: "#64748b" }}>
            <DeadlineChip item={item} />
            {item.by && <span>from {item.by}</span>}
            {item.client && <span style={{ color: "#0f766e", fontWeight: 600 }}>🏢 {item.client}</span>}
            {item.others?.length > 0 && <span>with {item.others.join(", ")}</span>}
          </div>
        </div>
        <select aria-label={`Status of ${item.title}`} value={status} disabled={saving} onChange={e => setStatus(e.target.value)}
          style={{ fontSize: 12.5, fontWeight: 700, color: SC[status] || "#334155", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", background: "#f8fafc", cursor: saving ? "wait" : "pointer", opacity: saving ? 0.6 : 1 }}>
          {(STATUSES.includes(status) ? STATUSES : [status, ...STATUSES]).map(st => <option key={st} value={st}>{st}</option>)}
        </select>
      </div>
      {err && <div style={{ marginTop: 6, fontSize: 12, color: "#b91c1c" }}>{err}</div>}
      {item.remarks && <div style={{ marginTop: 8, fontSize: 12.5, color: "#475569" }}>Remarks: {item.remarks}</div>}
      {item.comment && <div style={{ marginTop: 8, fontSize: 12.5, color: "#166534", background: "#f0fdf4", borderRadius: 6, padding: "4px 9px", display: "inline-block" }}>💬 {item.comment.by}: {item.comment.text}</div>}
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
  const [popup, setPopup] = useState(null);       // "updated" | "ongoing" | "overdue" | "attention"
  const tile = (key, label, value, color, sub, clickable = true) => (
    <div className="card" onClick={clickable ? () => setPopup(key) : undefined} role={clickable ? "button" : undefined}
      onMouseEnter={e => { if (clickable) e.currentTarget.style.boxShadow = "0 6px 16px rgba(15,23,42,.10)"; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = ""; }}
      style={{ margin: 0, padding: "12px 14px", cursor: clickable ? "pointer" : "default", transition: "box-shadow .12s" }}>
      <div style={{ fontSize: 12, color: "#64748b", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, lineHeight: 1.15 }}>{value}</div>
      {sub && <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{sub}</div>}
      {clickable && <div style={{ fontSize: 11, color: "var(--brand)", fontWeight: 600, marginTop: 2 }}>Click to view</div>}
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
        {tile("updated", "Day updated", `${t.updated}/${t.people}`, "#16a34a", "people")}
        {tile("ongoing", "Ongoing work", t.open, "#0f172a", `${t.done} done recently`)}
        {tile("overdue", "Overdue", t.overdue, t.overdue ? "#b91c1c" : "#94a3b8")}
        {tile("attention", "Needs attention", attention, attention ? "#b45309" : "#94a3b8", `${t.blocked} blocked · ${t.no_work} no work added`)}
      </div>
      {popup && <TilePopup kind={popup} team={team} onClose={() => setPopup(null)} />}
      <div style={{ position: "relative", marginBottom: 12 }}>
        <TbSearch style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
        <input className="modern-input" placeholder="Search a person or work…" value={q} onChange={e => setQ(e.target.value)} style={{ paddingLeft: 36, margin: 0 }} />
      </div>
      {depts.length === 0 ? <div className="card" style={{ textAlign: "center", padding: 30, color: "#94a3b8" }}>No one found.</div>
        : depts.map(([name, people]) => <DeptBlock key={name} name={name} people={people} headers={headers} onChanged={onChanged} startOpen={defaultOpen || depts.length === 1 || !!q} />)}
    </div>
  );
}

// What is behind a number: the people or the work, with department, person, deadline, status and remarks.
function TilePopup({ kind, team, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const items = team.people.flatMap(p => p.items.filter(i => !i.done).map(i => ({ ...i, person: p.name, dept: p.department })));
  const byDept = (a, b) => a.dept.localeCompare(b.dept) || a.person.localeCompare(b.person);
  const people = (list) => list.map(p => ({ ...p, dept: p.department })).sort((a, b) => a.dept.localeCompare(b.dept) || a.name.localeCompare(b.name));
  let title, sections;
  if (kind === "updated") {
    title = "Day updated";
    sections = [
      ["Updated their day", "people", people(team.people.filter(p => p.status === "updated"))],
      ["Not updated yet", "people", people(team.people.filter(p => ["working", "no_work", "not_in"].includes(p.status)))],
      ["On leave / day off", "people", people(team.people.filter(p => ["on_leave", "off"].includes(p.status)))],
    ];
  } else if (kind === "ongoing") {
    title = "Ongoing work";
    sections = [["All open work", "items", [...items].sort(byDept)]];
  } else if (kind === "overdue") {
    title = "Overdue work";
    sections = [["Past their deadline", "items", items.filter(i => i.overdue).sort(byDept)]];
  } else {
    title = "Needs attention";
    sections = [
      ["Checked in but no work added", "people", people(team.people.filter(p => p.status === "no_work"))],
      ["Blocked", "items", items.filter(i => String(i.status).toLowerCase() === "blocked").sort(byDept)],
      ["Overdue", "items", items.filter(i => i.overdue).sort(byDept)],
    ];
  }
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" style={{ background: "#fff", borderRadius: 16, width: "min(900px, 100%)", maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(15,23,42,.28)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #eef2f6", display: "flex", alignItems: "center" }}>
          <div style={{ flex: 1, fontWeight: 800, fontSize: 17 }}>{title}</div>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 32, height: 32, cursor: "pointer" }}><TbX /></button>
        </div>
        <div style={{ overflow: "auto", padding: "6px 20px 20px" }}>
          {sections.every(([, , rows]) => rows.length === 0) && <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>Nothing here.</div>}
          {sections.map(([heading, type, rows]) => rows.length > 0 && (
            <div key={heading} style={{ marginTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase", color: "#475569", marginBottom: 6 }}>{heading} · {rows.length}</div>
              <table className="styled-table-global" style={{ width: "100%" }}>
                {type === "people" ? (
                  <>
                    <thead><tr><th>Person</th><th>Department</th><th>Status</th><th>Open work</th></tr></thead>
                    <tbody>{rows.map(p => { const m = PERSON[p.status] || PERSON.off; return (
                      <tr key={p.user_id}><td style={{ fontWeight: 600 }}>{p.name}</td><td style={{ color: "#64748b", fontSize: 13 }}>{p.dept}</td>
                        <td><span style={{ fontSize: 11.5, fontWeight: 700, color: m.c, background: m.b, border: `1px solid ${m.e}`, borderRadius: 7, padding: "2px 9px", whiteSpace: "nowrap" }}>{m.t}</span></td>
                        <td>{p.open}{p.overdue ? ` (${p.overdue} overdue)` : ""}</td></tr>); })}</tbody>
                  </>
                ) : (
                  <>
                    <thead><tr><th>Person</th><th>Department</th><th>Work</th><th>Deadline</th><th>Status</th><th>Remarks</th></tr></thead>
                    <tbody>{rows.map(i => (
                      <tr key={`${i.person}-${i.key}`}><td style={{ fontWeight: 600 }}>{i.person}</td><td style={{ color: "#64748b", fontSize: 13 }}>{i.dept}</td><td>{i.title}</td>
                        <td><DeadlineChip item={i} /></td><td style={{ fontWeight: 700, color: SC[i.status] || "#334155", fontSize: 12.5 }}>{i.status}</td>
                        <td style={{ fontSize: 12.5, color: "#475569" }}>{i.remarks || "—"}</td></tr>))}</tbody>
                  </>
                )}
              </table>
            </div>
          ))}
        </div>
      </div>
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
  const [hist, setHist] = useState(false);
  const m = PERSON[p.status] || PERSON.off;
  return (
    <div style={{ borderBottom: "1px solid #f6f8fa" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px 10px 40px", cursor: "pointer", flexWrap: "wrap" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--brand-light)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>{p.name?.[0]?.toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 150 }}>
          <div style={{ fontWeight: 700, fontSize: 13.5, color: "#0f172a" }}>{p.name}{p.role === "manager" && <span style={{ marginLeft: 6, fontSize: 10.5, color: "#64748b" }}>Manager</span>}</div>
          <div style={{ fontSize: 12, color: "#64748b" }}>{p.open} open{p.overdue ? ` · ${p.overdue} overdue` : ""}{p.check_in_time ? ` · in at ${fmtTime(p.check_in_time)}` : ""}</div>
        </div>
        <button className="btn ghost" onClick={e => { e.stopPropagation(); setHist(true); }} title="Work history"
          style={{ fontSize: 12, padding: "4px 10px", display: "flex", alignItems: "center", gap: 5 }}><TbHistory /> History</button>
        <span style={{ fontSize: 11.5, fontWeight: 700, color: m.c, background: m.b, border: `1px solid ${m.e}`, borderRadius: 7, padding: "3px 10px", whiteSpace: "nowrap" }}>{m.t}</span>
        {open ? <TbChevronDown color="#94a3b8" /> : <TbChevronRight color="#94a3b8" />}
      </div>
      {hist && <HistoryModal headers={headers} userId={p.user_id} name={p.name} onClose={() => setHist(false)} />}
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

// A person's work, day by day: what was on their plan and every status/remark they posted on assigned work.
function HistoryModal({ headers, userId, name, onClose }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    let live = true;
    setData(null); setErr("");
    fetch(`${BASE}/work/history?days=${days}${userId ? `&user_id=${userId}` : ""}`, { headers })
      .then(async r => { const d = await r.json().catch(() => ({})); if (!live) return; if (r.ok) setData(d); else setErr(d.message || "Could not load the history."); })
      .catch(() => live && setErr("Network error."));
    return () => { live = false; };
  }, [days, userId, headers]);
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const dayLabel = (d) => new Date(`${d}T00:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.5)", zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" style={{ background: "#fff", borderRadius: 16, width: "min(860px, 100%)", maxHeight: "90vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 60px rgba(15,23,42,.28)" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #eef2f6", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 800, fontSize: 17 }}>{userId ? `${name} — work history` : "My work history"}</div>
            {data && <div style={{ fontSize: 12.5, color: "#64748b" }}>{data.person.department}{data.person.department ? " · " : ""}{data.totals.days_with_work} day(s) with work · {data.totals.entries} entries · {data.totals.completed} completed</div>}
          </div>
          <select className="modern-input" value={days} onChange={e => setDays(Number(e.target.value))} style={{ margin: 0, width: 150 }}>
            <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
          </select>
          <button onClick={onClose} aria-label="Close" style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 32, height: 32, cursor: "pointer" }}><TbX /></button>
        </div>
        <div style={{ overflow: "auto", padding: "4px 20px 20px" }}>
          {err ? <div style={{ padding: 30, textAlign: "center", color: "#b91c1c" }}>{err}</div>
          : !data ? <div className="loader" style={{ margin: "40px auto" }} />
          : data.history.length === 0 ? <div style={{ padding: 40, textAlign: "center", color: "#94a3b8" }}>No work recorded in this period.</div>
          : data.history.map(day => (
            <div key={day.date} style={{ marginTop: 16 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, borderBottom: "1px solid #eef2f6", paddingBottom: 5, marginBottom: 4 }}>
                <span style={{ fontWeight: 800, fontSize: 13.5, color: "#0f172a" }}>{dayLabel(day.date)}</span>
                <span style={{ fontSize: 12, color: "#64748b" }}>{day.completed} of {day.entries.length} completed</span>
              </div>
              {day.entries.map((e, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "7px 0", borderBottom: "1px solid #f8fafc", flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ fontSize: 13.5, color: "#1e293b", fontWeight: 600 }}>{e.title}
                      <span style={{ marginLeft: 8, fontSize: 10.5, fontWeight: 700, color: e.kind === "assigned" ? "#6d28d9" : "#475569", background: e.kind === "assigned" ? "#f5f3ff" : "#f1f5f9", borderRadius: 5, padding: "1px 7px" }}>{e.kind === "assigned" ? "Assigned" : "Daily plan"}</span>
                      {e.client && <span style={{ marginLeft: 8, fontSize: 11, color: "#0f766e", fontWeight: 600 }}>🏢 {e.client}</span>}
                    </div>
                    {e.remarks && <div style={{ fontSize: 12.5, color: "#475569", marginTop: 2 }}><b>Remarks:</b> {e.remarks}</div>}
                  </div>
                  <span style={{ fontSize: 12, color: "#64748b", whiteSpace: "nowrap" }}>{e.deadline ? `due ${niceDate(e.deadline)}` : ""}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: SC[e.status] || "#334155", border: `1px solid ${(SC[e.status] || "#334155")}33`, borderRadius: 7, padding: "2px 9px", whiteSpace: "nowrap" }}>{e.status}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
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
  const [f, setF] = useState({ title: "", deadline: "", description: "", client: "" });
  const [clients, setClients] = useState([]);
  const [addingClient, setAddingClient] = useState(false);
  const [clientOpen, setClientOpen] = useState(false);   // our own dropdown: <datalist> doesn't open on most phones
  const [clientMsg, setClientMsg] = useState("");
  const [people, setPeople] = useState([]);
  const [picked, setPicked] = useState([]);
  const [more, setMore] = useState([]);   // extra "what needs to be done" lines for the same client / deadline
  const [q, setQ] = useState("");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadErr, setLoadErr] = useState("");
  const loadPeople = useCallback(() => {
    setLoaded(false); setLoadErr("");
    fetch(`${BASE}/work-tasks/assignable`, { headers })
      .then(async r => { if (!r.ok) throw new Error(`error ${r.status}`); const d = await r.json(); setPeople(Array.isArray(d) ? d : []); })
      .catch(e => setLoadErr(e?.message || "network problem"))
      .finally(() => setLoaded(true));
  }, [headers]);
  useEffect(() => { loadPeople(); }, [loadPeople]);
  useEffect(() => {
    fetch(`${BASE}/clients`, { headers }).then(r => (r.ok ? r.json() : [])).then(d => setClients(Array.isArray(d) ? d.map(c => c.name).filter(Boolean) : [])).catch(() => {});
  }, [headers]);
  const clientName = f.client.trim();
  const clientMatches = clients.filter(c => !clientName || (c.toLowerCase().includes(clientName.toLowerCase()) && c.toLowerCase() !== clientName.toLowerCase()));
  const newClient = clientName && !clients.some(c => c.toLowerCase() === clientName.toLowerCase());
  async function addClient() {
    setClientMsg(""); setAddingClient(true);
    try {
      const r = await fetch(`${BASE}/admin/clients`, { method: "POST", headers, body: JSON.stringify({ name: clientName, auto_department: true }) });
      const d = await r.json().catch(() => ({}));
      if (r.status === 409) { setClients(c => [...c, clientName]); setClientMsg("That client already exists — selected."); return; }
      if (r.status === 403) return setClientMsg("You can't add clients (your account has no department). Ask an admin to add it.");
      if (!r.ok) return setClientMsg(d.message || `Could not add the client (error ${r.status}).`);
      setClients(c => [...c, d.name || clientName]);
      setClientMsg(`“${d.name || clientName}” added as a new client ✓`);
    } catch { setClientMsg("Could not reach the server. Check your connection and try again."); } finally { setAddingClient(false); }
  }
  const needle = q.trim().toLowerCase();
  // type any letters of a name or department: matches anywhere, names starting with them come first
  const list = !needle ? [] : people.filter(p => !p.me && ( `${p.name} ${p.department}`.toLowerCase().includes(needle)))
    .sort((a, b) => Number(b.name.toLowerCase().startsWith(needle)) - Number(a.name.toLowerCase().startsWith(needle)) || a.name.localeCompare(b.name));
  const chosen = people.filter(p => picked.includes(p._id));

  async function create() {
    setErr("");
    if (!f.title.trim()) return setErr("Write what needs to be done.");
    if (!f.deadline) return setErr("A deadline is required.");
    if (f.deadline < todayISO()) return setErr("The deadline can't be in the past.");
    if (newClient) return setErr(`“${clientName}” isn't a client yet — click “Add as new client”, or clear the client field.`);
    const titles = [f.title.trim(), ...more.map(t => t.trim()).filter(Boolean)];
    setSaving(true);
    let done = 0;
    try {
      for (const title of titles) {
        const r = await fetch(`${BASE}/work-tasks`, { method: "POST", headers, body: JSON.stringify({ ...f, title, assignee_ids: picked }) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) {
          setMore(m => m.filter(t => !t.trim() || titles.indexOf(t.trim()) > done));   // keep only the ones not yet saved
          if (done) setF(x => ({ ...x, title: titles[done] }));
          return setErr(`${done ? `${done} added, but “${titles[done]}” failed: ` : ""}${d.message || "Could not add the work."}`);
        }
        done += 1;
      }
      const who = picked.length ? ` and assigned to ${picked.length} ${picked.length === 1 ? "person" : "people"}` : "";
      onCreated(`${done === 1 ? "Work" : `${done} works`} added${who}.`);
    } catch { setErr(`${done ? `${done} added, then a ` : ""}Network error.`); } finally { setSaving(false); }
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
          {more.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: 13, width: 18, textAlign: "right" }}>{i + 2}.</span>
              <input className="modern-input" style={{ margin: 0, flex: 1 }} placeholder="Another work for the same client" maxLength={200} value={t} onChange={e => setMore(m => m.map((x, j) => (j === i ? e.target.value : x)))} />
              <button type="button" onClick={() => setMore(m => m.filter((_, j) => j !== i))} aria-label="Remove this work" style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 32, height: 32, cursor: "pointer", flexShrink: 0 }}><TbX /></button>
            </div>
          ))}
          <button type="button" onClick={() => setMore(m => [...m, ""])} style={{ alignSelf: "flex-start", background: "none", border: "none", color: "var(--brand)", cursor: "pointer", fontWeight: 700, fontSize: 13, padding: 0, marginTop: -4 }}>+ Add another work</button>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>Deadline (required)
            <input type="date" className="modern-input" style={{ margin: "4px 0 0" }} min={todayISO()} value={f.deadline} onChange={e => setF({ ...f, deadline: e.target.value })} />
          </label>
          <label style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>Client (optional)
            <input className="modern-input" style={{ margin: "4px 0 0" }} maxLength={200} autoComplete="off" placeholder="Pick a client or type a new one" value={f.client}
              onFocus={() => setClientOpen(true)} onBlur={() => setTimeout(() => setClientOpen(false), 150)}
              onChange={e => { setF({ ...f, client: e.target.value }); setClientOpen(true); }} />
          </label>
          {clientOpen && clientMatches.length > 0 && (
            <div role="listbox" style={{ marginTop: -8, maxHeight: 180, overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", WebkitOverflowScrolling: "touch" }}>
              {clientMatches.map(c => (
                <div key={c} role="option" onMouseDown={e => e.preventDefault()} onClick={() => { setF(x => ({ ...x, client: c })); setClientOpen(false); }}
                  style={{ padding: "11px 14px", fontSize: 14, fontWeight: 600, color: "#0f172a", borderBottom: "1px solid #f1f5f9", cursor: "pointer" }}>{c}</div>
              ))}
            </div>
          )}
          {!newClient && clientMsg && <div style={{ marginTop: -6, fontSize: 12.5, color: "#166534", fontWeight: 600 }}>{clientMsg}</div>}
          {newClient && (
            <div style={{ marginTop: -6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "7px 10px", fontSize: 12.5, color: "#92400e" }}>
              <span>“{clientName}” isn't in your client list.</span>
              <button type="button" className="btn" style={{ fontSize: 12, padding: "5px 12px" }} onClick={addClient} disabled={addingClient}>{addingClient ? "Adding…" : "Add as new client"}</button>
              {clientMsg && <span style={{ color: "#b91c1c", fontWeight: 600 }}>{clientMsg}</span>}
            </div>
          )}
          <textarea className="modern-input" rows={2} style={{ margin: 0 }} placeholder="Details (optional)" maxLength={2000} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
          <div>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "#475569" }}>Assign work to other employee <span style={{ fontWeight: 500, color: "#94a3b8" }}>(optional)</span></div>
            {chosen.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                {chosen.map(p => (
                  <span key={p._id} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--brand-light)", color: "var(--brand)", borderRadius: 99, padding: "3px 6px 3px 11px", fontSize: 12.5, fontWeight: 600 }}>
                    {p.name}<button type="button" onClick={() => setPicked(x => x.filter(i => i !== p._id))} aria-label={`Remove ${p.name}`} style={{ border: "none", background: "transparent", cursor: "pointer", color: "inherit", display: "flex" }}><TbX size={13} /></button>
                  </span>
                ))}
              </div>
            )}
            {(
              <div style={{ marginTop: 6 }}>
                <input className="modern-input" style={{ margin: "0 0 6px" }} placeholder="Type a name or department…" value={q} onChange={e => setQ(e.target.value)} />
                {needle && <div style={{ maxHeight: 220, overflow: "auto", border: "1px solid #e2e8f0", borderRadius: 10 }}>
                  {list.map(p => (
                    <label key={p._id} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #f1f5f9", cursor: "pointer", fontSize: 13 }}>
                      <input type="checkbox" checked={picked.includes(p._id)} onChange={() => setPicked(x => (x.includes(p._id) ? x.filter(i => i !== p._id) : [...x, p._id]))} />
                      <span style={{ fontWeight: 600 }}>{p.name}</span><span style={{ color: "#94a3b8", fontSize: 12 }}>{p.department}</span>
                    </label>
                  ))}
                  {list.length === 0 && <div style={{ padding: 12, color: "#94a3b8", fontSize: 13 }}>{!loaded ? "Loading people…" : loadErr ? <>Couldn't load the people list ({loadErr}). <button type="button" onClick={loadPeople} style={{ background: "none", border: "none", color: "var(--brand)", fontWeight: 700, cursor: "pointer" }}>Try again</button></> : people.length <= 1 ? "No other colleagues found." : "No one matches that."}</div>}
                </div>}
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
