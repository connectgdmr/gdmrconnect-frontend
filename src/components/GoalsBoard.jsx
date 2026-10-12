import React, { useState, useEffect, useCallback } from "react";
import { TbPlus, TbCheck, TbTrash, TbEdit, TbX, TbPinned, TbArrowBackUp, TbCalendarEvent } from "react-icons/tb";
import { GOAL_COLORS, goalsApi, defaultDeadline, dueInfo, parseDay } from "./goalsShared";

const blank = (type = "daily") => ({ title: "", notes: "", type, color: "yellow", deadline: defaultDeadline(type) });
const TILT = [-1.2, 0.8, -0.6, 1.1, -0.9, 0.5];

export default function GoalsBoard({ token }) {
  const [open, setOpen] = useState([]);
  const [done, setDone] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState(null);       // null = closed, else the note being created/edited
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [showDone, setShowDone] = useState(false);

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 3500); };

  const load = useCallback(async () => {
    try {
      const d = await goalsApi(token);
      setOpen(d.open || []); setDone(d.done || []);
    } catch (e) { flash(e.message); } finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  function startNew() { setEditId(null); setForm(blank(filter === "weekly" ? "weekly" : "daily")); }
  function startEdit(g) {
    setEditId(g._id);
    setForm({ title: g.title, notes: g.notes, type: g.type, color: g.color, deadline: g.deadline });
  }

  async function save(e) {
    e.preventDefault();
    if (!form.title.trim()) return flash("Please add a title.");
    setSaving(true);
    try {
      await (editId ? goalsApi(token, `/${editId}`, "PUT", form) : goalsApi(token, "", "POST", form));
      setForm(null); setEditId(null); await load();
    } catch (err) { flash(err.message); } finally { setSaving(false); }
  }

  async function setDoneFlag(g, value) {
    try { await goalsApi(token, `/${g._id}`, "PUT", { done: value }); await load(); }
    catch (e) { flash(e.message); }
  }
  async function remove(g) {
    if (!window.confirm(`Delete "${g.title}"?`)) return;
    try { await goalsApi(token, `/${g._id}`, "DELETE"); await load(); } catch (e) { flash(e.message); }
  }

  const shown = open.filter(g => filter === "all" || g.type === filter);
  const label = { fontSize: 12, fontWeight: 700, color: "#475569", display: "block", marginBottom: 5 };

  return (
    <div>
      <div className="card" style={{ marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, color: "var(--brand)", display: "flex", alignItems: "center", gap: 8 }}><TbPinned /> My Goals</h3>
          <p className="small" style={{ margin: "4px 0 0" }}>Sticky notes for your daily and weekly goals. We'll remind you at login 3 days before a deadline.</p>
        </div>
        <button className="btn" onClick={startNew} style={{ display: "flex", alignItems: "center", gap: 6 }}><TbPlus size={13} /> New note</button>
      </div>

      {msg && <div style={{ marginBottom: 12, padding: "10px 14px", borderRadius: 8, background: "#fef2f2", color: "#b91c1c", fontSize: 13 }}>{msg}</div>}

      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {[["all", "All"], ["daily", "Daily"], ["weekly", "Weekly"]].map(([k, l]) => {
          const n = open.filter(g => k === "all" || g.type === k).length;
          const on = filter === k;
          return (
            <button key={k} onClick={() => setFilter(k)} style={{
              fontSize: 12.5, fontWeight: 600, padding: "5px 14px", borderRadius: 16, cursor: "pointer",
              border: `1px solid ${on ? "var(--brand)" : "#e2e8f0"}`, background: on ? "var(--brand-light)" : "#fff", color: on ? "var(--brand)" : "#64748b",
            }}>{l} · {n}</button>
          );
        })}
      </div>

      {/* ── Notes ── */}
      {loading ? (
        <div style={{ color: "#94a3b8", fontSize: 13, padding: 20 }}>Loading your notes…</div>
      ) : shown.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "44px 20px", color: "#94a3b8" }}>
          <div style={{ fontSize: 34, marginBottom: 6 }}>📝</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#64748b" }}>No {filter === "all" ? "" : filter + " "}goals yet</div>
          <div style={{ fontSize: 12.5, marginTop: 4 }}>Click “New note” to stick your first goal here.</div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))", gap: 18, padding: "6px 4px 14px" }}>
          {shown.map((g, i) => {
            const c = GOAL_COLORS[g.color] || GOAL_COLORS.yellow;
            const due = dueInfo(g.days_left);
            return (
              <div key={g._id} style={{
                background: c.bg, color: c.ink, borderRadius: 4, padding: "16px 16px 12px", minHeight: 170, display: "flex", flexDirection: "column",
                boxShadow: "0 6px 14px rgba(15,23,42,.14), inset 0 -22px 30px -22px rgba(0,0,0,.10)", borderTop: `10px solid ${c.edge}`,
                transform: `rotate(${TILT[i % TILT.length]}deg)`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 6 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase", background: "rgba(255,255,255,.55)", borderRadius: 10, padding: "2px 8px" }}>{g.type}</span>
                  <span style={{ fontSize: 10.5, fontWeight: 700, color: due.color, background: due.urgent ? due.bg : "rgba(255,255,255,.55)", borderRadius: 10, padding: "2px 8px" }}>{due.text}</span>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.35, wordBreak: "break-word" }}>{g.title}</div>
                {g.notes && <div style={{ fontSize: 12.5, marginTop: 6, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-word", opacity: 0.9 }}>{g.notes}</div>}
                <div style={{ marginTop: "auto", paddingTop: 12 }}>
                  <div style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4, opacity: 0.75, marginBottom: 8 }}>
                    <TbCalendarEvent size={12} /> {parseDay(g.deadline).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => setDoneFlag(g, true)} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, border: "none", borderRadius: 6, padding: "6px 8px", background: "#16a34a", color: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>
                      <TbCheck size={14} /> Done
                    </button>
                    <button onClick={() => startEdit(g)} title="Edit" style={{ border: "none", borderRadius: 6, width: 32, background: "rgba(255,255,255,.6)", color: c.ink, cursor: "pointer" }}><TbEdit size={14} /></button>
                    <button onClick={() => remove(g)} title="Delete" style={{ border: "none", borderRadius: 6, width: 32, background: "rgba(255,255,255,.6)", color: "#b91c1c", cursor: "pointer" }}><TbTrash size={14} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Completed ── */}
      {done.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <button onClick={() => setShowDone(v => !v)} style={{ border: "none", background: "none", color: "#64748b", fontWeight: 700, fontSize: 13, cursor: "pointer", padding: 0 }}>
            {showDone ? "▾" : "▸"} Completed this week · {done.length}
          </button>
          {showDone && (
            <div className="card" style={{ marginTop: 8, padding: "6px 16px" }}>
              {done.map((g, i) => (
                <div key={g._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: i ? "1px solid #f1f5f9" : "none" }}>
                  <span style={{ color: "#16a34a", display: "flex" }}><TbCheck size={16} /></span>
                  <span style={{ flex: 1, fontSize: 13, color: "#64748b", textDecoration: "line-through" }}>{g.title}</span>
                  <button onClick={() => setDoneFlag(g, false)} title="Move back to open" style={{ border: "none", background: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}><TbArrowBackUp size={14} /> Undo</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── New / edit note ── */}
      {form && (
        <div onClick={() => setForm(null)} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={save} style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 460, padding: 20, boxShadow: "0 20px 50px rgba(15,23,42,.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>{editId ? "Edit note" : "New sticky note"}</div>
              <button type="button" onClick={() => setForm(null)} aria-label="Close" style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: "#475569" }}><TbX /></button>
            </div>

            <label style={label}>What's the goal? *</label>
            <input className="modern-input" autoFocus maxLength={120} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Finish onboarding deck" />

            <label style={{ ...label, marginTop: 12 }}>Notes</label>
            <textarea className="modern-input" rows={3} maxLength={1000} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Anything to remember…" style={{ resize: "vertical" }} />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
              <div>
                <label style={label}>Type</label>
                <select className="modern-input" value={form.type} onChange={e => { const type = e.target.value; setForm(f => ({ ...f, type, deadline: editId ? f.deadline : defaultDeadline(type) })); }} style={{ margin: 0 }}>
                  <option value="daily">Daily goal</option>
                  <option value="weekly">Weekly goal</option>
                </select>
              </div>
              <div>
                <label style={label}>Deadline *</label>
                <input className="modern-input" type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} style={{ margin: 0 }} />
              </div>
            </div>

            <label style={{ ...label, marginTop: 14 }}>Colour</label>
            <div style={{ display: "flex", gap: 8 }}>
              {Object.entries(GOAL_COLORS).map(([k, c]) => (
                <button type="button" key={k} onClick={() => setForm(f => ({ ...f, color: k }))} aria-label={k} style={{
                  width: 30, height: 30, borderRadius: 6, background: c.bg, cursor: "pointer",
                  border: form.color === k ? "2.5px solid #0f172a" : `1px solid ${c.edge}`,
                }} />
              ))}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
              <button type="button" className="btn ghost" onClick={() => setForm(null)}>Cancel</button>
              <button type="submit" className="btn" disabled={saving}>{saving ? "Saving…" : editId ? "Save changes" : "Stick it up"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
