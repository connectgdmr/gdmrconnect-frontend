import React, { useState, useEffect } from "react";
import { FaFolder, FaPlus, FaTrash, FaBuilding, FaSearch } from "react-icons/fa";
import { SkeletonCards } from "./Skeleton";

import { API_URL as BASE } from "../api";

// Soft green-family folder tints
const TINTS = [
  { bg: "#f0fdf4", color: "#226e48" }, { bg: "#effdf8", color: "#0f766e" },
  { bg: "#ecfdf5", color: "#047857" }, { bg: "#e7f6f1", color: "#1c5249" },
  { bg: "#eef7f0", color: "#2b885a" }, { bg: "#e9f5ee", color: "#15803d" },
];

export default function AdminClients({ token }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName]   = useState("");
  const [desc, setDesc]   = useState("");
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState({ text: "", type: "" });

  const flash = (text, type = "success") => { setMsg({ text, type }); setTimeout(() => setMsg({ text: "", type: "" }), 3000); };
  const toArr = (d) => Array.isArray(d) ? d : (d?.clients || d?.data || []);

  function load() {
    setLoading(true);
    fetch(`${BASE}/clients`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : []).then(d => setClients(toArr(d))).catch(() => setClients([])).finally(() => setLoading(false));
  }
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    if (!name.trim()) return flash("Client name is required.", "error");
    setSaving(true);
    try {
      const r = await fetch(`${BASE}/admin/clients`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() }),
      });
      if (r.ok) { setName(""); setDesc(""); flash("Client created."); load(); }
      else { const d = await r.json().catch(() => ({})); flash(d.message || "Failed to create client.", "error"); }
    } catch { flash("Network error.", "error"); } finally { setSaving(false); }
  }

  async function remove(id, cname) {
    if (!window.confirm(`Delete client "${cname}"? Work items already tagged to it stay unchanged.`)) return;
    await fetch(`${BASE}/admin/clients/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    load();
  }

  const filtered = clients.filter(c => !search || (c.name || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ marginTop: 16 }}>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, color: "var(--brand)" }}>Clients</h3>
        <p className="small">Create client folders so the team can tag what they're working on, per client.</p>
      </div>

      {msg.text && (
        <div style={{ marginBottom: 12, padding: "10px 16px", borderRadius: 8, fontSize: 13, fontWeight: 500,
          background: msg.type === "error" ? "#fef2f2" : "#f0fdf4", color: msg.type === "error" ? "#b91c1c" : "#16a34a",
          border: `1px solid ${msg.type === "error" ? "#fecaca" : "#bbf7d0"}` }}>{msg.text}</div>
      )}

      {/* Create */}
      <div className="card" style={{ marginBottom: 16 }}>
        <h4 className="widget-title">Add a Client</h4>
        <form onSubmit={create} style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 2, minWidth: 200 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "#334155", display: "block", marginBottom: 5 }}>Client Name *</label>
            <input className="modern-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Acme Corp" style={{ margin: 0 }} />
          </div>
          <div style={{ flex: 3, minWidth: 220 }}>
            <label style={{ fontSize: 12.5, fontWeight: 600, color: "#334155", display: "block", marginBottom: 5 }}>Description <span style={{ color: "#94a3b8", fontWeight: 400 }}>(optional)</span></label>
            <input className="modern-input" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Short note about this client" style={{ margin: 0 }} />
          </div>
          <button className="btn" type="submit" disabled={saving} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <FaPlus size={11} /> {saving ? "Adding…" : "Add Client"}
          </button>
        </form>
      </div>

      {/* Search */}
      <div style={{ position: "relative", marginBottom: 14, maxWidth: 340 }}>
        <FaSearch style={{ position: "absolute", left: 12, top: 12, color: "#94a3b8" }} />
        <input className="modern-input" placeholder="Search clients…" value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 36, margin: 0 }} />
      </div>

      {loading ? <SkeletonCards count={6} minWidth={220} />
      : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "50px 20px", color: "#94a3b8" }}>
          <FaFolder size={36} style={{ opacity: 0.2, marginBottom: 10 }} />
          <p style={{ margin: 0 }}>No clients yet. Add your first one above.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
          {filtered.map((c, i) => {
            const t = TINTS[i % TINTS.length];
            return (
              <div key={c._id} className="card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, background: t.bg, color: t.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                    <FaFolder />
                  </div>
                  <button className="btn-action btn-remove" onClick={() => remove(c._id, c.name)} title="Delete client"><FaTrash /></button>
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 15 }}>{c.name}</div>
                  {c.description && <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 3, lineHeight: 1.4 }}>{c.description}</div>}
                </div>
                {c.task_count != null && <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: "auto" }}><FaBuilding size={10} /> {c.task_count} work items</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
