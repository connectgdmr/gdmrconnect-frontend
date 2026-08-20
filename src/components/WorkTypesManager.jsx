import React, { useState, useEffect } from "react";
import { TbPlus, TbX, TbTags } from "react-icons/tb";
import { API_URL as BASE } from "../api";

const DEFAULT_TYPES = ["Development", "Service", "Support"];

/**
 * Chip-list editor for a department's work types (e.g. Digital Marketing →
 * Development / Service / Support). Used by both Admin (any department) and
 * Manager (their own department) to configure what shows up in the "Type"
 * dropdown on the employee work-status widget.
 *
 * Backend contract (not yet implemented — see backend prompt):
 *   GET /api/departments/:name/work-types  -> { types: string[] }
 *   PUT /api/admin/departments/:name/work-types  body: { types: string[] } (admin, or manager of that dept)
 * Until that exists, GET 404s are treated as "no custom types configured yet"
 * (falls back to DEFAULT_TYPES) and PUT failures show an inline notice rather
 * than silently failing.
 */
export default function WorkTypesManager({ token, department, canEdit = true }) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("");
  const [backendReady, setBackendReady] = useState(true);

  useEffect(() => {
    if (!department) { setLoading(false); return; }
    setLoading(true);
    fetch(`${BASE}/departments/${encodeURIComponent(department)}/work-types`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => { if (r.status === 404) { setBackendReady(false); return null; } return r.ok ? r.json() : null; })
      .then(d => setTypes(Array.isArray(d?.types) && d.types.length ? d.types : DEFAULT_TYPES))
      .catch(() => setTypes(DEFAULT_TYPES))
      .finally(() => setLoading(false));
  }, [department, token]);

  function addType() {
    const v = input.trim();
    if (!v || types.some(t => t.toLowerCase() === v.toLowerCase())) { setInput(""); return; }
    setTypes(t => [...t, v]);
    setInput("");
  }
  function removeType(v) { setTypes(t => t.filter(x => x !== v)); }

  async function save() {
    setSaving(true); setMsg("");
    try {
      const r = await fetch(`${BASE}/admin/departments/${encodeURIComponent(department)}/work-types`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ types }),
      });
      if (r.ok) { setMsg("Saved."); setBackendReady(true); }
      else if (r.status === 404) { setBackendReady(false); setMsg("This isn't wired up on the backend yet."); }
      else { const d = await r.json().catch(() => ({})); setMsg(d.message || "Could not save."); }
    } catch { setMsg("Network error."); }
    finally { setSaving(false); setTimeout(() => setMsg(""), 3500); }
  }

  if (!department) return <div className="small" style={{ color: "#94a3b8" }}>No department to configure.</div>;
  if (loading) return <div className="small" style={{ color: "#94a3b8" }}>Loading work types…</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <TbTags size={13} style={{ color: "var(--brand)" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a" }}>Work Types — {department}</span>
      </div>
      <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 12px" }}>
        These appear in the "Type" dropdown when employees in this department log what they're working on.
      </p>

      {!backendReady && (
        <div style={{ fontSize: 12, color: "#92400e", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, padding: "8px 12px", marginBottom: 12 }}>
          Showing default types — this department has no saved list yet, and saving isn't available until the backend endpoint is added.
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
        {types.map(t => (
          <span key={t} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--brand-light)", color: "var(--brand)", borderRadius: 99, padding: "5px 10px 5px 12px", fontSize: 12.5, fontWeight: 600 }}>
            {t}
            {canEdit && (
              <button onClick={() => removeType(t)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--brand)", display: "flex", padding: 0 }}>
                <TbX size={10} />
              </button>
            )}
          </span>
        ))}
        {types.length === 0 && <span style={{ fontSize: 12.5, color: "#94a3b8" }}>No work types yet.</span>}
      </div>

      {canEdit && (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              className="modern-input" style={{ margin: 0, flex: 1 }} placeholder="Add a work type…"
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addType(); } }}
            />
            <button type="button" className="btn ghost" onClick={addType} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, padding: "0 14px" }}>
              <TbPlus size={10} /> Add
            </button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button className="btn" disabled={saving} onClick={save} style={{ fontSize: 13 }}>{saving ? "Saving…" : "Save Work Types"}</button>
            {msg && <span style={{ fontSize: 12, color: msg === "Saved." ? "#16a34a" : "#b91c1c" }}>{msg}</span>}
          </div>
        </>
      )}
    </div>
  );
}
